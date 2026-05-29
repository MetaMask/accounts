import { getInstallDir, getSpeculosBinaryPath, isSpeculosInstalled } from '.';
import { Architecture, Platform } from './types';
import {
  getDefaultCacheDir,
  getDefaultVersion,
  getDefaultRepo,
  getBinaryArchiveUrl,
  normalizeSystemArchitecture,
} from './utils';

describe('speculosup', () => {
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
    it('returns a path containing speculosup', () => {
      expect(getDefaultCacheDir()).toContain('speculosup');
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
    it('returns a path containing speculos', () => {
      const path = getSpeculosBinaryPath();
      expect(path).toContain('speculos');
      expect(path).not.toBeNull();
    });
  });

  describe('isSpeculosInstalled', () => {
    it('returns false for non-existent path', () => {
      const result = isSpeculosInstalled({
        cacheDir: '/tmp/nonexistent-speculosup-test',
      });
      expect(result).toBe(false);
    });
  });
});
