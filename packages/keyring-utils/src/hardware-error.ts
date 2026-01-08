import type { ErrorCode, Category } from './hardware-errors-enums';
import { Severity, RetryStrategy } from './hardware-errors-enums';

/**
 * Generates a unique error ID using timestamp and random values.
 *
 * @returns A unique error ID string.
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
   *
   * @returns True if the error can be retried, false otherwise.
   */
  isRetryable(): boolean {
    return this.retryStrategy !== RetryStrategy.NO_RETRY;
  }

  /**
   * Checks if this error is critical.
   *
   * @returns True if the error is critical, false otherwise.
   */
  isCritical(): boolean {
    return this.severity === Severity.CRITICAL;
  }

  /**
   * Checks if this error is a warning.
   *
   * @returns True if the error is a warning, false otherwise.
   */
  isWarning(): boolean {
    return this.severity === Severity.WARNING;
  }

  /**
   * Checks if this error requires user action.
   *
   * @returns True if the error requires user action, false otherwise.
   */
  requiresUserAction(): boolean {
    return this.userActionable;
  }

  /**
   * Creates a new error instance with an incremented retry count.
   *
   * @returns A new HardwareWalletError instance with incremented retry count.
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

    return new HardwareWalletError(this.message, options);
  }

  /**
   * Creates a new error instance with additional metadata.
   *
   * @param additionalMetadata - Additional metadata to merge with existing metadata.
   * @returns A new HardwareWalletError instance with merged metadata.
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

    return new HardwareWalletError(this.message, options);
  }

  /**
   * Serializes the error to a JSON-compatible object.
   * Note: The cause property is serialized if it exists.
   *
   * @returns A JSON-compatible object representation of the error.
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
   *
   * @returns A user-friendly string representation of the error.
   */
  toString(): string {
    return `${this.name} [${this.code}]: ${this.userMessage}`;
  }

  /**
   * Returns a detailed string representation for debugging.
   *
   * @returns A detailed string representation of the error for debugging.
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

    if (this.metadata && Object.keys(this.metadata).length > 0) {
      details.push(`Metadata: ${JSON.stringify(this.metadata, null, 2)}`);
    }

    if (this.cause !== undefined) {
      details.push(`Caused by: ${this.cause.message}`);
    }

    return details.join('\n');
  }
}
