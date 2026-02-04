/**
 * Custom error class for account-related errors.
 */
export class AccountAssertError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AccountError';

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AccountAssertError);
    }
  }
}
