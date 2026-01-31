import {
  type ErrorCode,
  type Severity,
  type Category,
  type RetryStrategy,
  HardwareWalletError,
  HARDWARE_MAPPINGS,
  ErrorCode as ErrorCodeEnum,
  Severity as SeverityEnum,
  Category as CategoryEnum,
  RetryStrategy as RetryStrategyEnum,
} from '@metamask/keyring-utils';

type LedgerErrorMapping = {
  customCode: ErrorCode;
  message: string;
  severity: Severity;
  category: Category;
  retryStrategy: RetryStrategy;
  userActionable: boolean;
  userMessage?: string;
};

/**
 * Factory function to create a HardwareWalletError from a Ledger error code.
 *
 * @param ledgerErrorCode - The Ledger error code (e.g., '0x6985', '0x5515')
 * @param context - Optional additional context to append to the error message
 * @returns A LedgerHardwareWalletError instance with mapped error details
 */
export function createLedgerError(
  ledgerErrorCode: string,
  context?: string,
): HardwareWalletError {
  const mappings = HARDWARE_MAPPINGS.ledger.errorMappings as {
    [key: string]: LedgerErrorMapping;
  };
  const errorMapping = mappings[ledgerErrorCode];

  if (errorMapping) {
    const message = context
      ? `${errorMapping.message} (${context})`
      : errorMapping.message;

    return new HardwareWalletError(message, {
      code: errorMapping.customCode,
      severity: errorMapping.severity,
      category: errorMapping.category,
      retryStrategy: errorMapping.retryStrategy,
      userActionable: errorMapping.userActionable,
      userMessage: errorMapping.userMessage ?? '',
    });
  }

  // Fallback for unknown error codes
  const fallbackMessage = context
    ? `Unknown Ledger error: ${ledgerErrorCode} (${context})`
    : `Unknown Ledger error: ${ledgerErrorCode}`;

  return new HardwareWalletError(fallbackMessage, {
    code: ErrorCodeEnum.UNKNOWN_001,
    severity: SeverityEnum.ERROR,
    category: CategoryEnum.UNKNOWN,
    retryStrategy: RetryStrategyEnum.NO_RETRY,
    userActionable: false,
    userMessage: '',
  });
}

/**
 * Checks if a Ledger error code exists in the error mappings.
 *
 * @param ledgerErrorCode - The Ledger error code to check
 * @returns True if the error code is mapped, false otherwise
 */
export function isKnownLedgerError(ledgerErrorCode: string): boolean {
  return ledgerErrorCode in HARDWARE_MAPPINGS.ledger.errorMappings;
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
  const mappings = HARDWARE_MAPPINGS.ledger.errorMappings as {
    [key: string]: LedgerErrorMapping;
  };
  return mappings[ledgerErrorCode];
}
