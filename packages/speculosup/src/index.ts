// eslint-disable-next-line import-x/no-nodejs-modules
import { createHash } from 'node:crypto';
// eslint-disable-next-line import-x/no-nodejs-modules
import type { Dir } from 'node:fs';
// eslint-disable-next-line import-x/no-nodejs-modules
import { readFile } from 'node:fs/promises';
// eslint-disable-next-line import-x/no-nodejs-modules
import {
  copyFile,
  mkdir,
  opendir,
  rm,
  symlink,
  unlink,
} from 'node:fs/promises';
// eslint-disable-next-line import-x/no-nodejs-modules
import { dirname, join, relative } from 'node:path';

import { extractFrom, extractFromLocal } from './extract';
import type { SpeculosupOptions } from './types';
import { Binary, Platform } from './types';
import {
  getBinaryArchiveUrl,
  getBinaryPath,
  getBundledArchivePath,
  getDefaultCacheDir,
  getDefaultRepo,
  getDefaultVersion,
  getVersion,
  isCodedError,
  isInstalled,
  noop,
  normalizeSystemArchitecture,
  say,
} from './utils';

let cachedPackageDir: string | undefined;

/**
 * Resolve the package root directory containing bundled/ and dist/.
 * Works in both CJS and ESM contexts.
 *
 * @returns The package root directory, or undefined if not resolvable.
 */
function resolvePackageDir(): string | undefined {
  if (cachedPackageDir) {
    return cachedPackageDir;
  }
  try {
    // eslint-disable-next-line no-restricted-globals
    const utilsPath = require.resolve('./utils');
    cachedPackageDir = dirname(dirname(utilsPath));
    return cachedPackageDir;
  } catch {
    return undefined;
  }
}

/**
 * Verify the SHA256 checksum of a bundled archive against checksums.json.
 *
 * @param archivePath - The path to the archive file.
 * @param packageDir - The package root directory.
 * @returns True if the checksum matches or no checksum is recorded.
 */
async function verifyBundledChecksum(
  archivePath: string,
  packageDir: string,
): Promise<boolean> {
  try {
    const checksumsPath = join(packageDir, 'bundled', 'checksums.json');
    const checksums = JSON.parse(
      await readFile(checksumsPath, 'utf8'),
    ) as Record<string, string>;
    const fileName = archivePath.split('/').pop() ?? '';
    const expected = checksums[fileName];
    if (!expected) {
      say('no checksum on file, skipping verification');
      return true;
    }
    const fileBuffer = await readFile(archivePath);
    const actual = createHash('sha256').update(fileBuffer).digest('hex');
    if (actual !== expected) {
      say(`checksum mismatch: expected ${expected}, got ${actual}`);
      return false;
    }
    say('bundled archive checksum verified');
    return true;
  } catch {
    return true;
  }
}

/**
 * Resolve the installation directory for a given version and architecture.
 *
 * @param options - Installation options.
 * @returns The cache path for this version+arch.
 */
export function getInstallDir(options: SpeculosupOptions = {}): string {
  const cacheDir = options.cacheDir ?? getDefaultCacheDir();
  const version = options.version ?? getDefaultVersion();
  const resolvedArch = options.arch ?? normalizeSystemArchitecture();
  const platform = options.platform ?? Platform.Linux;
  return join(
    cacheDir,
    `speculos-${version}-${String(platform)}-${resolvedArch}`,
  );
}

/**
 * Get the path to the installed speculos binary.
 *
 * @param options - Installation options.
 * @returns The absolute path to the speculos binary, or `null` if not installed.
 */
export function getSpeculosBinaryPath(
  options: SpeculosupOptions = {},
): string | null {
  const installDir = getInstallDir(options);
  if (!isInstalled(installDir)) {
    return null;
  }
  return getBinaryPath(installDir);
}

/**
 * Check if speculos is installed.
 *
 * @param options - Installation options.
 * @returns True if the managed binary exists.
 */
export function isSpeculosInstalled(options: SpeculosupOptions = {}): boolean {
  const installDir = getInstallDir(options);
  return isInstalled(installDir);
}

/**
 * Check if binaries are already in the cache. If not, download and extract them.
 *
 * @param url - The URL to download from.
 * @param cachePath - The cache directory.
 * @param checksums - Optional checksums.
 * @returns A directory handle for the cached binaries.
 */
