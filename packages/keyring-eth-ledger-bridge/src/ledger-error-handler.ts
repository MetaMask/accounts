import { TransportStatusError } from '@ledgerhq/hw-transport';
import {
  ErrorCode as ErrorCodeEnum,
  Severity as SeverityEnum,
  Category as CategoryEnum,
  RetryStrategy as RetryStrategyEnum,
} from '@metamask/keyring-utils';

import {
  createLedgerError,
  isKnownLedgerError,
  LedgerHardwareWalletError,
} from './errors';

/**
 * Central error handler for Ledger TransportStatusError instances.
 * Converts Ledger transport errors into properly typed LedgerHardwareWalletError instances
 * using the error mapping system.
 *
 * @param error - The error to handle
 * @param fallbackMessage - Default error message if no specific handling is found
 * @throws LedgerHardwareWalletError with appropriate error details from mappings
 */
// eslint-disable-next-line @typescript-eslint/no-throw-literal
export function handleLedgerTransportError(
  error: unknown,
  fallbackMessage: string,
): never {
  if (error instanceof TransportStatusError) {
    const statusCodeHex = `0x${error.statusCode.toString(16)}`;

    // Try to create error from known status code
    if (isKnownLedgerError(statusCodeHex)) {
      throw createLedgerError(statusCodeHex);
    }

    // Unknown status code - create generic error with details
    throw new LedgerHardwareWalletError(error.message, {
      code: ErrorCodeEnum.UNKNOWN_001,
      severity: SeverityEnum.ERROR,
      category: CategoryEnum.UNKNOWN,
      retryStrategy: RetryStrategyEnum.NO_RETRY,
      cause: error,
      ledgerCode: statusCodeHex,
    });
  }

  // Handle LedgerHardwareWalletError - pass through
  if (error instanceof LedgerHardwareWalletError) {
    throw error;
  }

  // For any other error type
  if (error instanceof Error) {
    throw new LedgerHardwareWalletError(error.message, {
      code: ErrorCodeEnum.UNKNOWN_001,
      severity: SeverityEnum.ERROR,
      category: CategoryEnum.UNKNOWN,
      retryStrategy: RetryStrategyEnum.NO_RETRY,
      cause: error,
    });
  }

  // Unknown error type
  throw new LedgerHardwareWalletError(fallbackMessage, {
    code: ErrorCodeEnum.UNKNOWN_001,
    severity: SeverityEnum.ERROR,
    category: CategoryEnum.UNKNOWN,
    retryStrategy: RetryStrategyEnum.NO_RETRY,
  });
}
