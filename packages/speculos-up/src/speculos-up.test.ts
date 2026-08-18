import { createHash } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { getInstallDir, getSpeculosBinaryPath, isSpeculosInstalled } from '.';
import { Architecture, Platform } from './types';
import {
  computeFileSha256,
  getDefaultCacheDir,
  getDefaultVersion,
  getDefaultRepo,
  getBinaryArchiveUrl,
  getBundledArchivePath,
  getRequiredChecksum,
  getVersion,
  isPathWithin,
  loadChecksumsFile,
  normalizeSystemArchitecture,
} from './utils';

/**
 * Run a callback with XDG_CACHE_HOME temporarily overridden.
 *
 * @param value - The temporary value for XDG_CACHE_HOME.
 * @param callback - The callback to run.
 * @returns The callback's return value.
 */
function withXdgCacheHome(value: string, callback: () => void): void {
  // eslint-disable-next-line n/no-process-env
  const previous = process.env.XDG_CACHE_HOME;
  // eslint-disable-next-line n/no-process-env
  process.env.XDG_CACHE_HOME = value;
  try {
    return callback();
  } finally {
    // eslint-disable-next-line n/no-process-env
    process.env.XDG_CACHE_HOME = previous;
  }
}

describe('speculos-up', () => {
  describe('getDefaultVersion', () => {
    it('returns a version string', () => {
      const version = getDefaultVersion();
      expect(version).toMatch(/^\d+\.\d+\.\d+$/u);
    });
  });

  describe('getDefaultRepo', () => {
    it('returns MetaMask/accounts', () => {
      expect(getDefaultRepo()).toBe('MetaMask/accounts');
    });
  });

  describe('normalizeSystemArchitecture', () => {
    it('returns Arm64 for arm64 input', () => {
      expect(normalizeSystemArchitecture('arm64')).toBe(Architecture.Arm64);
    });

    it('returns Arm64 for aarch64 input', () => {
      expect(normalizeSystemArchitecture('aarch64')).toBe(Architecture.Arm64);
    });

    it('returns Amd64 for x64 input', () => {
      expect(normalizeSystemArchitecture('x64')).toBe(Architecture.Amd64);
    });

    it('returns Amd64 for amd64 input', () => {
      expect(normalizeSystemArchitecture('amd64')).toBe(Architecture.Amd64);
    });

    it.each(['arm', 'armv7l', 'ia32', 'ppc64', 's390x', 'unknown'])(
      'throws for unsupported architecture %s',
      (architecture) => {
        expect(() => normalizeSystemArchitecture(architecture)).toThrow(
          `Unsupported system architecture "${architecture}"`,
        );
      },
    );
  });

  describe('getDefaultCacheDir', () => {
    it('returns a path containing speculos-up', () => {
      expect(getDefaultCacheDir()).toContain('speculos-up');
    });

    it('honors an absolute XDG_CACHE_HOME', () => {
      withXdgCacheHome('/tmp/xdg-cache', () => {
        expect(getDefaultCacheDir()).toBe(
          '/tmp/xdg-cache/metamask/speculos-up',
        );
      });
    });

    it('ignores a relative XDG_CACHE_HOME', () => {
      withXdgCacheHome('relative/cache', () => {
        expect(getDefaultCacheDir()).toContain('.cache');
      });
    });
  });

  describe('getBinaryArchiveUrl', () => {
    it('generates the correct URL', () => {
      const url = getBinaryArchiveUrl(
        'MetaMask/accounts',
        '0.25.13',
        Platform.Linux,
        'amd64',
      );
      expect(url).toBe(
        'https://github.com/MetaMask/accounts/releases/download/speculos-v0.25.13/speculos-v0.25.13-linux-amd64.tar.gz',
      );
    });

    it('always generates an https URL', () => {
      const url = getBinaryArchiveUrl(
        'some/repo',
        '1.0.0',
        Platform.Linux,
        'arm64',
      );
      expect(url.startsWith('https://')).toBe(true);
    });
  });

  describe('computeFileSha256', () => {
    it('computes the SHA-256 checksum of a file', async () => {
      const tempDir = await mkdtemp(join(tmpdir(), 'speculos-up-sha-'));
      try {
        const filePath = join(tempDir, 'file.txt');
        await writeFile(filePath, 'hello');
        const expected = createHash('sha256').update('hello').digest('hex');
        expect(await computeFileSha256(filePath)).toBe(expected);
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    });

    it('throws when the file does not exist', async () => {
      await expect(
        computeFileSha256('/nonexistent/speculos-up/file.txt'),
      ).rejects.toThrow(/ENOENT/u);
    });
  });

  describe('loadChecksumsFile', () => {
    it('loads a valid checksums file', async () => {
      const tempDir = await mkdtemp(join(tmpdir(), 'speculos-up-cs-'));
      try {
        const checksumsPath = join(tempDir, 'checksums.json');
        await writeFile(checksumsPath, '{"archive.tar.gz": "abc123"}');
        expect(await loadChecksumsFile(checksumsPath)).toStrictEqual({
          'archive.tar.gz': 'abc123',
        });
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    });

    it('throws when the file is missing', async () => {
      await expect(
        loadChecksumsFile('/nonexistent/speculos-up/checksums.json'),
      ).rejects.toThrow(/Unable to read checksums file/u);
    });

    it('throws when the file is not valid JSON', async () => {
      const tempDir = await mkdtemp(join(tmpdir(), 'speculos-up-cs-'));
      try {
        const checksumsPath = join(tempDir, 'checksums.json');
        await writeFile(checksumsPath, '{ oops');
        await expect(loadChecksumsFile(checksumsPath)).rejects.toThrow(
          /not valid JSON/u,
        );
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    });

    it('throws when the JSON is not an object', async () => {
      const tempDir = await mkdtemp(join(tmpdir(), 'speculos-up-cs-'));
      try {
        const checksumsPath = join(tempDir, 'checksums.json');
        await writeFile(checksumsPath, '["array"]');
        await expect(loadChecksumsFile(checksumsPath)).rejects.toThrow(
          /must contain a JSON object/u,
        );
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    });

    it('throws when a checksum value is not a string', async () => {
      const tempDir = await mkdtemp(join(tmpdir(), 'speculos-up-cs-'));
      try {
        const checksumsPath = join(tempDir, 'checksums.json');
        await writeFile(checksumsPath, '{"archive.tar.gz": 42}');
        await expect(loadChecksumsFile(checksumsPath)).rejects.toThrow(
          /invalid checksum for "archive\.tar\.gz"/u,
        );
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe('getRequiredChecksum', () => {
    it('returns the checksum for a known archive', async () => {
      const tempDir = await mkdtemp(join(tmpdir(), 'speculos-up-req-'));
      try {
        const checksumsPath = join(tempDir, 'checksums.json');
        await writeFile(checksumsPath, '{"archive.tar.gz": "abc123"}');
        expect(await getRequiredChecksum(checksumsPath, 'archive.tar.gz')).toBe(
          'abc123',
        );
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    });

    it('throws when no checksum is recorded for the archive', async () => {
      const tempDir = await mkdtemp(join(tmpdir(), 'speculos-up-req-'));
      try {
        const checksumsPath = join(tempDir, 'checksums.json');
        await writeFile(checksumsPath, '{"other.tar.gz": "abc123"}');
        await expect(
          getRequiredChecksum(checksumsPath, 'archive.tar.gz'),
        ).rejects.toThrow(
          /No checksum recorded for "archive\.tar\.gz".*refusing to install/u,
        );
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe('getVersion', () => {
    it('wraps errors when the binary cannot be executed', async () => {
      const tempDir = await mkdtemp(join(tmpdir(), 'speculos-up-ver-'));
      try {
        const filePath = join(tempDir, 'speculos');
        await writeFile(filePath, 'not executable', { mode: 0o644 });
        expect(() => getVersion(filePath)).toThrow(
          /Failed to get version for/u,
        );
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe('isPathWithin', () => {
    it('accepts the root itself', () => {
      expect(isPathWithin('/tmp/cache', '/tmp/cache')).toBe(true);
    });

    it('accepts paths inside the root', () => {
      expect(isPathWithin('/tmp/cache', '/tmp/cache/child/grandchild')).toBe(
        true,
      );
    });

    it('rejects sibling paths', () => {
      expect(isPathWithin('/tmp/cache', '/tmp/cache-evil')).toBe(false);
    });

    it('rejects paths outside the root', () => {
      expect(isPathWithin('/tmp/cache', '/tmp/elsewhere')).toBe(false);
    });

    it('rejects traversal attempts', () => {
      expect(isPathWithin('/tmp/cache', '/tmp/cache/../../etc')).toBe(false);
    });

    it('rejects completely unrelated absolute paths', () => {
      expect(isPathWithin('/tmp/cache', '/etc/passwd')).toBe(false);
    });
  });

  describe('getBundledArchivePath', () => {
    it('returns a path for a bundled archive that exists', () => {
      const packageDir = join(__dirname, '..');
      const result = getBundledArchivePath(
        '0.25.13',
        Platform.Linux,
        Architecture.Amd64,
        packageDir,
      );
      expect(result).toMatch(
        /bundled\/speculos-v0\.25\.13-linux-amd64\.tar\.gz$/u,
      );
    });

    it('returns null for a version that has no bundle', () => {
      const packageDir = join(__dirname, '..');
      const result = getBundledArchivePath(
        '99.99.99',
        Platform.Linux,
        Architecture.Amd64,
        packageDir,
      );
      expect(result).toBeNull();
    });
  });

  describe('getInstallDir', () => {
    it('includes version, platform, and arch', () => {
      const dir = getInstallDir();
      expect(dir).toContain('speculos-0.25.13');
      expect(dir).toContain('linux');
    });

    it('uses custom cache dir', () => {
      const dir = getInstallDir({
        cacheDir: '/tmp/test',
        arch: Architecture.Amd64,
      });
      expect(dir).toBe('/tmp/test/speculos-0.25.13-linux-amd64');
    });

    it('uses custom version and arch', () => {
      const dir = getInstallDir({ version: '1.0.0', arch: Architecture.Arm64 });
      expect(dir).toContain('speculos-1.0.0-linux-arm64');
    });
  });

  describe('getSpeculosBinaryPath', () => {
    it('returns null when the managed binary is not installed', () => {
      const options = { cacheDir: '/tmp/nonexistent-speculos-up-test' };
      expect(isSpeculosInstalled(options)).toBe(false);
      expect(getSpeculosBinaryPath(options)).toBeNull();
    });
  });

  describe('isSpeculosInstalled', () => {
    it('returns false for non-existent path', () => {
      const result = isSpeculosInstalled({
        cacheDir: '/tmp/nonexistent-speculos-up-test',
      });
      expect(result).toBe(false);
    });
  });
});
