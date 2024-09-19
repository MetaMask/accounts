#!yarn ts-node

import PackageJson from '@npmcli/package-json';
import execa from 'execa';
import fs from 'node:fs/promises';

// Previews object displayed by the CI when you ask for preview builds.
type Arguments = {
  // Path to the project that will use the preview builds.
  path: string;
  // Previews object.
  previews: Previews;
};

// Previews object displayed by the CI when you ask for preview builds.
type Previews = Record<string, string>;

// A `yarn why <pkg> --json` line entry.
type YarnWhyEntry = {
  children: Record<
    string,
    {
      descriptor: string;
    }
  >;
};

class UsageError extends Error {
  constructor(message: string) {
    // 1 because `ts-node` is being used as a launcher, so argv[0] is ts-node "bin.js"
    const bin: string = process.argv[1];

    super(
      `usage: ${bin} <project-path> <previews-json>\n${
        message ? `\nerror: ${message}\n` : ''
      }`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

/**
 * Checks if a path is a directory or not.
 *
 * @param path - Path to check.
 * @returns True if path is a directory, false otherwise.
 */
async function isDir(path: string) {
  return (await fs.stat(path)).isDirectory();
}

/**
 * Checks if a path is a file or not.
 *
 * @param path - Path to check.
 * @returns True if path is a file, false otherwise.
 */
async function isFile(path: string) {
  // We check for a directory here, since the path could be a symlink or a "sort-of" file (when using the <(...) notation)
  return !(await isDir(path));
}

/**
 * Verify and read previews JSON file.
 *
 * @param path - Previews JSON file path.
 * @returns Previews object.
 * @throws If the previews JSON file cannot be read.
 */
async function verifyAndReadPreviewsJson(path: string) {
  if (!(await isFile(path))) {
    throw new UsageError(`${path}: is not a file`);
  }
  const fileContent = await fs.readFile(path);

  // Not 100% type safe, but we assume the caller knows how to use the script
  return JSON.parse(fileContent.toString()) as Previews;
}

/**
 * Verify project path.
 *
 * @param path - Project path.
 * @throws If the project path is not compatible.
 */
async function verifyProjectPath(path: string) {
  if (!(await isDir(path))) {
    throw new UsageError(`${path}: is not a directory`);
  }

  const pkgJsonPath = `${path}/package.json`;
  if (!(await isFile(pkgJsonPath))) {
    throw new UsageError(`${pkgJsonPath}: no such file`);
  }
}

/**
 * Parse and verifies that each arguments is well-formatted.
 *
 * @returns Parsed arguments as an `Arguments` object.
 */
async function parseAndVerifyArguments(): Promise<Arguments> {
  if (process.argv.length !== 4) {
    throw new UsageError('not enough arguments');
  }
  // 1: ts-node (bin.js), 2: This script, 3: Project path, 4: Previews JSON path
  const [, , path, previewsJsonPath] = process.argv as [
    string,
    string,
    string,
    string,
  ];

  await verifyProjectPath(path);
  const previews = await verifyAndReadPreviewsJson(previewsJsonPath);

  return { path, previews };
}

/**
 * Compute the list of in-use versions for a given package.
 *
 * @param path - Project path.
 * @param pkg - Package name.
 * @returns The list of in-use versions for the given package.
 */
async function getPkgVersions(path: string, pkgName: string): Promise<string[]> {
  const { stdout } = await execa('yarn', ['--cwd', path, 'why', pkgName, '--json']);

  // Stops early, to avoid having JSON parsing error on empty lines
  if (stdout.trim() === '') {
    return [];
  }

  // Each `yarn why --json` lines is a JSON object, so parse it and "type" it
  const entries = stdout
    .split('\n')
    .map((line) => JSON.parse(line) as YarnWhyEntry);

  const versions: Set<string> = new Set();
  for (const entry of entries) {
    const { children } = entry;

    for (const [key, value] of Object.entries(children)) {
      const { descriptor } = value;

      // We only keep the current package information and skip those "virtual" resolutions (which
      // seems internal to yarn)
      if (key.startsWith(pkgName) && !descriptor.includes('@virtual:')) {
        versions.add(descriptor);
      }
    }
  }

  return Array.from(versions);
}

/**
 * Gets the original package name from its preview package name.
 *
 * @param pkgPreviewName - Preview package name.
 * @returns The original package name.
 */
function getPkgOriginalName(pkgPreviewName: string): string {
  return pkgPreviewName.replace('@metamask-previews/', '@metamask/');
}

/**
 * Gets the original package name from its preview package name.
 *
 * @param pkgPreviewName - Preview package name.
 * @returns The original package name.
 */
function getPkgOriginalVersion(pkgPreviewVersion: string): string {
  const match = /^(\d+\.\d+\.\d+)-.*$/.exec(pkgPreviewVersion);

  if (!match) {
    throw new Error(
      `unable to extract original version from: "${pkgPreviewVersion}"`
    );
  }
  return match[1]; // Get first group
}

/**
 * Gets the preview package name from its original package name.
 *
 * @param pkgName - Package name.
 * @param previews - Records of all preview packages that will be used to "infere" the preview package name.
 * @returns The preview package name.
 */
function getPkgPreviewName(pkgName: string, previews: Previews): string {
  const pkgPreviewName = pkgName.replace('@metamask/', '@metamask-previews/');

  if (!(pkgPreviewName in previews)) {
    throw new Error(
      `unable to find package "${pkgPreviewName}" ("${pkgName}") in previews`,
    );
  }
  // At this point, we know it's defined so we can safely force the type
  const pkgPreviewVersion: string = previews[pkgPreviewName];

  return `npm:${pkgPreviewName}@${pkgPreviewVersion}`;
}

/**
 * Update the "resolutions" entry from a "package.json" file.
 *
 * @param path - Project path that will be used to find the "package.json" file.
 * @param previews - Records of all preview packages.
 */
async function updateResolutions(path: string, previews: Previews) {
  const pkgJson = await PackageJson.load(path);

  const resolutions = {};
  for (const [pkgPreviewName, pkgPreviewVersion] of Object.entries(previews)) {
    const pkgName = getPkgOriginalName(pkgPreviewName);
    const pkgVersion = getPkgOriginalVersion(pkgPreviewVersion);

    console.log(`:: updating resolutions for "${pkgPreviewName}"`);

    const pkgVersions = await getPkgVersions(path, pkgName);
    for (const pkgVersion of pkgVersions) {
      resolutions[pkgVersion] = getPkgPreviewName(pkgPreviewName, previews);
    }

    // Also adds the package version itself (useful for non-published packages)
    resolutions[`${pkgName}@npm:${pkgVersion}`] = getPkgPreviewName(pkgPreviewName, previews);
  }
  console.log(':: resolutions will be updated with:');
  console.log(resolutions);

  pkgJson.update({
    resolutions: {
      ...pkgJson.content.resolutions,
      ...resolutions,
    },
  });
  await pkgJson.save();
}

/**
 * The entrypoint to this script.
 */
async function main() {
  const { previews, path } = await parseAndVerifyArguments();

  console.log(`:: will update project: ${path}`);
  console.log(':: with previews: ', previews);

  await updateResolutions(path, previews);
}
