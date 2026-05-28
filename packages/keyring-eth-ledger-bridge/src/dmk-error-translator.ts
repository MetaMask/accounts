import { DeviceExchangeError } from '@ledgerhq/device-management-kit';
import { TransportStatusError } from '@ledgerhq/hw-transport';

const GENERIC_ERROR_STATUS_CODE = 0x6f00;

/**
 * Translates a DMK error (DeviceExchangeError with hex error codes)
 * into a TransportStatusError that the Ledger keyring error handler can process.
 *
 * @param error - The error from a DMK device action or command.
 * @returns A TransportStatusError with the corresponding APDU status code.
 */
export function translateDmkError(error: unknown): TransportStatusError {
  if (isDeviceExchangeError(error)) {
    const statusCode = parseHexErrorCode(error.errorCode);
    return new TransportStatusError(statusCode);
  }

  return new TransportStatusError(GENERIC_ERROR_STATUS_CODE);
}

export function isDeviceExchangeError(
  error: unknown,
): error is DeviceExchangeError<string> {
  return (
    typeof error === 'object' &&
    error !== null &&
    '_tag' in error &&
    'errorCode' in error
  );
}

function parseHexErrorCode(errorCode: unknown): number {
  if (typeof errorCode === 'string' && /^[0-9a-fA-F]{4}$/u.test(errorCode)) {
    return parseInt(errorCode, 16);
  }

  return GENERIC_ERROR_STATUS_CODE;
}
