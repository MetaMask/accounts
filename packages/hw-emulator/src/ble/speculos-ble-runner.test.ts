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
