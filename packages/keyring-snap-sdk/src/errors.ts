import type { SerializedSnapError, SnapError } from '@metamask/snaps-sdk';
import { SNAP_ERROR_CODE, SNAP_ERROR_MESSAGE } from '@metamask/snaps-sdk';
import type { JsonRpcError } from '@metamask/utils';
import { isJsonRpcError, isObject } from '@metamask/utils';

// These were extracted from snaps-utils but should be eventually be made available in snaps-sdk to reduce duplication.
/**
 * Check if an object is a `SnapError`.
 *
 * @param error - The object to check.
 * @returns Whether the object is a `SnapError`.
 */
export function isSnapError(error: unknown): error is SnapError {
  if (
    isObject(error) &&
    'serialize' in error &&
    typeof error.serialize === 'function'
  ) {
    const serialized = error.serialize();
    return isJsonRpcError(serialized) && isSerializedSnapError(serialized);
  }

  return false;
}

/**
 * Check if a JSON-RPC error is a `SnapError`.
 *
 * @param error - The object to check.
 * @returns Whether the object is a `SnapError`.
 */
export function isSerializedSnapError(
  error: JsonRpcError,
): error is SerializedSnapError {
  return error.code === SNAP_ERROR_CODE && error.message === SNAP_ERROR_MESSAGE;
}
