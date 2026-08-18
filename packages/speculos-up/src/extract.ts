// eslint-disable-next-line import-x/no-nodejs-modules
import { createReadStream } from 'node:fs';
// eslint-disable-next-line import-x/no-nodejs-modules
import type { Stats } from 'node:fs';
// eslint-disable-next-line import-x/no-nodejs-modules
import { mkdir, rm, rename, stat } from 'node:fs/promises';
// eslint-disable-next-line import-x/no-nodejs-modules
import { join } from 'node:path';
// eslint-disable-next-line import-x/no-nodejs-modules
import type { Readable } from 'node:stream';
// eslint-disable-next-line import-x/no-nodejs-modules
import { Transform } from 'node:stream';
// eslint-disable-next-line import-x/no-nodejs-modules
import { pipeline } from 'node:stream/promises';
// eslint-disable-next-line import-x/no-nodejs-modules
import { createGunzip } from 'node:zlib';
import { extract as extractTar } from 'tar';
import type { ReadEntry } from 'tar';

import type { Binary } from './types';
import { CLEANUP_MAX_RETRIES, say } from './utils';

/**
 * Default maximum decompressed size of an archive (1 GiB). Archives that
 * decompress to more than this are aborted to protect against decompression
 * bombs.
 */
export const DEFAULT_MAX_DECOMPRESSED_ARCHIVE_BYTES = 1024 * 1024 * 1024; // 1 GiB

/**
 * Options for extracting a local archive.
 */
export type ExtractOptions = {
  /**
   * Maximum decompressed size of the archive, in bytes. Extraction aborts
   * with an error if the decompressed tar stream exceeds this size.
   */
  maxDecompressedBytes?: number;
};

/**
 * A tar entry that was rejected by the extraction filter.
 */
type UnsafeTarEntry = {
  path: string;
  type: string;
};

/**
 * Check whether a tar entry type may be extracted.
 *
 * Only regular files and directories are allowed. Symlinks, hardlinks,
 * device nodes, FIFOs, and anything else are rejected so a malicious archive
 * cannot plant links or special files on disk.
 *
 * @param entryType - The tar entry type name.
 * @returns True if the entry type is allowed.
 */
function isAllowedTarEntryType(entryType: string): boolean {
  return [
    'File',
    'OldFile',
    'ContiguousFile',
    'Directory',
    'GNUDumpDir',
  ].includes(entryType);
}

/**
 * Extract a tar.gz stream into a directory, with hardened tar options:
 *
 * - `strict: true`, so tar warnings raise errors instead of being ignored.
 * - An `onwarn` hook that turns any remaining warning into an error.
 * - A filter that rejects symlink, hardlink, and other non-regular entries.
 * - A decompressed-size cap that aborts extraction of oversized archives.
 *
 * @param source - The (compressed) archive stream.
 * @param destinationDir - The directory to extract into.
 * @param maxDecompressedBytes - The maximum allowed decompressed size.
 * @throws If the archive is not valid gzip, exceeds the decompressed-size
 * cap, contains unsafe entries, or tar reports warnings/errors.
 */
async function extractTarGzArchive(
  source: Readable,
  destinationDir: string,
  maxDecompressedBytes: number,
): Promise<void> {
  let decompressedBytes = 0;
  const sizeLimitingStream = new Transform({
    transform(chunk: Buffer, _encoding, callback): void {
      decompressedBytes += chunk.length;
      if (decompressedBytes > maxDecompressedBytes) {
        callback(
          new Error(
            `Archive decompressed size exceeds the allowed maximum of ${maxDecompressedBytes} bytes.`,
          ),
        );
        return;
      }
      callback(null, chunk);
    },
  });

  const unsafeEntries: UnsafeTarEntry[] = [];
  const extraction = extractTar({
    cwd: destinationDir,
    strict: true,
    onwarn: (code, message) => {
      throw new Error(`tar extraction warning (${code}): ${message}`);
    },
    filter: (entryPath: string, entry: Stats | ReadEntry): boolean => {
      const entryType = 'type' in entry ? entry.type : 'File';
      if (!isAllowedTarEntryType(entryType)) {
        unsafeEntries.push({ path: entryPath, type: entryType });
        return false;
      }
      return true;
    },
  });

  await pipeline(source, createGunzip(), sizeLimitingStream, extraction);

  const firstUnsafeEntry = unsafeEntries[0];
  if (firstUnsafeEntry !== undefined) {
    throw new Error(
      `Refusing to extract unsafe archive entry "${firstUnsafeEntry.path}" of type "${firstUnsafeEntry.type}": only regular files and directories are allowed.`,
    );
  }
}

/**
 * Extract the speculos binary from a local tar.gz archive.
 *
 * @param archivePath - The absolute path to the tar.gz archive.
 * @param binaries - The binaries to extract.
 * @param dir - The destination directory.
 * @param options - Extraction options.
 * @returns The list of extracted binary paths.
 * @throws If extraction fails, the archive contains unsafe entries, or the
 * archive exceeds the decompressed-size cap.
 */
export async function extractFromLocal(
  archivePath: string,
  binaries: Binary[],
  dir: string,
  options: ExtractOptions = {},
): Promise<string[]> {
  const tempDir = `${dir}.extracting`;
  const rmOpts = {
    recursive: true,
    maxRetries: CLEANUP_MAX_RETRIES,
    force: true,
  };
  try {
    await rm(tempDir, rmOpts);
    await mkdir(tempDir, { recursive: true });

    say('extracting bundled archive');
    await extractTarGzArchive(
      createReadStream(archivePath),
      tempDir,
      options.maxDecompressedBytes ?? DEFAULT_MAX_DECOMPRESSED_ARCHIVE_BYTES,
    );

    const paths: string[] = [];
    for (const binary of binaries) {
      const extractedPath = join(tempDir, binary);
      await stat(extractedPath);
      paths.push(join(dir, binary));
    }

    await rm(dir, rmOpts);
    await rename(tempDir, dir);
    return paths;
  } catch (error) {
    const rmErrors = (
      await Promise.allSettled([rm(tempDir, rmOpts), rm(dir, rmOpts)])
    )
      .filter((result) => result.status === 'rejected')
      .map((result) => (result as PromiseRejectedResult).reason);

    if (rmErrors.length) {
      throw new Error(
        `Extraction failed and cleanup also failed: ${rmErrors.map((reason) => (reason instanceof Error ? reason.message : String(reason))).join(', ')}`,
      );
    }
    throw error;
  }
}
