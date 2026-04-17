import {
  TREZOR_ERROR_MAPPINGS,
  ErrorCode,
  Severity,
  Category,
  HardwareWalletError,
} from '@metamask/hw-wallet-sdk';
import type { ErrorMapping } from '@metamask/hw-wallet-sdk';

/**
 * Factory function to create a HardwareWalletError from a Trezor error identifier.
 *
 * @param trezorErrorIdentifier - The Trezor error identifier (e.g., 'Device_Disconnected', 'Method_Cancel')
 * @param context - Optional additional context to append to the error message
 * @returns A HardwareWalletError instance with mapped error details
 */
export function createTrezorError(
  trezorErrorIdentifier: string,
  context?: string,
): HardwareWalletError {
  const errorMapping = getTrezorErrorMapping(trezorErrorIdentifier);

  if (errorMapping) {
    const message = context
      ? `${errorMapping.message} (${context})`
      : errorMapping.message;

    return new HardwareWalletError(message, {
      code: errorMapping.code,
      severity: errorMapping.severity,
      category: errorMapping.category,
      userMessage: errorMapping.userMessage ?? message,
    });
  }

  // Fallback for unknown error codes
  const fallbackMessage = context
    ? `Unknown Trezor error: ${trezorErrorIdentifier} (${context})`
    : `Unknown Trezor error: ${trezorErrorIdentifier}`;

  return new HardwareWalletError(fallbackMessage, {
    code: ErrorCode.Unknown,
    severity: Severity.Err,
    category: Category.Unknown,
    userMessage: fallbackMessage,
  });
}

/**
 * Checks if a Trezor error identifier exists in the error mappings.
 *
 * @param trezorErrorIdentifier - The Trezor error identifier to check
 * @returns True if the error identifier is mapped, false otherwise
 */
export function isKnownTrezorError(trezorErrorIdentifier: string): boolean {
  return trezorErrorIdentifier in TREZOR_ERROR_MAPPINGS;
}

/**
 * Gets the error mapping details for a Trezor error identifier without creating an error instance.
 *
 * @param trezorErrorIdentifier - The Trezor error identifier to look up
 * @returns The error mapping details or undefined if not found
 */
export function getTrezorErrorMapping(
  trezorErrorIdentifier: string,
): ErrorMapping | undefined {
  return TREZOR_ERROR_MAPPINGS[trezorErrorIdentifier];
}
