import type {
  ErrorCode,
  Severity,
  Category,
  RetryStrategy,
} from './hardware-errors-enums';

/**
 * Generates a unique error ID using timestamp and random values.
 */
function generateErrorId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 9);
  return `err_${timestamp}_${randomPart}`;
}

export type HardwareWalletErrorOptions = {
  code: ErrorCode;
  severity: Severity;
  category: Category;
  retryStrategy: RetryStrategy;
  userActionable: boolean;
  userMessage: string;
  cause?: Error;
  metadata?: Record<string, unknown>;
  documentationUrl?: string;
  retryCount?: number;
};

export class HardwareWalletError extends Error {
  public readonly id: string;

  public readonly code: ErrorCode;

  public readonly severity: Severity;

  public readonly category: Category;

  public readonly retryStrategy: RetryStrategy;

  public readonly userActionable: boolean;

  public readonly userMessage: string;

  public readonly timestamp: Date;

  public readonly metadata: Record<string, unknown> | undefined;

  public readonly documentationUrl: string | undefined;

  public readonly retryCount: number;

  public readonly cause: Error | undefined;

  constructor(message: string, options: HardwareWalletErrorOptions) {
    super(message);
    this.name = 'HardwareWalletError';
    this.id = generateErrorId();
    this.code = options.code;
    this.severity = options.severity;
    this.category = options.category;
    this.retryStrategy = options.retryStrategy;
    this.userActionable = options.userActionable;
    this.userMessage = options.userMessage;
    this.timestamp = new Date();
    this.metadata = options.metadata;
    this.documentationUrl = options.documentationUrl;
    this.retryCount = options.retryCount ?? 0;
    this.cause = options.cause;

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, HardwareWalletError.prototype);

    // Capture stack trace if available
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Checks if this error can be retried based on its retry strategy.
   */
  isRetryable(): boolean {
    return this.retryStrategy !== 'NO_RETRY';
  }

  /**
   * Checks if this error is critical.
   */
  isCritical(): boolean {
    return this.severity === 'CRITICAL';
  }

  /**
   * Checks if this error is a warning.
   */
  isWarning(): boolean {
    return this.severity === 'WARNING';
  }

  /**
   * Checks if this error requires user action.
   */
  requiresUserAction(): boolean {
    return this.userActionable;
  }

  /**
   * Creates a new error instance with an incremented retry count.
   */
  withIncrementedRetryCount(): HardwareWalletError {
    const options: HardwareWalletErrorOptions = {
      code: this.code,
      severity: this.severity,
      category: this.category,
      retryStrategy: this.retryStrategy,
      userActionable: this.userActionable,
      userMessage: this.userMessage,
      retryCount: this.retryCount + 1,
    };

    if (this.cause !== undefined) {
      options.cause = this.cause;
    }
    if (this.metadata !== undefined) {
      options.metadata = this.metadata;
    }
    if (this.documentationUrl !== undefined) {
      options.documentationUrl = this.documentationUrl;
    }

    return new HardwareWalletError(this.message, options);
  }

  /**
   * Creates a new error instance with additional metadata.
   */
  withMetadata(
    additionalMetadata: Record<string, unknown>,
  ): HardwareWalletError {
    const options: HardwareWalletErrorOptions = {
      code: this.code,
      severity: this.severity,
      category: this.category,
      retryStrategy: this.retryStrategy,
      userActionable: this.userActionable,
      userMessage: this.userMessage,
      metadata: { ...(this.metadata ?? {}), ...additionalMetadata },
      retryCount: this.retryCount,
    };

    if (this.cause !== undefined) {
      options.cause = this.cause;
    }
    if (this.documentationUrl !== undefined) {
      options.documentationUrl = this.documentationUrl;
    }

    return new HardwareWalletError(this.message, options);
  }

  /**
   * Serializes the error to a JSON-compatible object.
   * Note: The cause property is serialized if it exists.
   */
  toJSON(): Record<string, unknown> {
    const json: Record<string, unknown> = {
      id: this.id,
      name: this.name,
      message: this.message,
      code: this.code,
      severity: this.severity,
      category: this.category,
      retryStrategy: this.retryStrategy,
      userActionable: this.userActionable,
      userMessage: this.userMessage,
      timestamp: this.timestamp.toISOString(),
      metadata: this.metadata,
      documentationUrl: this.documentationUrl,
      retryCount: this.retryCount,
      stack: this.stack,
    };

    if (this.cause !== undefined) {
      json.cause = {
        name: this.cause.name,
        message: this.cause.message,
        stack: this.cause.stack,
      };
    }

    return json;
  }

  /**
   * Returns a user-friendly string representation of the error.
   */
  toString(): string {
    return `${this.name} [${this.code}]: ${this.userMessage}`;
  }

  /**
   * Returns a detailed string representation for debugging.
   */
  toDetailedString(): string {
    const details = [
      `${this.name} [${this.code}]`,
      `Message: ${this.message}`,
      `User Message: ${this.userMessage}`,
      `Severity: ${this.severity}`,
      `Category: ${this.category}`,
      `Retry Strategy: ${this.retryStrategy}`,
      `User Actionable: ${this.userActionable}`,
      `Timestamp: ${this.timestamp.toISOString()}`,
      `Retry Count: ${this.retryCount}`,
    ];

    if (this.documentationUrl) {
      details.push(`Documentation: ${this.documentationUrl}`);
    }

    if (this.metadata && Object.keys(this.metadata).length > 0) {
      details.push(`Metadata: ${JSON.stringify(this.metadata, null, 2)}`);
    }

    if (this.cause !== undefined) {
      details.push(`Caused by: ${this.cause.message}`);
    }

    return details.join('\n');
  }
}
