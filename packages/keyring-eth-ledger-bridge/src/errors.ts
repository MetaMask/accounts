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

export type LedgerHardwareWalletErrorOptions = {
  code: ErrorCode;
  severity: Severity;
  category: Category;
  retryStrategy: RetryStrategy;
  cause?: Error;
  ledgerCode?: string;
};

export class LedgerHardwareWalletError extends HardwareWalletError {
  public readonly ledgerCode?: string;

  constructor(message: string, options: LedgerHardwareWalletErrorOptions) {
    super(message, {
      ...options,
      userActionable: false,
      userMessage: message,
    });
    this.name = 'LedgerHardwareWalletError';
    this.ledgerCode = options.ledgerCode;

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, LedgerHardwareWalletError.prototype);
  }

  /**
   * Creates a new error instance with an incremented retry count.
   *
   * @returns A new LedgerHardwareWalletError instance with the retry count incremented.
   */
  override withIncrementedRetryCount(): LedgerHardwareWalletError {
    const errorCause =
      'cause' in this && this.cause instanceof Error ? this.cause : undefined;

    return new LedgerHardwareWalletError(this.message, {
      code: this.code,
      severity: this.severity,
      category: this.category,
      retryStrategy: this.retryStrategy,
      cause: errorCause,
      ledgerCode: this.ledgerCode,
    });
  }

  /**
   * Creates a new error instance with additional metadata.
   *
   * @param _additionalMetadata - Additional metadata to merge with existing metadata.
   * @returns A new LedgerHardwareWalletError instance with the updated metadata.
   */
  override withMetadata(
    _additionalMetadata: Record<string, unknown>,
  ): LedgerHardwareWalletError {
    const errorCause =
      'cause' in this && this.cause instanceof Error ? this.cause : undefined;

    return new LedgerHardwareWalletError(this.message, {
      code: this.code,
      severity: this.severity,
      category: this.category,
      retryStrategy: this.retryStrategy,
      cause: errorCause,
      ledgerCode: this.ledgerCode,
    });
  }

  /**
   * Serializes the error to a JSON-compatible object.
   *
   * @returns A JSON-compatible object representing the error.
   */
  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      ledgerCode: this.ledgerCode,
    };
  }
}

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
 * Factory function to create a LedgerHardwareWalletError from a Ledger error code.
 *
 * @param ledgerErrorCode - The Ledger error code (e.g., '0x6985', '0x5515')
 * @param context - Optional additional context to append to the error message
 * @returns A LedgerHardwareWalletError instance with mapped error details
 *
 * @example
 * ```typescript
 * const error = createLedgerError('0x6985'); // User rejected action
 * const errorWithContext = createLedgerError('0x6985', 'during transaction signing');
 * ```
 */
export function createLedgerError(
  ledgerErrorCode: string,
  context?: string,
): LedgerHardwareWalletError {
  const mappings = HARDWARE_MAPPINGS.ledger.errorMappings as {
    [key: string]: LedgerErrorMapping;
  };
  const errorMapping = mappings[ledgerErrorCode];

  if (errorMapping) {
    const message = context
      ? `${errorMapping.message} (${context})`
      : errorMapping.message;

    return new LedgerHardwareWalletError(message, {
      code: errorMapping.customCode,
      severity: errorMapping.severity,
      category: errorMapping.category,
      retryStrategy: errorMapping.retryStrategy,
      ledgerCode: ledgerErrorCode,
    });
  }

  // Fallback for unknown error codes
  const fallbackMessage = context
    ? `Unknown Ledger error: ${ledgerErrorCode} (${context})`
    : `Unknown Ledger error: ${ledgerErrorCode}`;

  return new LedgerHardwareWalletError(fallbackMessage, {
    code: ErrorCodeEnum.UNKNOWN_001,
    severity: SeverityEnum.ERROR,
    category: CategoryEnum.UNKNOWN,
    retryStrategy: RetryStrategyEnum.NO_RETRY,
    ledgerCode: ledgerErrorCode,
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
