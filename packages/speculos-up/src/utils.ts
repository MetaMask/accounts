// eslint-disable-next-line import-x/no-nodejs-modules
import { execFileSync } from 'node:child_process';
// eslint-disable-next-line import-x/no-nodejs-modules
import { createHash } from 'node:crypto';
// eslint-disable-next-line import-x/no-nodejs-modules
import { existsSync } from 'node:fs';
// eslint-disable-next-line import-x/no-nodejs-modules
import { readFile } from 'node:fs/promises';
// eslint-disable-next-line import-x/no-nodejs-modules
import { arch } from 'node:os';
// eslint-disable-next-line import-x/no-nodejs-modules
import { homedir } from 'node:os';
// eslint-disable-next-line import-x/no-nodejs-modules
import { isAbsolute, join, relative, resolve, sep } from 'node:path';

import { Architecture } from './types';
import type { Platform } from './types';

const DEFAULT_VERSION = '0.25.13';
const DEFAULT_REPO = 'MetaMask/accounts';

/**
 * Maximum number of retries for best-effort filesystem cleanup operations
 * (for example, removing a partially extracted or downloaded archive).
 */
export const CLEANUP_MAX_RETRIES = 3;

/**
 * Architecture strings that are normalized to {@link Architecture.Amd64}.
 */
const AMD64_ARCHITECTURES = new Set(['x64', 'amd64']);

/**
 * Architecture strings that are normalized to {@link Architecture.Arm64}.
 */
const ARM64_ARCHITECTURES = new Set(['arm64', 'aarch64']);

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
 * Only known 64-bit architectures are supported: `x64`/`amd64` map to
 * {@link Architecture.Amd64}, and `arm64`/`aarch64` map to
 * {@link Architecture.Arm64}. Anything else (for example `arm`, `armv7l`,
 * `ia32`, or `ppc64`) is unsupported, because no Speculos binaries are
 * published for it.
 *
 * @param architecture - The architecture string.
 * @returns The normalized architecture.
 * @throws If the architecture is not supported.
 */
export function normalizeSystemArchitecture(
  architecture: string = arch(),
): Architecture {
  if (AMD64_ARCHITECTURES.has(architecture)) {
    return Architecture.Amd64;
  }
  if (ARM64_ARCHITECTURES.has(architecture)) {
    return Architecture.Arm64;
  }
  throw new Error(
    `Unsupported system architecture "${architecture}". Supported architectures are x64/amd64 and arm64/aarch64.`,
  );
}

/**
 * Get the default cache directory.
 *
 * Honors the `XDG_CACHE_HOME` environment variable when it is set to an
 * absolute path; otherwise uses `~/.cache`.
 *
 * @returns The cache directory path.
 */
export function getDefaultCacheDir(): string {
  // eslint-disable-next-line no-restricted-globals
  const envCacheDir = process.env.XDG_CACHE_HOME;
  const cacheBase =
    envCacheDir && isAbsolute(envCacheDir)
      ? envCacheDir
      : join(homedir(), '.cache');
  return join(cacheBase, 'metamask', 'speculos-up');
}

/**
 * Log a message with the speculos-up prefix.
 *
 * @param message - The message to log.
 */
export function say(message: string): void {
  console.log(`[speculos-up] ${message}`);
}

/**
 * Get the version of the binary at the given path.
 *
 * @param binPath - Path to the binary.
 * @returns The version output, with a single trailing newline stripped.
 */
export function getVersion(binPath: string): string {
  try {
    const output = execFileSync(binPath, ['--version'], {
      encoding: 'utf8',
    });
    return output.endsWith('\n') ? output.slice(0, -1) : output;
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
 * Compute the SHA-256 checksum of a file.
 *
 * @param filePath - The path to the file.
 * @returns The lowercase hex-encoded SHA-256 digest.
 * @throws If the file cannot be read.
 */
export async function computeFileSha256(filePath: string): Promise<string> {
  const fileBuffer = await readFile(filePath);
  return createHash('sha256').update(fileBuffer).digest('hex');
}

/**
 * Get the error message from an unknown error value.
 *
 * @param error - The error value.
 * @returns A human-readable message.
 */
function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Load and validate a checksums file.
 *
 * The file must contain a JSON object mapping archive filenames to hex-encoded
 * checksum strings.
 *
 * @param checksumsPath - The path to the checksums JSON file.
 * @returns The parsed checksums map.
 * @throws If the file is unreadable, not valid JSON, or has an invalid shape.
 * Verification must fail closed in those cases.
 */
export async function loadChecksumsFile(
  checksumsPath: string,
): Promise<Record<string, string>> {
  let contents: string;
  try {
    contents = await readFile(checksumsPath, 'utf8');
  } catch (error) {
    throw new Error(
      `Unable to read checksums file "${checksumsPath}": ${getErrorMessage(error)}`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(contents);
  } catch (error) {
    throw new Error(
      `Checksums file "${checksumsPath}" is not valid JSON: ${getErrorMessage(error)}`,
    );
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(
      `Checksums file "${checksumsPath}" must contain a JSON object mapping archive filenames to SHA-256 checksums.`,
    );
  }

  const checksums: Record<string, string> = {};
  for (const [fileName, checksum] of Object.entries(parsed)) {
    if (typeof checksum !== 'string' || checksum.length === 0) {
      throw new Error(
        `Checksums file "${checksumsPath}" has an invalid checksum for "${fileName}": expected a non-empty string.`,
      );
    }
    checksums[fileName] = checksum;
  }
  return checksums;
}

/**
 * Get the required checksum for a file from a checksums file.
 *
 * @param checksumsPath - The path to the checksums JSON file.
 * @param fileName - The archive filename to look up.
 * @returns The expected checksum.
 * @throws If the checksums file is unreadable or malformed, or if no checksum
 * is recorded for the given filename. Verification must fail closed in those
 * cases.
 */
export async function getRequiredChecksum(
  checksumsPath: string,
  fileName: string,
): Promise<string> {
  const checksums = await loadChecksumsFile(checksumsPath);
  const expected = checksums[fileName];
  if (expected === undefined) {
    throw new Error(
      `No checksum recorded for "${fileName}" in "${checksumsPath}"; refusing to install an unverified archive.`,
    );
  }
  return expected;
}

/**
 * Check whether a path is equal to or nested inside another path.
 *
 * Both paths are resolved before comparison, so relative segments such as `..`
 * are taken into account.
 *
 * @param rootPath - The root path.
 * @param candidatePath - The path to check.
 * @returns True if the candidate path is the root itself or inside it.
 */
export function isPathWithin(rootPath: string, candidatePath: string): boolean {
  const relativePath = relative(resolve(rootPath), resolve(candidatePath));
  if (relativePath === '') {
    return true;
  }
  return (
    relativePath !== '..' &&
    !relativePath.startsWith(`..${sep}`) &&
    !isAbsolute(relativePath)
  );
}