export async function checkAndDownloadBinaries(
  url: URL,
  cachePath: string,
  checksums?: { algorithm: string; binaries: Record<Binary, string> } | null,
): Promise<Dir> {
  let downloadedBinaries: Dir;
  try {
    say('checking cache');
    downloadedBinaries = await opendir(cachePath);
    say('found binaries in cache');
  } catch (cacheError: unknown) {
    say('binaries not in cache');
    if ((cacheError as NodeJS.ErrnoException).code === 'ENOENT') {
      say(`installing from ${url.toString()}`);
      const platformChecksums = checksums ?? null;
      await extractFrom(url, [Binary.Speculos], cachePath, platformChecksums);
      downloadedBinaries = await opendir(cachePath);
    } else {
      throw cacheError;
    }
  }
  return downloadedBinaries;
}

/**
 * Check if binaries are already in the cache. If not, extract from a local archive.
 *
 * @param archivePath - The absolute path to the local tar.gz archive.
 * @param cachePath - The cache directory.
 * @returns A directory handle for the cached binaries.
 */
export async function checkAndExtractLocalBinaries(
  archivePath: string,
  cachePath: string,
): Promise<Dir> {
  let extractedBinaries: Dir;
  try {
    say('checking cache');
    extractedBinaries = await opendir(cachePath);
    say('found binaries in cache');
  } catch (cacheError: unknown) {
    say('binaries not in cache');
    if ((cacheError as NodeJS.ErrnoException).code === 'ENOENT') {
      say('extracting from bundled archive');
      await extractFromLocal(archivePath, [Binary.Speculos], cachePath);
      extractedBinaries = await opendir(cachePath);
    } else {
      throw cacheError;
    }
  }
  return extractedBinaries;
}

/**
 * Install the downloaded binaries by creating symlinks or copying files.
 *
 * @param downloadedBinaries - The directory containing the binaries.
 * @param binDir - The target directory for installation.
 * @param cachePath - The cache directory path.
 */
export async function installBinaries(
  downloadedBinaries: Dir,
  binDir: string,
  cachePath: string,
): Promise<void> {
  for await (const file of downloadedBinaries) {
    if (!file.isFile()) {
      continue;
    }
    const target = join(file.parentPath, file.name);
    const filePath = join(binDir, relative(cachePath, target));

    const relativeTarget = relative(dirname(filePath), target);

    await mkdir(binDir, { recursive: true });

    await unlink(filePath).catch(noop);
    try {
      await symlink(relativeTarget, filePath);
    } catch (linkError) {
      if (
        !(
          isCodedError(linkError) && ['EPERM', 'EXDEV'].includes(linkError.code)
        )
      ) {
        throw linkError;
      }
      await copyFile(target, filePath);
    }
    say(`installed - ${getVersion(filePath).toString()}`);
  }
}

/**
 * Download and install the Speculos binary.
 *
 * @param options - Installation options.
 * @returns The path to the installed speculos binary.
 */
export async function downloadAndInstall(
  options: SpeculosupOptions = {},
): Promise<string> {
  const version = options.version ?? getDefaultVersion();
  const repo = options.repo ?? getDefaultRepo();
  const platform = options.platform ?? Platform.Linux;
  const targetArch = options.arch ?? normalizeSystemArchitecture();
  const cacheDir = options.cacheDir ?? getDefaultCacheDir();

  say(`fetching speculos v${version} for ${String(platform)} ${targetArch}`);

  const cacheKey = createHash('sha256')
    .update(`speculos-v${version}-${String(platform)}-${targetArch}`)
    .digest('hex');
  const cachePath = join(cacheDir, cacheKey);

  const binDir = join(
    // eslint-disable-next-line no-restricted-globals
    process.cwd(),
    'node_modules',
    '.bin',
  );

  const packageDir = resolvePackageDir();
  const bundledArchive = packageDir
    ? getBundledArchivePath(version, platform, targetArch, packageDir)
    : null;
  let downloadedBinaries: Dir;

  if (
    bundledArchive &&
    packageDir &&
    (await verifyBundledChecksum(bundledArchive, packageDir))
  ) {
    say('using bundled binary');
    downloadedBinaries = await checkAndExtractLocalBinaries(
      bundledArchive,
      cachePath,
    );
  } else {
    const archiveUrl = getBinaryArchiveUrl(repo, version, platform, targetArch);
    const url = new URL(archiveUrl);
    downloadedBinaries = await checkAndDownloadBinaries(url, cachePath);
  }

  await installBinaries(downloadedBinaries, binDir, cachePath);

  say('done!');

  return getBinaryPath(cachePath);
}

/**
 * Remove a cached speculos installation.
 *
 * @param options - Installation options.
 */
export async function cleanCache(
  options: SpeculosupOptions = {},
): Promise<void> {
  const cacheDir = options.cacheDir ?? getDefaultCacheDir();
  await rm(cacheDir, { recursive: true, force: true });
  say('cache cleaned');
}
