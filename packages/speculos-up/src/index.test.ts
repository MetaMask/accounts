import type { Dir } from 'node:fs';
import {
  copyFile,
  mkdir,
  mkdtemp,
  opendir,
  readdir,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { dirname } from 'node:path';
import { create as createTarArchive } from 'tar';

import {
  checkAndDownloadBinaries,
  checkAndExtractLocalBinaries,
  cleanCache,
  downloadAndInstall,
  getInstallDir,
  getSpeculosBinaryPath,
  installBinaries,
  verifyBundledChecksum,
} from '.';
import { downloadToFile } from './download';
import { Binary } from './types';
import { computeFileSha256 } from './utils';
import * as utils from './utils';

jest.mock('./download', () => ({
  downloadToFile: jest.fn(),
}));

const ARCHIVE_NAME = 'speculos-v0.25.13-linux-amd64.tar.gz';

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
 * Create a package-like fixture directory with bundled/checksums.json.
 *
 * @param checksumsPath - The directory in which to create the fixture.
 * @param checksums - The checksums map to write, or a raw malformed string.
 */
async function writeChecksumsFile(
  checksumsPath: string,
  checksums: Record<string, string> | string,
): Promise<void> {
  await mkdir(join(checksumsPath, 'bundled'), { recursive: true });
  const contents =
    typeof checksums === 'string'
      ? checksums
      : `${JSON.stringify(checksums, null, 2)}\n`;
  await writeFile(join(checksumsPath, 'bundled', 'checksums.json'), contents);
}

/**
 * Create a tar.gz fixture containing a speculos payload file.
 *
 * @param archivePath - The path of the archive to create.
 * @param payload - The payload contents, defaults to an executable script.
 * @returns The SHA-256 checksum of the created archive.
 */
async function createArchiveFixture(
  archivePath: string,
  payload: string | Buffer = '#!/bin/sh\necho "speculos version"\n',
): Promise<string> {
  const sourceDir = await makeTempDir('fixture-src');
  try {
    await writeFile(join(sourceDir, Binary.Speculos), payload, {
      mode: 0o755,
    });
    await mkdir(dirname(archivePath), { recursive: true });
    await createTarArchive({ cwd: sourceDir, file: archivePath, gzip: true }, [
      '.',
    ]);
  } finally {
    await rm(sourceDir, { recursive: true, force: true });
  }
  return computeFileSha256(archivePath);
}

/**
 * Read the entries of a directory handle and close it.
 *
 * @param dir - The directory handle.
 * @returns The entry names.
 */
async function readDirEntries(dir: Dir): Promise<string[]> {
  const entries: string[] = [];
  for await (const entry of dir) {
    entries.push(entry.name);
  }
  return entries;
}

describe('index security paths', () => {
  let tempDir: string;

  beforeAll(async () => {
    tempDir = await makeTempDir('index');
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('verifyBundledChecksum', () => {
    it('returns true when the checksum matches', async () => {
      const packageDir = join(tempDir, 'verify-ok');
      const archivePath = join(packageDir, 'bundled', ARCHIVE_NAME);
      const checksum = await createArchiveFixture(archivePath);
      await writeChecksumsFile(packageDir, { [ARCHIVE_NAME]: checksum });

      expect(await verifyBundledChecksum(archivePath, packageDir)).toBe(true);
    });

    it('returns false when the checksum does not match', async () => {
      const packageDir = join(tempDir, 'verify-mismatch');
      const archivePath = join(packageDir, 'bundled', ARCHIVE_NAME);
      await createArchiveFixture(archivePath);
      await writeChecksumsFile(packageDir, {
        [ARCHIVE_NAME]: 'deadbeef',
      });

      expect(await verifyBundledChecksum(archivePath, packageDir)).toBe(false);
    });

    it('throws when no checksum is recorded for the archive', async () => {
      const packageDir = join(tempDir, 'verify-missing-entry');
      const archivePath = join(packageDir, 'bundled', ARCHIVE_NAME);
      await createArchiveFixture(archivePath);
      await writeChecksumsFile(packageDir, {
        'some-other-archive.tar.gz': 'abc123',
      });

      await expect(
        verifyBundledChecksum(archivePath, packageDir),
      ).rejects.toThrow(/No checksum recorded/u);
    });

    it('throws when checksums.json is malformed', async () => {
      const packageDir = join(tempDir, 'verify-malformed');
      const archivePath = join(packageDir, 'bundled', ARCHIVE_NAME);
      await createArchiveFixture(archivePath);
      await writeChecksumsFile(packageDir, '{ not valid json');

      await expect(
        verifyBundledChecksum(archivePath, packageDir),
      ).rejects.toThrow(/not valid JSON/u);
    });

    it('throws when checksums.json is unreadable', async () => {
      const packageDir = join(tempDir, 'verify-unreadable');
      const archivePath = join(packageDir, 'bundled', ARCHIVE_NAME);
      await createArchiveFixture(archivePath);
      // No checksums.json written at all.

      await expect(
        verifyBundledChecksum(archivePath, packageDir),
      ).rejects.toThrow(/Unable to read checksums file/u);
    });

    it('throws when checksums.json is not an object', async () => {
      const packageDir = join(tempDir, 'verify-not-object');
      const archivePath = join(packageDir, 'bundled', ARCHIVE_NAME);
      await createArchiveFixture(archivePath);
      await writeChecksumsFile(packageDir, '["not", "an", "object"]');

      await expect(
        verifyBundledChecksum(archivePath, packageDir),
      ).rejects.toThrow(/must contain a JSON object/u);
    });
  });

  describe('checkAndDownloadBinaries', () => {
    const mockedDownloadToFile = jest.mocked(downloadToFile);
    const downloadUrl = new URL(
      `https://github.com/MetaMask/accounts/releases/download/speculos-v0.25.13/${ARCHIVE_NAME}`,
    );

    let packageDir: string;
    let archivePath: string;
    let cachePath: string;
    let archiveChecksum: string;

    beforeEach(async () => {
      packageDir = join(
        tempDir,
        `download-pkg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      );
      await mkdir(join(packageDir, 'bundled'), { recursive: true });
      archivePath = join(packageDir, 'bundled', ARCHIVE_NAME);
      archiveChecksum = await createArchiveFixture(archivePath);
      await writeChecksumsFile(packageDir, { [ARCHIVE_NAME]: archiveChecksum });
      cachePath = join(
        tempDir,
        `download-cache-${Math.random().toString(36).slice(2)}`,
      );
      mockedDownloadToFile.mockReset();
    });

    it('downloads, verifies, and extracts when not cached', async () => {
      const sourceArchive = archivePath;
      mockedDownloadToFile.mockImplementation(async (_url, destination) => {
        await copyFile(sourceArchive, destination);
      });

      const dir = await checkAndDownloadBinaries(
        downloadUrl,
        cachePath,
        packageDir,
      );
      const entries = await readDirEntries(dir);

      expect(mockedDownloadToFile).toHaveBeenCalledTimes(1);
      expect(mockedDownloadToFile).toHaveBeenCalledWith(
        downloadUrl,
        `${cachePath}.download.tar.gz`,
      );
      expect(entries).toContain(Binary.Speculos);
      // The temporary downloaded archive must be removed.
      await expect(stat(`${cachePath}.download.tar.gz`)).rejects.toThrow(
        /ENOENT/u,
      );
    });

    it('rejects a downloaded archive whose checksum does not match', async () => {
      await writeChecksumsFile(packageDir, {
        [ARCHIVE_NAME]: 'deadbeef',
      });
      mockedDownloadToFile.mockImplementation(async (_url, destination) => {
        await copyFile(archivePath, destination);
      });

      await expect(
        checkAndDownloadBinaries(downloadUrl, cachePath, packageDir),
      ).rejects.toThrow(/Checksum mismatch for downloaded archive/u);

      // Nothing may be left behind: no temp archive, no cache directory.
      await expect(stat(`${cachePath}.download.tar.gz`)).rejects.toThrow(
        /ENOENT/u,
      );
      await expect(stat(cachePath)).rejects.toThrow(/ENOENT/u);
    });

    it('refuses to download when no checksum is recorded for the archive', async () => {
      await writeChecksumsFile(packageDir, {
        'another-archive.tar.gz': 'abc123',
      });

      await expect(
        checkAndDownloadBinaries(downloadUrl, cachePath, packageDir),
      ).rejects.toThrow(/No checksum recorded/u);
      expect(mockedDownloadToFile).not.toHaveBeenCalled();
    });

    it('refuses to download when checksums.json is unreadable', async () => {
      await rm(join(packageDir, 'bundled', 'checksums.json'), { force: true });

      await expect(
        checkAndDownloadBinaries(downloadUrl, cachePath, packageDir),
      ).rejects.toThrow(/Unable to read checksums file/u);
      expect(mockedDownloadToFile).not.toHaveBeenCalled();
    });

    it('uses the cache without downloading when the binary exists', async () => {
      await mkdir(cachePath, { recursive: true });
      await writeFile(join(cachePath, Binary.Speculos), 'cached-payload', {
        mode: 0o755,
      });

      const dir = await checkAndDownloadBinaries(
        downloadUrl,
        cachePath,
        packageDir,
      );
      const entries = await readDirEntries(dir);

      expect(entries).toContain(Binary.Speculos);
      expect(mockedDownloadToFile).not.toHaveBeenCalled();
    });

    it('repopulates an empty cache directory instead of treating it as installed', async () => {
      await mkdir(cachePath, { recursive: true });
      mockedDownloadToFile.mockImplementation(async (_url, destination) => {
        await copyFile(archivePath, destination);
      });

      const dir = await checkAndDownloadBinaries(
        downloadUrl,
        cachePath,
        packageDir,
      );
      const entries = await readDirEntries(dir);

      expect(mockedDownloadToFile).toHaveBeenCalledTimes(1);
      expect(entries).toContain(Binary.Speculos);
    });
  });

  describe('checkAndExtractLocalBinaries', () => {
    it('extracts into an empty cache directory instead of treating it as found', async () => {
      const archivePath = join(tempDir, 'local-empty-cache.tar.gz');
      await createArchiveFixture(archivePath);
      const cachePath = join(
        tempDir,
        `local-empty-cache-${Math.random().toString(36).slice(2)}`,
      );
      // The cache directory exists but is empty — previously this was
      // mistakenly treated as an installation.
      await mkdir(cachePath, { recursive: true });

      const dir = await checkAndExtractLocalBinaries(archivePath, cachePath);
      const entries = await readDirEntries(dir);

      expect(entries).toContain(Binary.Speculos);
      const binaryStat = await stat(join(cachePath, Binary.Speculos));
      expect(binaryStat.isFile()).toBe(true);
    });

    it('uses the cache without extracting when the binary exists', async () => {
      const cachePath = join(
        tempDir,
        `local-hit-${Math.random().toString(36).slice(2)}`,
      );
      await mkdir(cachePath, { recursive: true });
      await writeFile(join(cachePath, Binary.Speculos), 'cached-payload', {
        mode: 0o755,
      });

      // The archive path is deliberately invalid: a cache hit must not
      // even attempt to read it.
      const dir = await checkAndExtractLocalBinaries(
        join(tempDir, 'does-not-exist.tar.gz'),
        cachePath,
      );
      const entries = await readDirEntries(dir);

      expect(entries).toContain(Binary.Speculos);
    });
  });

  describe('installBinaries', () => {
    it('symlinks (or copies) cached binaries into the bin directory', async () => {
      const cachePath = join(tempDir, 'install-cache');
      await mkdir(cachePath, { recursive: true });
      await writeFile(
        join(cachePath, Binary.Speculos),
        '#!/bin/sh\necho "speculos 0.25.13"\n',
        { mode: 0o755 },
      );
      const binDir = join(tempDir, 'install-bin');

      await installBinaries(await opendir(cachePath), binDir, cachePath);

      const installedStat = await stat(join(binDir, Binary.Speculos));
      expect(installedStat.isFile() || installedStat.isSymbolicLink()).toBe(
        true,
      );
    });
  });

  describe('downloadAndInstall', () => {
    it('installs from a warm cache using the bundled archive checksum', async () => {
      const cacheDir = await makeTempDir('install-cache-dir');
      const cwdDir = await makeTempDir('install-cwd');
      // downloadAndInstall() installs into the same version-named
      // directory that getSpeculosBinaryPath()/isSpeculosInstalled()
      // check, so a warm cache there short-circuits the download.
      const installDir = getInstallDir({ cacheDir });
      await mkdir(installDir, { recursive: true });
      await writeFile(
        join(installDir, Binary.Speculos),
        '#!/bin/sh\necho "speculos 0.25.13"\n',
        { mode: 0o755 },
      );

      const cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue(cwdDir);
      try {
        const binaryPath = await downloadAndInstall({ cacheDir });
        expect(binaryPath).toBe(join(installDir, Binary.Speculos));
        expect(getSpeculosBinaryPath({ cacheDir })).toBe(
          join(installDir, Binary.Speculos),
        );

        const installed = await readdir(join(cwdDir, 'node_modules', '.bin'));
        expect(installed).toContain(Binary.Speculos);
      } finally {
        cwdSpy.mockRestore();
        await rm(cacheDir, { recursive: true, force: true });
        await rm(cwdDir, { recursive: true, force: true });
      }
    }, 15000);

    it('fails closed when downloading a version with no checksum entry', async () => {
      // No bundled archive exists for this version, so the remote path is
      // taken; the archive has no entry in the real bundled/checksums.json
      // and the download must be refused before any network request.
      await expect(
        downloadAndInstall({
          version: '99.99.99',
          cacheDir: join(tempDir, 'never-created-cache'),
        }),
      ).rejects.toThrow(/No checksum recorded/u);

      await expect(stat(join(tempDir, 'never-created-cache'))).rejects.toThrow(
        /ENOENT/u,
      );
      expect(jest.mocked(downloadToFile).mock.calls).toHaveLength(0);
    }, 15000);
  });

  describe('cleanCache', () => {
    it('deletes the default cache directory', async () => {
      const cacheRoot = await makeTempDir('clean-root');
      const speculosRoot = join(cacheRoot, 'metamask', 'speculos-up');
      await mkdir(speculosRoot, { recursive: true });
      const utilsSpy = jest
        .spyOn(utils, 'getDefaultCacheDir')
        .mockReturnValue(speculosRoot);

      try {
        await cleanCache();
        await expect(stat(speculosRoot)).rejects.toThrow(/ENOENT/u);
      } finally {
        utilsSpy.mockRestore();
        await rm(cacheRoot, { recursive: true, force: true });
      }
    });

    it('deletes a cache directory inside the cache root', async () => {
      const cacheRoot = await makeTempDir('clean-inside-root');
      const speculosRoot = join(cacheRoot, 'metamask', 'speculos-up');
      const target = join(speculosRoot, 'some-hash');
      await mkdir(target, { recursive: true });
      await writeFile(join(target, 'speculos'), 'payload');
      const utilsSpy = jest
        .spyOn(utils, 'getDefaultCacheDir')
        .mockReturnValue(speculosRoot);

      try {
        await cleanCache({ cacheDir: target });
        await expect(stat(target)).rejects.toThrow(/ENOENT/u);
      } finally {
        utilsSpy.mockRestore();
        await rm(cacheRoot, { recursive: true, force: true });
      }
    });

    it('refuses to delete a directory outside the cache root', async () => {
      const cacheRoot = await makeTempDir('clean-outside-root');
      const speculosRoot = join(cacheRoot, 'metamask', 'speculos-up');
      const victim = join(cacheRoot, 'important-data');
      await mkdir(victim, { recursive: true });
      await writeFile(join(victim, 'do-not-delete.txt'), 'important');
      const utilsSpy = jest
        .spyOn(utils, 'getDefaultCacheDir')
        .mockReturnValue(speculosRoot);

      try {
        await expect(cleanCache({ cacheDir: victim })).rejects.toThrow(
          /outside the speculos-up cache root/u,
        );
        // The directory must still exist.
        expect(await stat(join(victim, 'do-not-delete.txt'))).toBeDefined();
      } finally {
        utilsSpy.mockRestore();
        await rm(cacheRoot, { recursive: true, force: true });
      }
    });

    it('refuses to delete a directory reached via traversal outside the cache root', async () => {
      const cacheRoot = await makeTempDir('clean-traversal-root');
      const speculosRoot = join(cacheRoot, 'metamask', 'speculos-up');
      const utilsSpy = jest
        .spyOn(utils, 'getDefaultCacheDir')
        .mockReturnValue(speculosRoot);

      try {
        await expect(
          cleanCache({ cacheDir: join(speculosRoot, '..', '..', 'elsewhere') }),
        ).rejects.toThrow(/outside the speculos-up cache root/u);
      } finally {
        utilsSpy.mockRestore();
        await rm(cacheRoot, { recursive: true, force: true });
      }
    });
  });
});
