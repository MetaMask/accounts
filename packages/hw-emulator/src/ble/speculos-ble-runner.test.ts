/* eslint-disable n/no-sync -- synchronous fs is acceptable for temp-file test fixtures. */
/* eslint-disable n/no-process-env -- tests read/write relocation env vars. */
/* eslint-disable require-unicode-regexp -- pre-existing path regexes. */
/* eslint-disable jest/no-restricted-matchers -- `.resolves`/`.rejects` are used for clarity. */
import childProcess from 'child_process';
import type { ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

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
      const runner = new SpeculosBleRunner({ onLog: (): void => undefined });
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

  describe('setupVenv', () => {
    it('runs setup-python.sh via execFileSync without a shell', () => {
      const fixtureDir = mkdtempSync(path.join(tmpdir(), 'ble-venv-'));
      const scriptsDir = path.join(fixtureDir, 'scripts');
      mkdirSync(scriptsDir);
      writeFileSync(path.join(scriptsDir, 'setup-python.sh'), '#!/bin/sh\n', {
        mode: 0o755,
      });

      const execFileSyncSpy = jest
        .spyOn(childProcess, 'execFileSync')
        .mockReturnValue('');

      const origDir = process.env.SPECULOS_BLE_PACKAGE_DIR;
      try {
        process.env.SPECULOS_BLE_PACKAGE_DIR = fixtureDir;
        SpeculosBleRunner.setupVenv();

        expect(execFileSyncSpy).toHaveBeenCalledTimes(1);
        expect(execFileSyncSpy).toHaveBeenCalledWith(
          'bash',
          [path.join(fixtureDir, 'scripts', 'setup-python.sh')],
          { stdio: 'inherit' },
        );
      } finally {
        if (origDir === undefined) {
          delete process.env.SPECULOS_BLE_PACKAGE_DIR;
        } else {
          process.env.SPECULOS_BLE_PACKAGE_DIR = origDir;
        }
        execFileSyncSpy.mockRestore();
        rmSync(fixtureDir, { recursive: true, force: true });
      }
    });
  });

  describe('isControlApiReady', () => {
    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = originalFetch;
      jest.useRealTimers();
    });

    it('clears the abort timer when the fetch rejects', async () => {
      jest.useFakeTimers();
      global.fetch = jest
        .fn()
        .mockRejectedValue(
          new Error('network down'),
        ) as unknown as typeof fetch;

      const runner = new SpeculosBleRunner();
      await expect(runner.isControlApiReady()).resolves.toBe(false);

      expect(jest.getTimerCount()).toBe(0);
    });

    it('clears the abort timer when the API reports ready', async () => {
      jest.useFakeTimers();
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'ready' }),
      }) as unknown as typeof fetch;

      const runner = new SpeculosBleRunner();
      await expect(runner.isControlApiReady()).resolves.toBe(true);

      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe('stop', () => {
    function createFakeChildProcess(): ChildProcess & {
      emitExit: () => void;
    } {
      const emitter = new EventEmitter();
      const fake = emitter as unknown as ChildProcess & {
        emitExit: () => void;
      };
      // eslint-disable-next-line jest/prefer-spy-on -- kill does not exist on the EventEmitter.
      fake.kill = jest.fn();
      // Mark the process as still running (exitCode/signalCode are null until
      // the process exits) so stop() actually attempts to signal it.
      Object.assign(fake, { exitCode: null, signalCode: null });
      fake.emitExit = (): void => {
        emitter.emit('exit', 0, 'SIGTERM');
      };
      return fake;
    }

    function createVenv(): string {
      const dir = mkdtempSync(path.join(tmpdir(), 'ble-run-'));
      const bin = path.join(dir, 'bin');
      mkdirSync(bin);
      writeFileSync(path.join(bin, 'python'), '#!/bin/sh\n', { mode: 0o755 });
      return dir;
    }

    afterEach(() => {
      jest.restoreAllMocks();
      jest.useRealTimers();
    });

    it('resolves without throwing when the child process already exited', async () => {
      const venvDir = createVenv();
      const origVenv = process.env.SPECULOS_BLE_VENV_DIR;
      try {
        process.env.SPECULOS_BLE_VENV_DIR = venvDir;
        const fake = createFakeChildProcess();
        // kill() throws, simulating an already-exited process.
        (fake.kill as jest.Mock).mockImplementation(() => {
          throw new Error('process already exited');
        });
        jest
          .spyOn(childProcess, 'spawn')
          .mockReturnValue(fake as unknown as ChildProcess);

        const runner = new SpeculosBleRunner();
        runner.start();

        await expect(runner.stop()).resolves.not.toThrow();
        expect(runner.isRunning).toBe(false);
      } finally {
        if (origVenv === undefined) {
          delete process.env.SPECULOS_BLE_VENV_DIR;
        } else {
          // eslint-disable-next-line require-atomic-updates -- env save/restore test fixture.
          process.env.SPECULOS_BLE_VENV_DIR = origVenv;
        }
        rmSync(venvDir, { recursive: true, force: true });
      }
    });

    it('clears the SIGKILL timer when the process exits gracefully', async () => {
      jest.useFakeTimers();
      const venvDir = createVenv();
      const origVenv = process.env.SPECULOS_BLE_VENV_DIR;
      try {
        process.env.SPECULOS_BLE_VENV_DIR = venvDir;
        const fake = createFakeChildProcess();
        jest
          .spyOn(childProcess, 'spawn')
          .mockReturnValue(fake as unknown as ChildProcess);

        const runner = new SpeculosBleRunner();
        runner.start();

        const stopPromise = runner.stop();
        // The process exits before the 5s SIGKILL fallback fires.
        fake.emitExit();
        await stopPromise;

        expect(fake.kill).toHaveBeenCalledWith('SIGTERM');
        // No dangling SIGKILL timer remains.
        expect(jest.getTimerCount()).toBe(0);
      } finally {
        if (origVenv === undefined) {
          delete process.env.SPECULOS_BLE_VENV_DIR;
        } else {
          // eslint-disable-next-line require-atomic-updates -- env save/restore test fixture.
          process.env.SPECULOS_BLE_VENV_DIR = origVenv;
        }
        rmSync(venvDir, { recursive: true, force: true });
      }
    });
  });
});
