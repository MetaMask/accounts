import { join } from 'node:path';

import { getInstallDir, getSpeculosBinaryPath, isSpeculosInstalled } from '.';
import { Architecture, Platform } from './types';
import {
  getDefaultCacheDir,
  getDefaultVersion,
  getDefaultRepo,
  getBinaryArchiveUrl,
  getBundledArchivePath,
  getBundledChecksum,
  normalizeSystemArchitecture,
} from './utils';

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

    it('returns Amd64 for x64 input', () => {
      expect(normalizeSystemArchitecture('x64')).toBe(Architecture.Amd64);
    });
  });

  describe('getDefaultCacheDir', () => {
    it('returns a path containing speculos-up', () => {
      expect(getDefaultCacheDir()).toContain('speculos-up');
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
  });

  describe('getBundledChecksum', () => {
    it('looks up checksums by archive filename, not full path', () => {
      const checksums = {
        'speculos-v0.25.13-linux-amd64.tar.gz': 'abc123',
      };
      expect(
        getBundledChecksum(
          '/some/package/bundled/speculos-v0.25.13-linux-amd64.tar.gz',
          checksums,
        ),
      ).toBe('abc123');
    });

    it('returns undefined when no checksum exists for the archive', () => {
      expect(
        getBundledChecksum('/path/speculos-v99.tar.gz', {}),
      ).toBeUndefined();
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
