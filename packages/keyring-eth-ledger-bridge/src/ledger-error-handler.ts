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

    throw new LedgerStatusError(
      transportError.statusCode,
      getTransportErrorMessageFrom(transportError),
    );
  }

  // For any other error (TransportStatusError not matching patterns or other errors)
  throw error instanceof Error ? error : new Error(fallbackMessage);
}

/**
 * Get the transport error message from the transport error.
 *
 * @param transportError - The transport error
 * @returns The transport error message
 */
function getTransportErrorMessageFrom(
  transportError: TransportStatusError,
): string {
  switch (transportError.statusCode) {
    case 0x6985:
      return 'Ledger: User rejected the transaction';
    case 0x6a80:
      return 'Ledger: Blind signing must be enabled';
    case 0x5515:
      return 'Ledger: Device is locked. Unlock it to continue.';
    case 0x650f:
      return 'Ledger: Ethereum app closed. Open it to unlock.';
    default:
      // If the status code is not one of the known codes, just use the existing error message.
      return transportError.message;
  }
}
