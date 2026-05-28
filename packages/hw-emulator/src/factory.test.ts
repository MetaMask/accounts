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

  it('throws for trezor (not yet implemented)', () => {
    expect(() => createEmulator(EmulatorType.Trezor)).toThrow(
      'Trezor emulator is not yet implemented',
    );
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
