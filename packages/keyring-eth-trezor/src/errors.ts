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

export type TrezorHardwareWalletErrorOptions = {
  code: ErrorCode;
  severity: Severity;
  category: Category;
  retryStrategy: RetryStrategy;
  cause?: Error;
  trezorCode?: string | number;
};

export class TrezorHardwareWalletError extends HardwareWalletError {
  public readonly trezorCode?: string | number;

  constructor(message: string, options: TrezorHardwareWalletErrorOptions) {
    super(message, {
      ...options,
      userActionable: false,
      userMessage: message,
    });
    this.name = 'TrezorHardwareWalletError';
    this.trezorCode = options.trezorCode;

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, TrezorHardwareWalletError.prototype);
  }

  /**
   * Creates a new error instance with an incremented retry count.
   *
   * @returns A new TrezorHardwareWalletError instance with the retry count incremented.
   */
  override withIncrementedRetryCount(): TrezorHardwareWalletError {
    const errorCause =
      'cause' in this && this.cause instanceof Error ? this.cause : undefined;

    return new TrezorHardwareWalletError(this.message, {
      code: this.code,
      severity: this.severity,
      category: this.category,
      retryStrategy: this.retryStrategy,
      cause: errorCause,
      trezorCode: this.trezorCode,
    });
  }

  /**
   * Creates a new error instance with additional metadata.
   *
   * @param _additionalMetadata - Additional metadata to merge with existing metadata.
   * @returns A new TrezorHardwareWalletError instance with the updated metadata.
   */
  override withMetadata(
    _additionalMetadata: Record<string, unknown>,
  ): TrezorHardwareWalletError {
    const errorCause =
      'cause' in this && this.cause instanceof Error ? this.cause : undefined;

    return new TrezorHardwareWalletError(this.message, {
      code: this.code,
      severity: this.severity,
      category: this.category,
      retryStrategy: this.retryStrategy,
      cause: errorCause,
      trezorCode: this.trezorCode,
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
      trezorCode: this.trezorCode,
    };
  }
}

type TrezorErrorMappings = typeof HARDWARE_MAPPINGS.trezor.errorMapping;
type TrezorErrorMapping = TrezorErrorMappings[keyof TrezorErrorMappings];

/**
 * Factory function to create a TrezorHardwareWalletError from a Trezor error code or name.
 *
 * @param trezorErrorCode - The Trezor error code (e.g., '1', '2', 'Init_NotInitialized')
 * @param context - Optional additional context to append to the error message
 * @returns A TrezorHardwareWalletError instance with mapped error details
 *
 * @example
 * ```typescript
 * const error = createTrezorError('4'); // Action cancelled by user
 * const errorByName = createTrezorError('Init_NotInitialized');
 * const errorWithContext = createTrezorError('4', 'during transaction signing');
 * ```
 */
export function createTrezorError(
  trezorErrorCode: string | number,
  context?: string,
): TrezorHardwareWalletError {
  const codeKey = String(trezorErrorCode);
  const mappings = HARDWARE_MAPPINGS.trezor.errorMapping as {
    [key: string]: TrezorErrorMapping;
  };
  const errorMapping = mappings[codeKey];

  if (errorMapping) {
    const message = context
      ? `${errorMapping.message} (${context})`
      : errorMapping.message;

    return new TrezorHardwareWalletError(message, {
      code: errorMapping.customCode,
      severity: errorMapping.severity,
      category: errorMapping.category,
      retryStrategy: errorMapping.retryStrategy,
      trezorCode: trezorErrorCode,
    });
  }

  // Fallback for unknown error codes
  const fallbackMessage = context
    ? `Unknown Trezor error: ${trezorErrorCode} (${context})`
    : `Unknown Trezor error: ${trezorErrorCode}`;

  return new TrezorHardwareWalletError(fallbackMessage, {
    code: ErrorCodeEnum.UNKNOWN_001,
    severity: SeverityEnum.ERROR,
    category: CategoryEnum.UNKNOWN,
    retryStrategy: RetryStrategyEnum.NO_RETRY,
    trezorCode: trezorErrorCode,
  });
}

/**
 * Checks if a Trezor error code exists in the error mappings.
 *
 * @param trezorErrorCode - The Trezor error code to check
 * @returns True if the error code is mapped, false otherwise
 */
export function isKnownTrezorError(trezorErrorCode: string | number): boolean {
  return String(trezorErrorCode) in HARDWARE_MAPPINGS.trezor.errorMapping;
}

/**
 * Gets the error mapping details for a Trezor error code without creating an error instance.
 *
 * @param trezorErrorCode - The Trezor error code to look up
 * @returns The error mapping details or undefined if not found
 */
export function getTrezorErrorMapping(
  trezorErrorCode: string | number,
): TrezorErrorMapping | undefined {
  const mappings = HARDWARE_MAPPINGS.trezor.errorMapping as {
    [key: string]: TrezorErrorMapping;
  };
  return mappings[String(trezorErrorCode)];
}

/**
 * Creates a TrezorHardwareWalletError from a TrezorConnect response error.
 * This helper extracts the error code/message from the response and creates an appropriate error.
 *
 * @param response - The TrezorConnect response object
 * @param response.success - The success status of the response (must be false)
 * @param response.payload - The payload object containing error information
 * @param response.payload.error - The error message from Trezor
 * @param response.payload.code - Optional error code from Trezor
 * @param context - Optional additional context
 * @returns A TrezorHardwareWalletError instance
 *
 * @example
 * ```typescript
 * const result = await TrezorConnect.ethereumGetAddress({ path: "m/44'/60'/0'/0/0" });
 * if (!result.success) {
 *   throw createTrezorErrorFromResponse(result);
 * }
 * ```
 */
export function createTrezorErrorFromResponse(
  response: { success: false; payload: { error: string; code?: string } },
  context?: string,
): TrezorHardwareWalletError {
  const errorMessage = response.payload.error;
  const errorCode = response.payload.code;

  // Try to find a matching error by code first
  if (errorCode && isKnownTrezorError(errorCode)) {
    return createTrezorError(errorCode, context);
  }

  // Try to find a matching error by error message pattern
  const mappings = HARDWARE_MAPPINGS.trezor.errorMapping as {
    [key: string]: TrezorErrorMapping;
  };

  for (const [code, mapping] of Object.entries(mappings)) {
    if (
      'sdkMessage' in mapping &&
      mapping.sdkMessage &&
      errorMessage.includes(mapping.sdkMessage)
    ) {
      return createTrezorError(code, context);
    }
  }

  // If no specific mapping found, create a generic error
  const message = context ? `${errorMessage} (${context})` : errorMessage;

  return new TrezorHardwareWalletError(message, {
    code: ErrorCodeEnum.UNKNOWN_001,
    severity: SeverityEnum.ERROR,
    category: CategoryEnum.UNKNOWN,
    retryStrategy: RetryStrategyEnum.NO_RETRY,
    trezorCode: errorCode,
  });
}
