import { HardwareWalletError } from '@metamask/hw-wallet-sdk';

import { convertToHardwareWalletError } from './trezor-error-handler';

type TrezorErrorPayload = {
  error?: string;
  code?: string;
};

/**
 * Creates a HardwareWalletError from a Trezor Connect unsuccessful response payload.
 * Preserves machine-readable Trezor error codes when present.
 *
 * @param payload - The error payload from a Trezor Connect response.
 * @returns A typed hardware wallet error for downstream handling.
 */
export function createErrorFromTrezorResponse(
  payload: TrezorErrorPayload | undefined,
): HardwareWalletError {
  const message = payload?.error ?? 'Unknown error';
  const error = new Error(message);

  if (payload?.code !== undefined) {
    Object.assign(error, { code: payload.code });
  }

  return convertToHardwareWalletError(error, message);
}
