import { createEmulator } from './factory';
import type { TrezorEmulatorOptions } from './trezor';
import type { TrezorDockerManager } from './trezor';
import type { TrezorControllerClient } from './trezor';
import type { TrezorSidecarManager } from './trezor';
import { EmulatorType } from './types';
import type { EmulatorType as EmulatorTypeValue } from './types';

describe('createEmulator', () => {
  it('creates a Ledger emulator', () => {
    const emu = createEmulator(EmulatorType.Ledger);
    expect(emu).toBeDefined();
    expect(emu.isRunning()).toBe(false);
  });

  it('creates a Ledger emulator with options', () => {
    const emu = createEmulator(EmulatorType.Ledger, { device: 'nanosp' });
    expect(emu).toBeDefined();
    expect(emu.isRunning()).toBe(false);
  });

  it('creates a Ledger emulator from an EmulatorType value', () => {
    const type: EmulatorTypeValue = EmulatorType.Ledger;

    const emu = createEmulator(type);

    expect(emu).toBeDefined();
    expect(emu.isRunning()).toBe(false);
  });

  it('creates a Trezor emulator with mock injections', () => {
    const emu = createEmulator(EmulatorType.Trezor, {
      docker: { start: jest.fn(), stop: jest.fn() },
      controller: {
        connect: jest.fn(),
        disconnect: jest.fn(),
        ping: jest.fn(),
        emulatorStart: jest.fn(),
        emulatorSetup: jest.fn(),
        bridgeStart: jest.fn(),
        pressYes: jest.fn(),
        pressNo: jest.fn(),
        click: jest.fn(),
        swipe: jest.fn(),
        input: jest.fn(),
        getScreenshot: jest.fn(),
      },
      sidecarManager: {
        start: jest.fn(),
        stop: jest.fn(),
        isRunning: () => false,
      },
    } as Record<string, unknown>);
    expect(emu).toBeDefined();
    expect(emu.isRunning()).toBe(false);
  });

  it('creates a Trezor emulator from typed TrezorEmulatorOptions', () => {
    const options: TrezorEmulatorOptions = {
      model: 'T2T1',
      seed: 'test seed words',
      label: 'test trezor',
      docker: {
        start: jest.fn(),
        stop: jest.fn(),
      } as unknown as TrezorDockerManager,
      controller: {
        connect: jest.fn(),
        disconnect: jest.fn(),
        ping: jest.fn(),
        emulatorStart: jest.fn(),
        emulatorSetup: jest.fn(),
        bridgeStart: jest.fn(),
        pressYes: jest.fn(),
        pressNo: jest.fn(),
        click: jest.fn(),
        swipe: jest.fn(),
        input: jest.fn(),
        getScreenshot: jest.fn(),
      } as unknown as TrezorControllerClient,
      sidecarManager: {
        start: jest.fn(),
        stop: jest.fn(),
        isRunning: () => false,
      } as TrezorSidecarManager,
    };

    // This resolves through the Trezor-specific overload (no `unknown` cast).
    const emu = createEmulator(EmulatorType.Trezor, options);
    expect(emu).toBeDefined();
    expect(emu.isRunning()).toBe(false);
  });

  it('throws for unknown emulator type', () => {
    expect(() =>
      createEmulator('unknown' as typeof EmulatorType.Ledger),
    ).toThrow('Unknown emulator type');
  });

  it('returns an emulator with the HardwareWalletEmulator interface', () => {
    const emu = createEmulator(EmulatorType.Ledger);
    expect(typeof emu.start).toBe('function');
    expect(typeof emu.stop).toBe('function');
    expect(typeof emu.isRunning).toBe('function');
    expect(typeof emu.getInteraction).toBe('function');
    expect(typeof emu.approveTransaction).toBe('function');
    expect(typeof emu.approveSigning).toBe('function');
    expect(typeof emu.rejectTransaction).toBe('function');
    expect(typeof emu.navigateToMainMenu).toBe('function');
  });
});
