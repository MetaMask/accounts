import { SpeculosBleRunner } from './speculos-ble-runner';

describe('SpeculosBleRunner', () => {
  describe('static methods', () => {
    it('resolves pythonDir to a path containing speculos_ble source', () => {
      const dir = SpeculosBleRunner.pythonDir;
      expect(dir).toContain('python_src');
    });

    it('resolves packageDir to the package root', () => {
      const dir = SpeculosBleRunner.packageDir;
      expect(dir).not.toContain('dist');
    });

    it('resolves venvPython to a .venv/bin/python path', () => {
      const py = SpeculosBleRunner.venvPython;
      expect(py).toMatch(/\.venv[\\/]bin[\\/]python$/);
    });

    it('isVenvReady returns a boolean', () => {
      expect(typeof SpeculosBleRunner.isVenvReady()).toBe('boolean');
    });

    it('honors SPECULOS_BLE_PACKAGE_DIR to relocate packageDir/pythonDir', () => {
      const origPkg = process.env.SPECULOS_BLE_PACKAGE_DIR;
      const origVenv = process.env.SPECULOS_BLE_VENV_DIR;
      try {
        process.env.SPECULOS_BLE_PACKAGE_DIR = '/tmp/fake-pkg';
        expect(SpeculosBleRunner.packageDir).toBe('/tmp/fake-pkg');
        expect(SpeculosBleRunner.pythonDir).toBe('/tmp/fake-pkg/python_src');
        // venv follows packageDir by default
        expect(SpeculosBleRunner.venvPython).toBe(
          '/tmp/fake-pkg/.venv/bin/python',
        );
      } finally {
        if (origPkg === undefined) {
          delete process.env.SPECULOS_BLE_PACKAGE_DIR;
        } else {
          process.env.SPECULOS_BLE_PACKAGE_DIR = origPkg;
        }
        if (origVenv === undefined) {
          delete process.env.SPECULOS_BLE_VENV_DIR;
        } else {
          process.env.SPECULOS_BLE_VENV_DIR = origVenv;
        }
      }
    });

    it('honors SPECULOS_BLE_VENV_DIR to relocate the venv independently', () => {
      const origPkg = process.env.SPECULOS_BLE_PACKAGE_DIR;
      const origVenv = process.env.SPECULOS_BLE_VENV_DIR;
      try {
        process.env.SPECULOS_BLE_PACKAGE_DIR = '/tmp/fake-pkg';
        process.env.SPECULOS_BLE_VENV_DIR = '/tmp/fake-venv';
        expect(SpeculosBleRunner.venvDir).toBe('/tmp/fake-venv');
        expect(SpeculosBleRunner.venvPython).toBe('/tmp/fake-venv/bin/python');
      } finally {
        if (origPkg === undefined) {
          delete process.env.SPECULOS_BLE_PACKAGE_DIR;
        } else {
          process.env.SPECULOS_BLE_PACKAGE_DIR = origPkg;
        }
        if (origVenv === undefined) {
          delete process.env.SPECULOS_BLE_VENV_DIR;
        } else {
          process.env.SPECULOS_BLE_VENV_DIR = origVenv;
        }
      }
    });
  });

  describe('constructor', () => {
    it('applies default configuration', () => {
      const runner = new SpeculosBleRunner();
      expect(runner.host).toBe('127.0.0.1');
      expect(runner.controlApiPort).toBe(5002);
    });

    it('overrides defaults with provided options', () => {
      const runner = new SpeculosBleRunner({
        speculosHost: '10.0.0.1',
        controlApiPort: 9999,
      });
      expect(runner.host).toBe('10.0.0.1');
      expect(runner.controlApiPort).toBe(9999);
    });

    it('accepts an onLog callback without error', () => {
      const runner = new SpeculosBleRunner({ onLog: () => undefined });
      expect(runner).toBeInstanceOf(SpeculosBleRunner);
    });
  });

  describe('isRunning', () => {
    it('returns false before start() is called', () => {
      const runner = new SpeculosBleRunner();
      expect(runner.isRunning).toBe(false);
    });
  });

  describe('disconnectBle', () => {
    it('does not throw when the control API is unreachable', async () => {
      const runner = new SpeculosBleRunner({ controlApiPort: 1 });
      await expect(runner.disconnectBle()).resolves.not.toThrow();
    });
  });
});
