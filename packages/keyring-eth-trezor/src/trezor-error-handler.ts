import {
  ErrorCode,
  Severity,
  Category,
  HardwareWalletError,
  resolveUserRejectionErrorCode,
} from '@metamask/hw-wallet-sdk';

import { createTrezorError, isKnownTrezorError } from './trezor-errors';

type ErrorDetails = {
  message?: string;
  code?: string;
  name?: string;
};

const USER_REJECTION_TREZOR_IDENTIFIERS: Record<
  ErrorCode.UserCancelled | ErrorCode.UserRejected,
  string
> = {
  [ErrorCode.UserCancelled]: 'Failure_ActionCancelled',
  [ErrorCode.UserRejected]: 'Method_PermissionsNotGranted',
};

function getErrorDetails(error: Error): ErrorDetails {
  const details: ErrorDetails = {
    message: error.message,
    name: error.name,
  };

  if ('code' in error) {
    const { code } = error as Error & { code?: unknown };
    if (typeof code === 'string') {
      details.code = code;
    } else if (typeof code === 'number') {
      details.code = String(code);
    }
  }

  return details;
}

/**
 * Converts unknown Trezor errors into typed HardwareWalletError instances.
 *
 * @param error - Error thrown from Trezor bridge or keyring flow.
 * @param fallbackMessage - Default message for unknown non-Error inputs.
 * @returns A typed hardware wallet error.
 */
export function convertToHardwareWalletError(
  error: unknown,
  fallbackMessage: string,
): HardwareWalletError {
  if (error instanceof HardwareWalletError) {
    return error;
  }

  if (error instanceof Error) {
    const details = getErrorDetails(error);
    const identifier = [details.code, details.name, details.message].find(
      (value): value is string =>
        value !== undefined && isKnownTrezorError(value),
    );

    if (identifier) {
      return createTrezorError(identifier, details.message);
    }

    const userRejectionCode = resolveUserRejectionErrorCode(error);
    if (userRejectionCode !== undefined) {
      return createTrezorError(
        USER_REJECTION_TREZOR_IDENTIFIERS[userRejectionCode],
        details.message,
      );
    }

    return new HardwareWalletError(details.message ?? fallbackMessage, {
      code: ErrorCode.Unknown,
      severity: Severity.Err,
      category: Category.Unknown,
      userMessage: details.message ?? fallbackMessage,
      cause: error,
    });
  }

  const userRejectionCode = resolveUserRejectionErrorCode(error);
  if (userRejectionCode !== undefined) {
    return createTrezorError(
      USER_REJECTION_TREZOR_IDENTIFIERS[userRejectionCode],
    );
  }

  return new HardwareWalletError(fallbackMessage, {
    code: ErrorCode.Unknown,
    severity: Severity.Err,
    category: Category.Unknown,
    userMessage: fallbackMessage,
  });
}

/**
 * Converts unknown Trezor errors into typed HardwareWalletError instances.
 *
 * @param error - Error thrown from Trezor bridge or keyring flow.
 * @param fallbackMessage - Default message for unknown non-Error inputs.
 * @throws HardwareWalletError Always throws typed errors.
 */
export function handleTrezorTransportError(
  error: unknown,
  fallbackMessage: string,
): never {
  throw convertToHardwareWalletError(error, fallbackMessage);
}
