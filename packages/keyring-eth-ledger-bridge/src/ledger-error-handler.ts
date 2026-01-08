import { TransportStatusError } from '@ledgerhq/hw-transport';
import {
  ErrorCode as ErrorCodeEnum,
  Severity as SeverityEnum,
  Category as CategoryEnum,
  RetryStrategy as RetryStrategyEnum,
  HardwareWalletError,
} from '@metamask/keyring-utils';

import { createLedgerError, isKnownLedgerError } from './errors';

/**
 * Central error handler for Ledger TransportStatusError instances.
 * Converts Ledger transport errors into properly typed HardwareWalletError instances
 * using the error mapping system.
 *
 * @param error - The error to handle
 * @param fallbackMessage - Default error message if no specific handling is found
 * @throws HardwareWalletError with appropriate error details from mappings
 */
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
    throw new HardwareWalletError(error.message, {
      code: ErrorCodeEnum.UNKNOWN_001,
      severity: SeverityEnum.ERROR,
      category: CategoryEnum.UNKNOWN,
      retryStrategy: RetryStrategyEnum.NO_RETRY,
      userActionable: false,
      userMessage: '',
      cause: error,
    });
  }

  // Handle HardwareWalletError - pass through
  if (error instanceof HardwareWalletError) {
    throw error;
  }

  // For any other error type
  if (error instanceof Error) {
    throw new HardwareWalletError(error.message, {
      code: ErrorCodeEnum.UNKNOWN_001,
      severity: SeverityEnum.ERROR,
      category: CategoryEnum.UNKNOWN,
      retryStrategy: RetryStrategyEnum.NO_RETRY,
      userActionable: false,
      userMessage: '',
      cause: error,
    });
  }

  // Unknown error type
  throw new HardwareWalletError(fallbackMessage, {
    code: ErrorCodeEnum.UNKNOWN_001,
    severity: SeverityEnum.ERROR,
    category: CategoryEnum.UNKNOWN,
    retryStrategy: RetryStrategyEnum.NO_RETRY,
    userActionable: false,
    userMessage: '',
  });
}
