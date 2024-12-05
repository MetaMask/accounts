// eslint-disable-next-line @typescript-eslint/naming-convention
import PackageJson from '@npmcli/package-json';
// import { spawn } from 'node:child_process/promises';
import { spawn } from 'child_process';
import execa from 'execa';

// Previews object displayed by the CI when you ask for preview builds.
type Arguments = {
  // NPM scope (@metamask-previews)
  npmScope: string;
  // Commit ID
  commitId: string;
};

type WorkspacePackage = {
  location: string;
  name: string;
};

type WorkspacePreviewPackage = WorkspacePackage & {
  previewName: string;
  previewVersion: string;
  version: string;
};

type DependenciesRecord = Record<string, string>;

class UsageError extends Error {
  constructor(message: string) {
    // 1 because `ts-node` is being used as a launcher, so argv[0] is ts-node "bin.js"
    const bin: string = process.argv[1];

    super(
      `usage: ${bin} <npm-scope> <commit-id>\n${
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
 * Parse and verifies that each arguments is well-formatted.
 *
 * @returns Parsed arguments as an `Arguments` object.
 */
async function parseAndVerifyArguments(): Promise<Arguments> {
  if (process.argv.length !== 4) {
    throw new UsageError('not enough arguments');
  }
  // 1: ts-node (bin.js), 2: This script, 3: NPM scope, 4: Commit ID
  const [, , npmScope, commitId] = process.argv as [
    string,
    string,
    string,
    string,
  ];

  return { npmScope, commitId };
}

/**
 * Gets a preview package from a workspace package.
 *
 * @param pkg - Workspace package.
 * @param npmScope - NPM scope used for the preview.
 * @param commitId - Commit ID used in the preview version.
 * @returns The preview package.
 */
async function getPkgPreview(
  pkg: WorkspacePackage,
  npmScope: string,
  commitId: string,
): Promise<WorkspacePreviewPackage> {
  const pkgJson = await PackageJson.load(pkg.location);

  // Assuming we always have a version in our package.json
  const pkgVersion: string = pkgJson.content.version;

  return {
    ...pkg,
    version: pkgVersion,
    previewName: pkg.name.replace('@metamask/', `${npmScope}/`),
    previewVersion: `${pkgVersion}-${commitId}`,
  };
}

/**
 * Gets all workspace packages.
 *
 * @returns The list of workspace packages.
 */
async function getWorkspacePackages(): Promise<WorkspacePackage[]> {
  const { stdout } = await execa('yarn', [
    'workspaces',
    'list',
    '--no-private',
    '--json',
  ]);

  // Stops early, to avoid having JSON parsing error on empty lines
  if (stdout.trim() === '') {
    return [];
  }

  // Each `yarn why --json` lines is a JSON object, so parse it and "type" it
  return stdout.split('\n').map((line) => JSON.parse(line) as WorkspacePackage);
}

/**
 * Gets all workspace packages as preview packages.
 *
 * @param npmScope - NPM scope used for the preview.
 * @param commitId - Commit ID used in the preview version.
 * @returns The list of preview packages.
 */
async function getWorkspacePreviewPackages(
  npmScope: string,
  commitId: string,
): Promise<WorkspacePreviewPackage[]> {
  const pkgs = await getWorkspacePackages();
  return await Promise.all(
    pkgs.map(async (pkg) => await getPkgPreview(pkg, npmScope, commitId)),
  );
}

/**
 * Updates all workspace packages with their preview name and version.
 *
 * @param previewPkgs - Preview package list.
 */
async function updateWorkspacePackagesWithPreviewInfo(
  previewPkgs: WorkspacePreviewPackage[],
): Promise<void> {
  for (const pkg of previewPkgs) {
    const pkgJson = await PackageJson.load(pkg.location);

    // Update package.json with preview ingo
    pkgJson.update({
      name: pkg.previewName,
      version: pkg.previewVersion,
    });

    // FIXME: Looks like peer dependencies do not play well with resolutions, so move the
    // workspace packages as normal dependencies in this case
    const peerDepKey = 'peerDependencies';
    if (peerDepKey in pkgJson.content) {
      const depKey = 'dependencies';
      const deps = pkgJson.content[depKey] as DependenciesRecord;
      const peerDeps = pkgJson.content[peerDepKey] as DependenciesRecord;

      for (const { name, version } of previewPkgs) {
        // Only consider dependenc that refers to a local workspace package
        if (name in peerDeps && peerDeps[name] === 'workspace:^') {
          // Move this dependency as a normal dependency with a "fixed" version
          deps[name] = version;
          delete peerDeps[name];
        }
      }

      // Finally override both dependencies
      pkgJson.update({
        [depKey]: deps,
        [peerDepKey]: peerDeps,
      });
    }

    // Update dependencies that refers to a workspace package. We pin the current version
    // of that package instead, and `yarn` will resolve this using the global resolutions
    // (see `updateWorkspaceResolutions`)
    for (const depKey of ['dependencies', 'devDependencies']) {
      const deps = pkgJson.content[depKey] as DependenciesRecord;

      for (const { name, version } of previewPkgs) {
        // Only consider dependenc that refers to a local workspace package
        if (name in deps && deps[name] === 'workspace:^') {
          // Override this dependency with a "fixed" version,
          // `yarn` will resolve this using the global resolutions being injected by
          // `updateWorkspaceResolutions`
          deps[name] = version;
        }
      }

      // Finally override the dependencies
      pkgJson.update({
        [depKey]: deps,
      });
    }

    await pkgJson.save();
  }
}

/**
 * Updates workspace resolutions with preview packages.
 *
 * @param previewPkgs - Preview package list.
 */
async function updateWorkspaceResolutions(
  previewPkgs: WorkspacePreviewPackage[],
): Promise<void> {
  const workspacePkgJson = await PackageJson.load('.');

  // Compute resolutions to map currently versionned packages to their preview
  // counterpart
  const resolutions = {};
  for (const pkg of previewPkgs) {
    resolutions[`${pkg.name}@${pkg.version}`] = `workspace:${pkg.location}`;
  }

  // Update workspace resolutions to use preview packages
  workspacePkgJson.update({
    resolutions: {
      ...workspacePkgJson.content.resolutions,
      // This comes after so we can override any "conflicting" resolutions (that would share
      // the same name)
      ...resolutions,
    },
  });

  await workspacePkgJson.save();
}

/**
 * Yarn install.
 */
function yarnInstall(): void {
  spawn('yarn', ['install', '--no-immutable'], { stdio: 'inherit' });
}

/**
 * The entrypoint to this script.
 */
async function main(): Promise<void> {
  const { npmScope, commitId } = await parseAndVerifyArguments();
  const previewPkgs = await getWorkspacePreviewPackages(npmScope, commitId);

  console.log(':: preparing manifests...');
  await updateWorkspacePackagesWithPreviewInfo(previewPkgs);

  console.log(':: updating global resolutions...');
  await updateWorkspaceResolutions(previewPkgs);

  console.log(':: installing dependencies...');
  yarnInstall();
}
