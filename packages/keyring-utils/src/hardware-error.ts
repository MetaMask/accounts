import type { Category } from './hardware-errors-enums';
import { ErrorCode, Severity } from './hardware-errors-enums';

/**
 * Generates a unique error ID using timestamp and random values.
 *
 * @returns A unique error ID string.
 */
function generateErrorId(): string {
  const timestamp = Date.now().toString(36);
  // Random string will be formatted as: 0.fa4dmg7flr8, so we skip 0. part.
  const randomPart = Math.random().toString(36).substring(2, 9);
  return `err_${timestamp}_${randomPart}`;
}

/**
 * Gets the human-readable name for an error code using enum reverse mapping.
 *
 * @param code - The error code enum value.
 * @returns The string name of the error code, or 'Unknown' if not found.
 */
function getErrorCodeName(code: ErrorCode): string {
  // Numeric enums have a reverse mapping at runtime: ErrorCode[1000] => "AuthFailed"
  return ErrorCode[code] ?? ErrorCode[ErrorCode.Unknown];
}

export type HardwareWalletErrorOptions = {
  code: ErrorCode;
  severity: Severity;
  category: Category;
  userMessage: string;
  cause?: Error;
  metadata?: Record<string, unknown>;
};

export class HardwareWalletError extends Error {
  public readonly id: string;

  public readonly code: ErrorCode;

  public readonly severity: Severity;

  public readonly category: Category;

  public readonly userMessage: string;

  public readonly timestamp: Date;

  public readonly metadata: Record<string, unknown> | undefined;

  public readonly cause: Error | undefined;

  constructor(message: string, options: HardwareWalletErrorOptions) {
    super(message);
    this.name = 'HardwareWalletError';
    this.id = generateErrorId();
    this.code = options.code;
    this.severity = options.severity;
    this.category = options.category;
    this.userMessage = options.userMessage;
    this.timestamp = new Date();
    this.metadata = options.metadata;
    this.cause = options.cause;
  }

  /**
   * Checks if this error is critical.
   *
   * @returns True if the error is critical, false otherwise.
   */
  isCritical(): boolean {
    return this.severity === Severity.Critical;
  }

  /**
   * Checks if this error is a warning.
   *
   * @returns True if the error is a warning, false otherwise.
   */
  isWarning(): boolean {
    return this.severity === Severity.Warning;
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
      userMessage: this.userMessage,
      metadata: { ...(this.metadata ?? {}), ...additionalMetadata },
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
      userMessage: this.userMessage,
      timestamp: this.timestamp.toISOString(),
      metadata: this.metadata,
    };

    if (this.cause !== undefined) {
      json.cause = {
        name: this.cause.name,
        message: this.cause.message,
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
    const codeName = getErrorCodeName(this.code);
    return `${this.#getErrorPrefix()}: ${this.userMessage}`;
  }

  /**
   * Returns a detailed string representation for debugging.
   *
   * @returns A detailed string representation of the error for debugging.
   */
  toDetailedString(): string {
    const details = [
      this.#getErrorPrefix(),
      `Message: ${this.message}`,
      `User Message: ${this.userMessage}`,
      `Severity: ${this.severity}`,
      `Category: ${this.category}`,
      `Timestamp: ${this.timestamp.toISOString()}`,
    ];

    if (this.metadata && Object.keys(this.metadata).length > 0) {
      details.push(`Metadata: ${JSON.stringify(this.metadata, null, 2)}`);
    }

    if (this.cause !== undefined) {
      details.push(`Caused by: ${this.cause.message}`);
    }

    return details.join('\n');
  }

  #getErrorPrefix(): string {
    const codeName = getErrorCodeName(this.code);
    return `${this.name} [${codeName}:${this.code}]`;
  }
}
