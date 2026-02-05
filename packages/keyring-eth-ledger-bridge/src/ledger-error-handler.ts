import { TransportStatusError } from '@ledgerhq/hw-transport';
import {
  ErrorCode as ErrorCodeEnum,
  Severity as SeverityEnum,
  Category as CategoryEnum,
  HardwareWalletError,
} from '@metamask/hw-wallet-sdk';

import { createLedgerError, isKnownLedgerError } from './errors';

const LEDGER_ERROR_PREFIX = 'Ledger: ';
const LEDGER_PREFIX_STATUS_CODES = new Set([
  '0x6985',
  '0x6a80',
  '0x5515',
  '0x650f',
]);

/**
 * Prefixes error messages with the Ledger identifier when needed.
 *
 * @param message - The error message to prefix.
 * @returns The message with a Ledger prefix.
 */
function withLedgerPrefix(message: string): string {
  return message.startsWith(LEDGER_ERROR_PREFIX)
    ? message
    : `${LEDGER_ERROR_PREFIX}${message}`;
}

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
      const ledgerError = createLedgerError(statusCodeHex);
      if (LEDGER_PREFIX_STATUS_CODES.has(statusCodeHex)) {
        ledgerError.message = withLedgerPrefix(ledgerError.message);
      }
      throw ledgerError;
    }

    // Unknown status code - create generic error with details
    throw new HardwareWalletError(error.message, {
      code: ErrorCodeEnum.Unknown,
      severity: SeverityEnum.Err,
      category: CategoryEnum.Unknown,
      userMessage: error.message,
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
      code: ErrorCodeEnum.Unknown,
      severity: SeverityEnum.Err,
      category: CategoryEnum.Unknown,
      userMessage: error.message,
      cause: error,
    });
  }

  // Unknown error type
  throw new HardwareWalletError(fallbackMessage, {
    code: ErrorCodeEnum.Unknown,
    severity: SeverityEnum.Err,
    category: CategoryEnum.Unknown,
    userMessage: fallbackMessage,
  });
}
