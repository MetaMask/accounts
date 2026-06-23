import { TrezorEmulator } from './trezor-emulator';
import type { TrezorDockerManager } from './docker-manager';
import type { TrezorControllerClient } from './controller-client';
import type { TrezorSidecarManager } from './sidecar-manager';

function stub<T>(shape: Partial<T> = {}): T {
  return shape as T;
}

describe('TrezorEmulator', () => {
  it('start() brings up docker, controller-setup, and the sidecar in order', async () => {
    const order: string[] = [];
    const docker = stub<TrezorDockerManager>({
      start: async () => { order.push('docker'); },
      stop: async () => {},
    });
    const ctl = stub<TrezorControllerClient>({
      connect: async () => { order.push('ctl-connect'); },
      ping: async () => { order.push('ping'); return {}; },
      emulatorStart: async () => { order.push('emu-start'); return {}; },
      emulatorSetup: async () => { order.push('emu-setup'); return {}; },
      bridgeStart: async () => { order.push('bridge-start'); return {}; },
      disconnect: async () => {},
      pressYes: async () => ({}),
      pressNo: async () => ({}),
      click: async () => ({}),
      swipe: async () => ({}),
      input: async () => ({}),
      getScreenshot: async () => Buffer.alloc(0),
    });
    const sidecar = stub<TrezorSidecarManager>({
      start: async () => { order.push('sidecar'); },
      stop: async () => {},
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
    expect(order).toEqual([
      'docker',
      'ctl-connect',
      'ping',
      'emu-start',
      'emu-setup',
      'bridge-start',
      'sidecar',
    ]);
  });

  it('getModel returns the configured model', () => {
    const emu = new TrezorEmulator({
      model: 'T1B1',
      docker: stub(),
      controller: stub(),
      sidecarManager: stub(),
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
});
