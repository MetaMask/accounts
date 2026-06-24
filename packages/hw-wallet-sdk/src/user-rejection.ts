import { ErrorCode } from './hardware-errors-enums';

const USER_REJECTION_PATTERN =
  /(?:\buser rejected\b|\baction cancelled\b|\bcancelled\b|\bcanceled\b|failure_actioncancelled)/iu;

const USER_REJECTED_PATTERN = /\buser rejected\b/iu;
const PERMISSIONS_NOT_GRANTED_PATTERN = /\bpermissions? not granted\b/iu;

const USER_REJECTION_CODES = new Set<string>([
  'Method_PermissionsNotGranted',
  'Method_Cancel',
  'Failure_ActionCancelled',
]);

function isUserRejectionString(value: string): boolean {
  return (
    USER_REJECTION_PATTERN.test(value) ||
    PERMISSIONS_NOT_GRANTED_PATTERN.test(value) ||
    USER_REJECTION_CODES.has(value)
  );
}

function isUserRejectedString(value: string): boolean {
  return (
    USER_REJECTED_PATTERN.test(value) ||
    PERMISSIONS_NOT_GRANTED_PATTERN.test(value) ||
    value === 'Method_PermissionsNotGranted'
  );
}

type ErrorLikeObject = {
  code?: unknown;
  message?: unknown;
  stack?: unknown;
  cause?: unknown;
  originalError?: unknown;
};

/**
 * Recursively checks whether an error value represents a user rejection or
 * cancellation, mirroring detection used in MetaMask core signing flows.
 *
 * @param error - The error value to inspect.
 * @param visited - Set of already-visited objects to avoid infinite recursion.
 * @returns True when the error looks like a user rejection or cancellation.
 */
export function isUserRejectionLikeError(
  error: unknown,
  visited = new Set<unknown>(),
): boolean {
  if (!error || visited.has(error)) {
    return false;
  }
  visited.add(error);

  if (typeof error === 'string') {
    return isUserRejectionString(error);
  }

  if (typeof error !== 'object') {
    return false;
  }

  const errorObject = error as ErrorLikeObject;

  if (errorObject.code === 4001) {
    return true;
  }

  return (
    isUserRejectionLikeError(errorObject.code, visited) ||
    isUserRejectionLikeError(errorObject.message, visited) ||
    isUserRejectionLikeError(errorObject.stack, visited) ||
    isUserRejectionLikeError(errorObject.cause, visited) ||
    isUserRejectionLikeError(errorObject.originalError, visited)
  );
}

/**
 * Resolves a hardware-wallet error code for user rejection-like errors.
 *
 * @param error - The error value to inspect.
 * @returns `UserRejected` or `UserCancelled` when detected, otherwise `undefined`.
 */
export function resolveUserRejectionErrorCode(
  error: unknown,
): ErrorCode.UserCancelled | ErrorCode.UserRejected | undefined {
  if (!isUserRejectionLikeError(error)) {
    return undefined;
  }

  if (typeof error === 'string') {
    return isUserRejectedString(error)
      ? ErrorCode.UserRejected
      : ErrorCode.UserCancelled;
  }

  const errorObject = error as ErrorLikeObject;

  if (typeof errorObject.message === 'string') {
    if (isUserRejectedString(errorObject.message)) {
      return ErrorCode.UserRejected;
    }
    if (isUserRejectionString(errorObject.message)) {
      return ErrorCode.UserCancelled;
    }
  }

  if (typeof errorObject.code === 'string') {
    if (isUserRejectedString(errorObject.code)) {
      return ErrorCode.UserRejected;
    }
    if (isUserRejectionString(errorObject.code)) {
      return ErrorCode.UserCancelled;
    }
  }

  if (errorObject.cause !== undefined) {
    const causeCode = resolveUserRejectionErrorCode(errorObject.cause);
    if (causeCode !== undefined) {
      return causeCode;
    }
  }

  if (errorObject.originalError !== undefined) {
    const originalCode = resolveUserRejectionErrorCode(
      errorObject.originalError,
    );
    if (originalCode !== undefined) {
      return originalCode;
    }
  }

  return ErrorCode.UserCancelled;
}
