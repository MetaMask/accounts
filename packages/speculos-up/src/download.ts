import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { getPlatform } from './platform';
import {
  DEFAULT_CACHE_DIR,
  RELEASE_BASE_URL,
  SPECULOS_VERSION,
} from './constants';

const execFileAsync = promisify(execFile);

export type EnsureBinaryOptions = {
  cacheDir?: string;
};

async function computeSha256(filePath: string): Promise<string> {
  return readFile(filePath).then((data) =>
    createHash('sha256').update(data).digest('hex'),
  );
}

function getExtractDir(cacheDir: string): string {
  return join(cacheDir, `speculos-${SPECULOS_VERSION}`);
}

/**
 * Return the expected path to the cached Speculos binary.
 *
 * @param cacheDir - Optional cache directory override.
 * @returns The absolute path to the binary.
 */
export function getBinaryPath(cacheDir?: string): string {
  const dir = cacheDir ?? join(process.cwd(), DEFAULT_CACHE_DIR);
  return join(getExtractDir(dir), 'speculos');
}

async function downloadFile(url: string, destPath: string): Promise<void> {
  console.log(`[speculos-up] Downloading ${url}...`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status}`);
  }
  const data = Buffer.from(await response.arrayBuffer());
  await writeFile(destPath, data);
}

async function extractTarGz(
  archivePath: string,
  destDir: string,
): Promise<void> {
  await mkdir(destDir, { recursive: true });
  await execFileAsync('tar', ['-xzf', archivePath, '-C', destDir]);
}

async function extractZip(
  archivePath: string,
  destDir: string,
): Promise<void> {
  await mkdir(destDir, { recursive: true });
  await execFileAsync('unzip', ['-o', archivePath, '-d', destDir]);
}

/**
 * Ensure the Speculos binary is available, downloading it if necessary.
 *
 * @param options - Configuration options.
 * @param options.cacheDir - Optional cache directory override.
 * @returns The absolute path to the Speculos binary.
 */
export async function ensureBinary(
  options: EnsureBinaryOptions = {},
): Promise<string> {
  const cacheDir = options.cacheDir ?? join(process.cwd(), DEFAULT_CACHE_DIR);
  const binaryPath = getBinaryPath(cacheDir);

  if (existsSync(binaryPath)) {
    return binaryPath;
  }

  const platform = getPlatform();
  const url = `${RELEASE_BASE_URL}/${platform.filename}`;
  const archivePath = join(cacheDir, platform.filename);

  await mkdir(cacheDir, { recursive: true });

  if (!existsSync(archivePath)) {
    await downloadFile(url, archivePath);
  }

  const actualChecksum = await computeSha256(archivePath);
  if (
    platform.checksum !== 'PLACEHOLDER_RUN_BUILD_PIPELINE_FIRST' &&
    actualChecksum !== platform.checksum
  ) {
    throw new Error(
      `Checksum mismatch for ${platform.filename}. Expected: ${platform.checksum}, Got: ${actualChecksum}`,
    );
  }

  const extractDir = getExtractDir(cacheDir);
  if (platform.filename.endsWith('.tar.gz')) {
    await extractTarGz(archivePath, extractDir);
  } else if (platform.filename.endsWith('.zip')) {
    await extractZip(archivePath, extractDir);
  } else {
    throw new Error(`Unknown archive format: ${platform.filename}`);
  }

  if (!existsSync(binaryPath)) {
    throw new Error(
      `Binary not found at ${binaryPath} after extraction`,
    );
  }

  console.log(`[speculos-up] Binary ready at ${binaryPath}`);
  return binaryPath;
}
