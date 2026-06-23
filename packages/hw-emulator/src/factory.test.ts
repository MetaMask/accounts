import { createEmulator } from './factory';
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
      docker: { start: async () => {}, stop: async () => {} },
      controller: {
        connect: async () => {}, disconnect: async () => {},
        ping: async () => ({}),
        emulatorStart: async () => ({}),
        emulatorSetup: async () => ({}),
        bridgeStart: async () => ({}),
        pressYes: async () => ({}), pressNo: async () => ({}),
        click: async () => ({}), swipe: async () => ({}),
        input: async () => ({}), getScreenshot: async () => Buffer.alloc(0),
      },
      sidecarManager: { start: async () => {}, stop: async () => {}, isRunning: () => false },
    } as Record<string, unknown>);
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
