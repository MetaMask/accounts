import { DeviceExchangeError } from '@ledgerhq/device-management-kit';
import { TransportStatusError } from '@ledgerhq/hw-transport';
import {
  getDmkErrorFromTag,
  HardwareWalletError,
} from '@metamask/hw-wallet-sdk';

import { createDmkError } from '../errors';

const GENERIC_ERROR_STATUS_CODE = 0x6f00;

/**
 * Translates a DMK error into an error the Ledger keyring error handler can
 * process.
 *
 * Resolution order:
 * 1. **DMK `_tag`** — connection/session-level DMK errors (e.g.
 *    `DeviceSessionNotFound`, `DeviceLockedError`) carry a `_tag` but no hex
 *    APDU status code. These are resolved to a {@link HardwareWalletError}
 *    via the shared SDK mappings.
 * 2. **`DeviceExchangeError` hex code** — APDU-level errors that carry a
 *    4-character hex `errorCode` (e.g. `'6985'`). These are converted to a
 *    {@link TransportStatusError} so the existing `LEDGER_ERROR_MAPPINGS`
 *    lookup in the keyring error handler applies.
 * 3. **Generic fallback** — anything else is wrapped in a
 *    {@link TransportStatusError} with status `0x6f00`.
 *
 * @param error - The error from a DMK device action or command.
 * @returns A `HardwareWalletError` (for resolved DMK tags) or a
 * `TransportStatusError` (for hex codes and the generic fallback).
 */
export function translateDmkError(
  error: unknown,
): TransportStatusError | HardwareWalletError {
  // 1. DMK connection/session errors identified by _tag
  const tagResolution = getDmkErrorFromTag(error);
  if (tagResolution) {
    return createDmkError(tagResolution.tag);
  }

  // 2. DeviceExchangeError with hex APDU status code
  if (isDeviceExchangeError(error)) {
    const statusCode = parseHexErrorCode(error.errorCode);
    return new TransportStatusError(statusCode);
  }

  // 3. Generic fallback
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
