// eslint-disable-next-line import-x/no-nodejs-modules
import { execFileSync } from 'node:child_process';
// eslint-disable-next-line import-x/no-nodejs-modules
import { existsSync } from 'node:fs';
// eslint-disable-next-line import-x/no-nodejs-modules
import { arch } from 'node:os';
// eslint-disable-next-line import-x/no-nodejs-modules
import { homedir } from 'node:os';
// eslint-disable-next-line import-x/no-nodejs-modules
import { basename, join } from 'node:path';

import { Architecture } from './types';
import type { Platform } from './types';

const DEFAULT_VERSION = '0.25.13';
const DEFAULT_REPO = 'MetaMask/accounts';

/**
 * No-op function.
 *
 * @returns undefined.
 */
export const noop = (): undefined => undefined;

/**
 * Get the default Speculos version.
 *
 * @returns The version string.
 */
export function getDefaultVersion(): string {
  return DEFAULT_VERSION;
}

/**
 * Get the default GitHub repo hosting speculos releases.
 *
 * @returns The repo string.
 */
export function getDefaultRepo(): string {
  return DEFAULT_REPO;
}

/**
 * Normalize the system architecture.
 *
 * @param architecture - The architecture string.
 * @returns The normalized architecture.
 */
export function normalizeSystemArchitecture(
  architecture: string = arch(),
): Architecture {
  if (architecture.startsWith('arm')) {
    return Architecture.Arm64;
  }
  return Architecture.Amd64;
}

/**
 * Get the default cache directory.
 *
 * @returns The cache directory path.
 */
export function getDefaultCacheDir(): string {
  return join(homedir(), '.cache', 'metamask', 'speculosup');
}

/**
 * Log a message with the speculosup prefix.
 *
 * @param message - The message to log.
 */
export function say(message: string): void {
  console.log(`[speculosup] ${message}`);
}

/**
 * Get the version of the binary at the given path.
 *
 * @param binPath - Path to the binary.
 * @returns The version output.
 */
export function getVersion(binPath: string): Buffer {
  try {
    return execFileSync(binPath, ['--version']).subarray(0, -1);
  } catch (error: unknown) {
    const versionError = `Failed to get version for ${binPath}`;
    if (error instanceof Error) {
      error.message = `${versionError}\n\n${error.message}`;
      throw error;
    }
    throw new Error(`${versionError}: ${String(error)}`);
  }
}

/**
 * Check if an error has a code property.
 *
 * @param error - The error to check.
 * @returns True if the error has a code property.
 */
export function isCodedError(
  error: unknown,
): error is Error & { code: string } {
  return (
    error instanceof Error && 'code' in error && typeof error.code === 'string'
  );
}

/**
 * Generate the URL for downloading the Speculos binary archive.
 *
 * @param repo - The GitHub repository.
 * @param version - The version string.
 * @param platform - The target platform.
 * @param targetArch - The target architecture.
 * @returns The download URL.
 */
export function getBinaryArchiveUrl(
  repo: string,
  version: string,
  platform: Platform,
  targetArch: string,
): string {
  return `https://github.com/${repo}/releases/download/speculos-v${version}/speculos-v${version}-${String(platform)}-${targetArch}.tar.gz`;
}

/**
 * Get the path to the speculos binary in the given install directory.
 *
 * @param installDir - The directory where the binary was extracted.
 * @returns The absolute path to the speculos binary.
 */
export function getBinaryPath(installDir: string): string {
  return join(installDir, 'speculos');
}

/**
 * Check if speculos is already installed at the given path.
 *
 * @param installDir - The install directory.
 * @returns True if the binary exists.
 */
export function isInstalled(installDir: string): boolean {
  return existsSync(getBinaryPath(installDir));
}

/**
 * Get the path to a bundled speculos archive, if one exists for the given
 * platform and architecture.
 *
 * Bundled archives are pre-packaged tar.gz files in the `bundled/` directory
 * next to the compiled `dist/` output. They allow the binary to be used
 * without a network download.
 *
 * @param version - The speculos version.
 * @param platform - The target platform.
 * @param targetArch - The target architecture.
 * @param packageDir - The package root directory containing bundled/.
 * @returns The absolute path to the bundled archive, or `null` if not found.
 */
export function getBundledArchivePath(
  version: string,
  platform: Platform,
  targetArch: string,
  packageDir: string,
): string | null {
  const fileName = `speculos-v${version}-${String(platform)}-${targetArch}.tar.gz`;
  const archivePath = join(packageDir, 'bundled', fileName);
  return existsSync(archivePath) ? archivePath : null;
}

/**
 * Get the SHA256 checksum for a bundled archive.
 *
 * @param archivePath - The path to the archive.
 * @param checksums - The checksums map.
 * @returns The expected checksum, or undefined if not found.
 */
export function getBundledChecksum(
  archivePath: string,
  checksums: Record<string, string>,
): string | undefined {
  return checksums[basename(archivePath)];
}
