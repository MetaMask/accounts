import { EmulatorType } from './types';
import type {
  EmulatorType as EmulatorTypeValue,
  HardwareWalletEmulator,
} from './types';
import type { SpeculosOptions } from './ledger/speculos';
import { Speculos } from './ledger/speculos';

export type { HardwareWalletEmulator, DeviceInteraction } from './types';

export function createEmulator(
  type: typeof EmulatorType.Ledger,
  options?: SpeculosOptions,
): HardwareWalletEmulator;
export function createEmulator(
  type: EmulatorTypeValue,
  options?: Record<string, unknown>,
): HardwareWalletEmulator;
export function createEmulator(
  type: EmulatorTypeValue,
  options?: Record<string, unknown>,
): HardwareWalletEmulator {
  switch (type) {
    case EmulatorType.Ledger:
      return new Speculos(options as SpeculosOptions);
    case EmulatorType.Trezor:
      throw new Error('Trezor emulator is not yet implemented');
    default:
      throw new Error(`Unknown emulator type: ${String(type)}`);
  }
}
