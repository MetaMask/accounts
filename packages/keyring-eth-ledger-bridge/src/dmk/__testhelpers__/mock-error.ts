import type { DeviceExchangeError } from '@ledgerhq/device-management-kit';

import { ETH_APP_COMMAND_ERROR_TAG } from '../eth-get-app-configuration-command';

/**
 * Construct a mock {@link DeviceExchangeError} for tests.
 *
 * The DMK `DeviceExchangeError` is normally raised inside the DMK runtime;
 * tests need a structurally-equivalent value without going through DMK.
 * This helper centralises the cast so test files don't each roll their own.
 *
 * @param errorCode - The hex error code to embed (e.g. `'6985'`).
 * @returns A mock `DeviceExchangeError<TErrorCode>`.
 */
export function createMockDeviceExchangeError<TErrorCode = string>(
  errorCode: TErrorCode,
): DeviceExchangeError<TErrorCode> {
  return {
    _tag: ETH_APP_COMMAND_ERROR_TAG,
    message: `DMK error: ${String(errorCode)}`,
    errorCode,
    originalError: undefined,
  } as unknown as DeviceExchangeError<TErrorCode>;
}
