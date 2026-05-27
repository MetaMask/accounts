import {
  ErrorCode,
  Severity,
  Category,
  HardwareWalletError,
} from '@metamask/hw-wallet-sdk';

import { createTrezorError, isKnownTrezorError } from './trezor-errors';

type ErrorDetails = {
  message?: string;
  code?: string;
  name?: string;
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
    }
  }

  return details;
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
  if (error instanceof HardwareWalletError) {
    throw error;
  }

  if (error instanceof Error) {
    const details = getErrorDetails(error);
    const identifier = [details.code, details.name, details.message].find(
      (value): value is string =>
        value !== undefined && isKnownTrezorError(value),
    );

    if (identifier) {
      throw createTrezorError(identifier, details.message);
    }

    throw new HardwareWalletError(details.message ?? fallbackMessage, {
      code: ErrorCode.Unknown,
      severity: Severity.Err,
      category: Category.Unknown,
      userMessage: details.message ?? fallbackMessage,
      cause: error,
    });
  }

  throw new HardwareWalletError(fallbackMessage, {
    code: ErrorCode.Unknown,
    severity: Severity.Err,
    category: Category.Unknown,
    userMessage: fallbackMessage,
  });
}
