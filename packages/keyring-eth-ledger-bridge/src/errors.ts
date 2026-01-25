import {
  type ErrorCode,
  type Severity,
  type Category,
  HardwareWalletError,
  LEDGER_ERROR_MAPPINGS,
  ErrorCode as ErrorCodeEnum,
  Severity as SeverityEnum,
  Category as CategoryEnum,
} from '@metamask/hw-wallet-sdk';

type LedgerErrorMapping = {
  code: ErrorCode;
  message: string;
  severity: Severity;
  category: Category;
  userMessage?: string;
};

/**
 * Factory function to create a HardwareWalletError from a Ledger error code.
 *
 * @param ledgerErrorCode - The Ledger error code (e.g., '0x6985', '0x5515')
 * @param context - Optional additional context to append to the error message
 * @returns A HardwareWalletError instance with mapped error details
 */
export function createLedgerError(
  ledgerErrorCode: string,
  context?: string,
): HardwareWalletError {
  const mappings = LEDGER_ERROR_MAPPINGS as {
    [key: string]: LedgerErrorMapping;
  };
  const errorMapping = mappings[ledgerErrorCode];

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
    ? `Unknown Ledger error: ${ledgerErrorCode} (${context})`
    : `Unknown Ledger error: ${ledgerErrorCode}`;

  return new HardwareWalletError(fallbackMessage, {
    code: ErrorCodeEnum.Unknown,
    severity: SeverityEnum.Err,
    category: CategoryEnum.Unknown,
    userMessage: fallbackMessage,
  });
}

/**
 * Checks if a Ledger error code exists in the error mappings.
 *
 * @param ledgerErrorCode - The Ledger error code to check
 * @returns True if the error code is mapped, false otherwise
 */
export function isKnownLedgerError(ledgerErrorCode: string): boolean {
  return ledgerErrorCode in LEDGER_ERROR_MAPPINGS;
}

/**
 * Gets the error mapping details for a Ledger error code without creating an error instance.
 *
 * @param ledgerErrorCode - The Ledger error code to look up
 * @returns The error mapping details or undefined if not found
 */
export function getLedgerErrorMapping(
  ledgerErrorCode: string,
): LedgerErrorMapping | undefined {
  const mappings = LEDGER_ERROR_MAPPINGS as {
    [key: string]: LedgerErrorMapping;
  };
  return mappings[ledgerErrorCode];
}
