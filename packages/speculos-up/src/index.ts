// eslint-disable-next-line import-x/no-nodejs-modules
import type { Dir } from 'node:fs';
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
import { basename, dirname, join, relative } from 'node:path';

import { downloadToFile } from './download';
import { extractFromLocal } from './extract';
import type { SpeculosupOptions } from './types';
import { Binary, Platform } from './types';
import {
  CLEANUP_MAX_RETRIES,
  computeFileSha256,
  getBinaryArchiveUrl,
  getBinaryPath,
  getBundledArchivePath,
  getDefaultCacheDir,
  getDefaultRepo,
  getDefaultVersion,
  getRequiredChecksum,
  getVersion,
  isCodedError,
  isInstalled,
  isPathWithin,
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
 * Verify the SHA-256 checksum of a bundled archive against checksums.json.
 *
 * Verification fails closed: if the checksums file is unreadable, malformed,
 * or has no entry for the archive, an error is thrown rather than skipping
 * verification.
 *
 * @param archivePath - The path to the archive file.
 * @param packageDir - The package root directory.
 * @returns True if the checksum matches, false if it does not.
 * @throws If the checksums file is unreadable or malformed, or if no checksum
 * is recorded for the archive.
 */
export async function verifyBundledChecksum(
  archivePath: string,
  packageDir: string,
): Promise<boolean> {
  const checksumsPath = join(packageDir, 'bundled', 'checksums.json');
  const archiveName = basename(archivePath);
  const expected = await getRequiredChecksum(checksumsPath, archiveName);
  const actual = await computeFileSha256(archivePath);
  if (actual !== expected) {
    say(`checksum mismatch: expected ${expected}, got ${actual}`);
    return false;
  }
  say('bundled archive checksum verified');
  return true;
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
 * Check if binaries are already in the cache. If not, download the archive
 * from the given HTTPS URL, verify its SHA-256 checksum against the package's
 * `bundled/checksums.json`, and only then extract it.
 *
 * The cache is only treated as valid if the expected binary file actually
 * exists; an empty or partial cache directory is re-populated.
 *
 * @param url - The HTTPS URL of the tar.gz archive to download.
 * @param cachePath - The cache directory.
 * @param packageDir - The package root directory containing
 * `bundled/checksums.json`.
 * @returns A directory handle for the cached binaries.
 * @throws If the checksums file is unreadable, malformed, or has no entry for
 * the archive, if the downloaded archive's checksum does not match, or if the
 * download or extraction fails. Verification fails closed in all those cases.
 */
export async function checkAndDownloadBinaries(
  url: URL,
  cachePath: string,
  packageDir: string,
): Promise<Dir> {
  say('checking cache');
  if (isInstalled(cachePath)) {
    say('found binaries in cache');
    return opendir(cachePath);
  }

  say('binaries not in cache');
  say(`installing from ${url.toString()}`);

  const archiveName = basename(url.pathname);
  const checksumsPath = join(packageDir, 'bundled', 'checksums.json');
  const expectedChecksum = await getRequiredChecksum(
    checksumsPath,
    archiveName,
  );

  await mkdir(dirname(cachePath), { recursive: true });
  const archivePath = `${cachePath}.download.tar.gz`;
  await downloadToFile(url, archivePath);
  try {
    const actualChecksum = await computeFileSha256(archivePath);
    if (actualChecksum !== expectedChecksum) {
      throw new Error(
        `Checksum mismatch for downloaded archive "${archiveName}": expected ${expectedChecksum}, got ${actualChecksum}`,
      );
    }
    say('downloaded archive checksum verified');
    await extractFromLocal(archivePath, [Binary.Speculos], cachePath);
  } finally {
    await rm(archivePath, {
      recursive: true,
      force: true,
      maxRetries: CLEANUP_MAX_RETRIES,
    }).catch(noop);
  }
  return opendir(cachePath);
}

/**
 * Check if binaries are already in the cache. If not, extract from a local archive.
 *
 * The cache is only treated as valid if the expected binary file actually
 * exists; an empty or partial cache directory is re-populated.
 *
 * @param archivePath - The absolute path to the local tar.gz archive.
 * @param cachePath - The cache directory.
 * @returns A directory handle for the cached binaries.
 * @throws If extraction fails.
 */
export async function checkAndExtractLocalBinaries(
  archivePath: string,
  cachePath: string,
): Promise<Dir> {
  say('checking cache');
  if (isInstalled(cachePath)) {
    say('found binaries in cache');
    return opendir(cachePath);
  }

  say('binaries not in cache');
  say('extracting from bundled archive');
  await extractFromLocal(archivePath, [Binary.Speculos], cachePath);
  return opendir(cachePath);
}

/**
 * Install the downloaded binaries by creating symlinks or copying files.
 *
 * @param downloadedBinaries - The directory containing the binaries.
 * @param binDir - The target directory for installation.
 * @param sourceDir - The directory the binaries were downloaded and
 * extracted into.
 */
export async function installBinaries(
  downloadedBinaries: Dir,
  binDir: string,
  sourceDir: string,
): Promise<void> {
  for await (const file of downloadedBinaries) {
    if (!file.isFile()) {
      continue;
    }
    const sourcePath = join(file.parentPath, file.name);
    const installPath = join(binDir, relative(sourceDir, sourcePath));

    const relativeSource = relative(dirname(installPath), sourcePath);

    await mkdir(binDir, { recursive: true });

    await unlink(installPath).catch(noop);
    try {
      await symlink(relativeSource, installPath);
    } catch (linkError) {
      if (
        !(
          isCodedError(linkError) && ['EPERM', 'EXDEV'].includes(linkError.code)
        )
      ) {
        throw linkError;
      }
      await copyFile(sourcePath, installPath);
    }
    say(`installed - ${getVersion(installPath)}`);
  }
}

/**
 * Download and install the Speculos binary.
 *
 * If a bundled archive exists for the target platform and architecture and
 * its checksum verifies, it is used directly. Otherwise the archive is
 * downloaded over HTTPS from the release URL and its SHA-256 checksum is
 * verified against the package's `bundled/checksums.json` before extraction.
 *
 * Binaries are installed into the version-named directory returned by
 * `getInstallDir()` — the same directory that `getSpeculosBinaryPath()` and
 * `isSpeculosInstalled()` check — and symlinked into `node_modules/.bin`.
 *
 * @param options - Installation options.
 * @returns The path to the installed speculos binary.
 * @throws If the system architecture is unsupported, the checksums file is
 * unreadable, malformed, or missing an entry, a checksum does not match, or
 * the download or extraction fails.
 */
export async function downloadAndInstall(
  options: SpeculosupOptions = {},
): Promise<string> {
  const version = options.version ?? getDefaultVersion();
  const repo = options.repo ?? getDefaultRepo();
  const platform = options.platform ?? Platform.Linux;
  const targetArch = options.arch ?? normalizeSystemArchitecture();

  say(`fetching speculos v${version} for ${String(platform)} ${targetArch}`);

  // Install into the readable, version-named directory that
  // getSpeculosBinaryPath()/isSpeculosInstalled() look in, so a successful
  // install is immediately visible to callers.
  const installDir = getInstallDir(options);

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
      installDir,
    );
  } else {
    if (!packageDir) {
      throw new Error(
        'Unable to resolve the speculos-up package directory; cannot verify checksums for remote downloads.',
      );
    }
    const archiveUrl = getBinaryArchiveUrl(repo, version, platform, targetArch);
    const url = new URL(archiveUrl);
    downloadedBinaries = await checkAndDownloadBinaries(
      url,
      installDir,
      packageDir,
    );
  }

  await installBinaries(downloadedBinaries, binDir, installDir);

  say('done!');

  return getBinaryPath(installDir);
}

/**
 * Remove a cached speculos installation.
 *
 * The cache directory to remove must be the default cache directory itself or
 * a path inside it; anything else is refused, so a caller-supplied path can
 * never cause an arbitrary directory to be recursively deleted.
 *
 * @param options - Installation options.
 * @throws If the resolved cache directory is outside the expected cache root.
 */
export async function cleanCache(
  options: SpeculosupOptions = {},
): Promise<void> {
  const cacheRoot = getDefaultCacheDir();
  const cacheDir = options.cacheDir ?? cacheRoot;
  if (!isPathWithin(cacheRoot, cacheDir)) {
    throw new Error(
      `Refusing to delete "${cacheDir}" because it is outside the speculos-up cache root "${cacheRoot}".`,
    );
  }
  await rm(cacheDir, { recursive: true, force: true });
  say('cache cleaned');
}
