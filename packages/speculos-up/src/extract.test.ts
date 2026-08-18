import {
  mkdtemp,
  readFile,
  rm,
  stat,
  symlink,
  link,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { create as createTarArchive } from 'tar';

import { extractFromLocal } from './extract';
import { Binary } from './types';

/**
 * Create a temp directory for test fixtures.
 *
 * @param name - A name fragment for the directory.
 * @returns The temp directory path.
 */
async function makeTempDir(name: string): Promise<string> {
  return mkdtemp(join(tmpdir(), `speculos-up-${name}-`));
}

/**
 * Create a directory containing a speculos payload file and pack it into a
 * tar.gz archive.
 *
 * @param archivePath - The path of the tar.gz archive to create.
 * @param contents - The contents of the speculos file.
 * @returns The source directory that was packed.
 */
async function packSpeculosArchive(
  archivePath: string,
  contents: string | Buffer,
): Promise<string> {
  const sourceDir = await makeTempDir('archive-src');
  await writeFile(join(sourceDir, Binary.Speculos), contents, {
    mode: 0o755,
  });
  await createTarArchive({ cwd: sourceDir, file: archivePath, gzip: true }, [
    '.',
  ]);
  return sourceDir;
}

describe('extract', () => {
  let tempDir: string;

  beforeAll(async () => {
    tempDir = await makeTempDir('extract');
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('extractFromLocal', () => {
    it('extracts a valid archive', async () => {
      const archivePath = join(tempDir, 'valid.tar.gz');
      await packSpeculosArchive(archivePath, 'speculos-payload');
      const destination = join(tempDir, 'valid-dest');

      const paths = await extractFromLocal(
        archivePath,
        [Binary.Speculos],
        destination,
      );

      expect(paths).toStrictEqual([join(destination, Binary.Speculos)]);
      expect(await readFile(join(destination, Binary.Speculos), 'utf8')).toBe(
        'speculos-payload',
      );
    }, 10000);

    it('rejects archives containing a symlink entry', async () => {
      const sourceDir = await makeTempDir('symlink-src');
      await writeFile(join(sourceDir, Binary.Speculos), 'payload', {
        mode: 0o755,
      });
      await symlink(Binary.Speculos, join(sourceDir, 'speculos-link'));
      const archivePath = join(tempDir, 'symlink.tar.gz');
      await createTarArchive(
        { cwd: sourceDir, file: archivePath, gzip: true },
        ['.'],
      );
      const destination = join(tempDir, 'symlink-dest');

      await expect(
        extractFromLocal(archivePath, [Binary.Speculos], destination),
      ).rejects.toThrow(
        /Refusing to extract unsafe archive entry .*SymbolicLink/u,
      );

      // The temporary extraction directory must be cleaned up on failure.
      await expect(stat(`${destination}.extracting`)).rejects.toThrow(
        /ENOENT/u,
      );
      await expect(stat(destination)).rejects.toThrow(/ENOENT/u);
    }, 10000);

    it('rejects archives containing a hardlink entry', async () => {
      const sourceDir = await makeTempDir('hardlink-src');
      await writeFile(join(sourceDir, Binary.Speculos), 'payload', {
        mode: 0o755,
      });
      await link(
        join(sourceDir, Binary.Speculos),
        join(sourceDir, 'speculos-hardlink'),
      );
      const archivePath = join(tempDir, 'hardlink.tar.gz');
      await createTarArchive(
        { cwd: sourceDir, file: archivePath, gzip: true },
        ['.'],
      );
      const destination = join(tempDir, 'hardlink-dest');

      await expect(
        extractFromLocal(archivePath, [Binary.Speculos], destination),
      ).rejects.toThrow(/Refusing to extract unsafe archive entry .*Link/u);
    }, 10000);

    it('aborts archives that decompress beyond the configured size cap', async () => {
      const archivePath = join(tempDir, 'oversized.tar.gz');
      // Highly compressible content: tiny on disk, large when decompressed.
      await packSpeculosArchive(archivePath, Buffer.alloc(64 * 1024, 0x61));
      const destination = join(tempDir, 'oversized-dest');

      await expect(
        extractFromLocal(archivePath, [Binary.Speculos], destination, {
          maxDecompressedBytes: 1024,
        }),
      ).rejects.toThrow(/exceeds the allowed maximum/u);

      await expect(stat(destination)).rejects.toThrow(/ENOENT/u);
    }, 10000);

    it('rejects archives that are not gzip-compressed', async () => {
      const sourceDir = await makeTempDir('plain-src');
      await writeFile(join(sourceDir, Binary.Speculos), 'payload');
      const archivePath = join(tempDir, 'plain.tar');
      // Deliberately create a plain (non-gzipped) tar archive.
      await createTarArchive({ cwd: sourceDir, file: archivePath }, ['.']);
      const destination = join(tempDir, 'plain-dest');

      await expect(
        extractFromLocal(archivePath, [Binary.Speculos], destination),
      ).rejects.toThrow(/incorrect header check/u);
    }, 10000);

    it('creates the destination directory even if the parent does not exist', async () => {
      const archivePath = join(tempDir, 'nested.tar.gz');
      await packSpeculosArchive(archivePath, 'nested-payload');
      const destination = join(tempDir, 'nested', 'parent', 'dest');

      const paths = await extractFromLocal(
        archivePath,
        [Binary.Speculos],
        destination,
      );

      expect(paths).toStrictEqual([join(destination, Binary.Speculos)]);
      const extractedStat = await stat(join(destination, Binary.Speculos));
      expect(extractedStat.isFile()).toBe(true);
    }, 10000);
  });
});
