// eslint-disable-next-line import-x/no-nodejs-modules
import { createHash } from 'node:crypto';
// eslint-disable-next-line import-x/no-nodejs-modules
import { mkdir, readFile, rename, rm } from 'node:fs/promises';
// eslint-disable-next-line import-x/no-nodejs-modules
import { join } from 'node:path';
// eslint-disable-next-line import-x/no-nodejs-modules
import { pipeline } from 'node:stream/promises';
import { extract as extractTar } from 'tar';

import { startDownload } from './download';
import type { Binary } from './types';
import { say } from './utils';

/**
 * Extract the speculos binary from a tar.gz archive at the given URL.
 *
 * @param url - The URL of the tar.gz archive.
 * @param binaries - The binaries to extract.
 * @param dir - The destination directory.
 * @param checksums - Optional checksums for verification.
 * @returns The list of extracted binary paths.
 */
export async function extractFrom(
  url: URL,
  binaries: Binary[],
  dir: string,
  checksums: { algorithm: string; binaries: Record<Binary, string> } | null,
): Promise<string[]> {
  const tempDir = `${dir}.downloading`;
  const rmOpts = { recursive: true, maxRetries: 3, force: true };
  try {
    await rm(tempDir, rmOpts);
    await mkdir(tempDir, { recursive: true });

    say('downloading and extracting archive');
    await pipeline(startDownload(url), extractTar({ cwd: tempDir }));

    const paths: string[] = [];
    for (const binary of binaries) {
      const extractedPath = join(tempDir, binary);
      if (checksums) {
        say(`verifying checksum for ${binary}`);
        const fileBuffer = await readFile(extractedPath);
        const hash = createHash(checksums.algorithm)
          .update(fileBuffer)
          .digest('hex');
        const expected = checksums.binaries[binary];
        if (hash === expected) {
          say(`checksum verified for ${binary}`);
        } else {
          throw new Error(
            `checksum mismatch for ${binary}, expected ${expected}, got ${hash}`,
          );
        }
      }
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
