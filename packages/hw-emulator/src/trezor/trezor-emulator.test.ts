import type { TrezorControllerClient } from './controller-client';
import type { TrezorDockerManager } from './docker-manager';
import type { TrezorSidecarManager } from './sidecar-manager';
import { TrezorEmulator } from './trezor-emulator';

function stubOf<TManager>(shape: Partial<TManager> = {}): TManager {
  return shape as TManager;
}

describe('TrezorEmulator', () => {
  it('start() brings up docker, controller-setup, and the sidecar in order', async () => {
    const order: string[] = [];
    const docker = stubOf<TrezorDockerManager>({
      start: async () => {
        order.push('docker');
      },
      stop: async () => undefined,
    });
    const ctl = stubOf<TrezorControllerClient>({
      connect: async () => {
        order.push('ctl-connect');
      },
      ping: async () => {
        order.push('ping');
        return {};
      },
      emulatorStart: async () => {
        order.push('emu-start');
        return {};
      },
      emulatorSetup: async () => {
        order.push('emu-setup');
        return {};
      },
      bridgeStart: async () => {
        order.push('bridge-start');
        return {};
      },
      disconnect: async () => undefined,
      pressYes: async () => ({}),
      pressNo: async () => ({}),
      click: async () => ({}),
      swipe: async () => ({}),
      input: async () => ({}),
      getScreenshot: async () => Buffer.alloc(0),
    });
    const sidecar = stubOf<TrezorSidecarManager>({
      start: async () => {
        order.push('sidecar');
      },
      stop: async () => undefined,
      isRunning: () => true,
    });

    const emu = new TrezorEmulator({
      model: 'T2T1',
      docker,
      controller: ctl,
      sidecarManager: sidecar,
      composeFile: '/tmp/x.yml',
    });
    await emu.start();
    expect(order).toStrictEqual([
      'docker',
      'ctl-connect',
      'ping',
      'emu-start',
      'emu-setup',
      'bridge-start',
      'sidecar',
    ]);
  }, 15_000);

  it('stops the Docker stack when the controller never becomes available', async () => {
    const dockerStop = jest.fn(async () => undefined);
    const docker = stubOf<TrezorDockerManager>({
      start: async () => undefined,
      stop: dockerStop,
    });
    const ctl = stubOf<TrezorControllerClient>({
      connect: async () => {
        throw new Error('connection refused');
      },
      ping: async () => {
        throw new Error('connection refused');
      },
      disconnect: async () => undefined,
    });

    const emu = new TrezorEmulator({
      model: 'T2T1',
      docker,
      controller: ctl,
      sidecarManager: stubOf<TrezorSidecarManager>(),
      composeFile: '/tmp/x.yml',
    });

    jest.useFakeTimers();
    try {
      let caught: Error | undefined;
      const startPromise = emu
        .start()
        .then(() => undefined)
        .catch((error: Error) => {
          caught = error;
        });
      // Fast-forward through the 60 × 2s retry loop.
      await jest.advanceTimersByTimeAsync(120_000);
      await startPromise;

      expect(caught).toBeInstanceOf(Error);
      expect(caught?.message).toBe('Controller not reachable within 120s');
      expect(emu.isRunning()).toBe(false);
      expect(dockerStop).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('getModel returns the configured model', () => {
    const emu = new TrezorEmulator({
      model: 'T1B1',
      docker: stubOf<TrezorDockerManager>(),
      controller: stubOf<TrezorControllerClient>(),
      sidecarManager: stubOf<TrezorSidecarManager>(),
      composeFile: '/tmp/x.yml',
    });
    expect(emu.getModel()).toBe('T1B1');
  });

  it('constructs with defaults when no mocks are injected', () => {
    const emu = new TrezorEmulator({
      composeFile: '/tmp/x.yml',
    });
    expect(emu.getModel()).toBe('T2T1');
    expect(emu.isRunning()).toBe(false);
  });

  it('rejects construction without composeFile when no docker manager is injected', () => {
    expect(() => new TrezorEmulator({})).toThrow(/composeFile/u);
  });

  it('allows a missing composeFile when a docker manager is injected', () => {
    const emu = new TrezorEmulator({
      docker: stubOf<TrezorDockerManager>(),
      controller: stubOf<TrezorControllerClient>(),
      sidecarManager: stubOf<TrezorSidecarManager>(),
    });
    expect(emu.isRunning()).toBe(false);
  });
});
