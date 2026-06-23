import type { SpeculosOptions } from './ledger/speculos';
import { Speculos } from './ledger/speculos';
import type { QrEmulatorOptions } from './qr';
import { QrEmulator } from './qr';
import type { TrezorEmulatorOptions } from './trezor';
import { TrezorEmulator } from './trezor';
import { EmulatorType } from './types';
import type {
  EmulatorType as EmulatorTypeValue,
  HardwareWalletEmulator,
} from './types';

export type { HardwareWalletEmulator, DeviceInteraction } from './types';

/**
 * Create a hardware wallet emulator instance.
 *
 * @param type - The emulator type to create.
 * @param options - Emulator-specific configuration options.
 * @returns A HardwareWalletEmulator instance.
 * @throws If the emulator type is not supported.
 */
export function createEmulator(
  type: typeof EmulatorType.Ledger,
  options?: SpeculosOptions,
): HardwareWalletEmulator;
export function createEmulator(
  type: typeof EmulatorType.Qr,
  options?: QrEmulatorOptions,
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
    case EmulatorType.Qr:
      return new QrEmulator(options as QrEmulatorOptions);
    case EmulatorType.Trezor:
      return new TrezorEmulator(options as unknown as TrezorEmulatorOptions);
    default:
      throw new Error(`Unknown emulator type: ${String(type)}`);
  }
}
