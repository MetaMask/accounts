import { HardwareWalletError } from '@metamask/hw-wallet-sdk';

import { convertToHardwareWalletError } from './trezor-error-handler';

type TrezorResponseError = {
  message?: string;
  code?: string;
};

/**
 * Creates a HardwareWalletError from a Trezor Connect unsuccessful response error.
 * Preserves machine-readable Trezor error codes when present.
 *
 * @param responseError - The `error` of an unsuccessful Trezor Connect response.
 * @returns A typed hardware wallet error for downstream handling.
 */
export function createErrorFromTrezorResponse(
  responseError: TrezorResponseError | undefined,
): HardwareWalletError {
  const message = responseError?.message ?? 'Unknown error';
  const error = new Error(message);

  if (responseError?.code !== undefined) {
    Object.assign(error, { code: responseError.code });
  }

  return convertToHardwareWalletError(error, message);
}
