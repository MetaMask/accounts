import { TransportStatusError } from '@ledgerhq/hw-transport';

import { LedgerStatusError } from './type';

/**
 * Central error handler for Ledger TransportStatusError instances.
 * Converts common Ledger transport errors into user-friendly error messages.
 *
 * @param error - The error to handle
 * @param fallbackMessage - Default error message if no specific handling is found
 * @throws Error with appropriate user-friendly message
 */
export function handleLedgerTransportError(
  error: unknown,
  fallbackMessage: string,
): never {
  if (error instanceof TransportStatusError) {
    const transportError: TransportStatusError = error;

    switch (transportError.statusCode) {
      case 0x6985:
        throw new LedgerStatusError(
          transportError.statusCode,
          'Ledger: User rejected the transaction.',
        );
      case 0x6a80:
        throw new LedgerStatusError(
          transportError.statusCode,
          'Ledger: Blind signing must be enabled.',
        );
      case 0x5515:
        throw new LedgerStatusError(
          transportError.statusCode,
          'Ledger: Device is locked. Unlock it to continue.',
        );
      case 0x650f:
        throw new LedgerStatusError(
          transportError.statusCode,
          'Ledger: Ethereum app closed. Open it to unlock.',
        );
      default:
        // If the status code is not one of the known codes, throw the error with the status code and message
        throw new LedgerStatusError(
          transportError.statusCode,
          transportError.message,
        );
    }
  }

  // For any other error (TransportStatusError not matching patterns or other errors)
  throw error instanceof Error ? error : new Error(fallbackMessage);
}
