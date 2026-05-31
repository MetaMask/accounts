/**
 * Retry a function with exponential backoff.
 *
 * @param fn - The async function to retry.
 * @param options - Retry configuration.
 * @param options.maxRetries - Maximum number of retry attempts.
 * @param options.shouldRetry - Optional predicate to determine if an error is retryable.
 * @param options.onRetry - Optional callback invoked before each retry.
 * @returns The result of the function.
 */
export async function withRetry<TResult>(
  fn: () => Promise<TResult>,
  options: {
    maxRetries: number;
    shouldRetry?: (error: Error) => boolean;
    onRetry?: (error: Error, attempt: number) => void;
  },
): Promise<TResult> {
  const { maxRetries, shouldRetry, onRetry } = options;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (rawError: unknown) {
      const error =
        rawError instanceof Error ? rawError : new Error(String(rawError));
      const canRetry =
        attempt < maxRetries && (shouldRetry ? shouldRetry(error) : true);
      if (!canRetry) {
        throw error;
      }
      onRetry?.(error, attempt + 1);
      const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
      await new Promise((resolve) => {
        setTimeout(resolve, delay);
      });
    }
  }
  throw new Error('Unreachable');
}

/**
 * Exponential backoff delay calculator.
 */
export class ExponentialBackoff {
  #current: number;

  readonly #initialMs: number;

  readonly #maxMs: number;

  readonly #multiplier: number;

  constructor(initialMs: number, maxMs: number, multiplier = 2) {
    this.#initialMs = initialMs;
    this.#maxMs = maxMs;
    this.#multiplier = multiplier;
    this.#current = initialMs;
  }

  /**
   * Get the next delay value and advance the backoff.
   *
   * @returns The delay in milliseconds.
   */
  next(): number {
    const wait = this.#current;
    this.#current = Math.min(this.#current * this.#multiplier, this.#maxMs);
    return wait;
  }

  /**
   * Reset the backoff to its initial state.
   */
  reset(): void {
    this.#current = this.#initialMs;
  }
}

/**
 * Check if an error is transient and worth retrying.
 *
 * @param error - The error to check.
 * @returns True if the error is retryable.
 */
export function isRetryableError(error: Error): boolean {
  const errorData = error as { message?: unknown; code?: unknown };
  const message =
    typeof errorData.message === 'string' ? errorData.message : '';
  const code = typeof errorData.code === 'string' ? errorData.code : '';
  const retryableCodes = new Set<string>([
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ECONNRESET',
    'EHOSTUNREACH',
    'EPIPE',
  ]);
  if (retryableCodes.has(code)) {
    return true;
  }
  if (
    message.includes('ECONNREFUSED') ||
    message.includes('ETIMEDOUT') ||
    message.includes('ECONNRESET')
  ) {
    return true;
  }
  return false;
}
