import type { AccountId } from '@metamask/keyring-utils';

/**
 * Error thrown by `deleteAccounts` when one or more accounts could not be
 * deleted.
 *
 * The `deleteAccounts` method is best-effort: all accounts are attempted
 * even if some fail. This error is thrown after all accounts have been
 * processed, and contains details about which accounts failed.
 */
export class DeleteAccountsError extends Error {
  /**
   * Map of account IDs that could not be deleted, to their error messages.
   */
  readonly failures: Record<AccountId, string>;

  /**
   * Create a `DeleteAccountsError` from a map of failures.
   *
   * @param failures - Map of account IDs to error messages.
   * @returns A new `DeleteAccountsError`.
   */
  static fromFailures(
    failures: Record<AccountId, string>,
  ): DeleteAccountsError {
    return new DeleteAccountsError(failures);
  }

  /**
   * Create a new `DeleteAccountsError`.
   *
   * @param failures - Map of account IDs that could not be deleted, to their
   * error messages.
   */
  constructor(failures: Record<AccountId, string>) {
    const count = Object.keys(failures).length;
    const accountIds = Object.keys(failures).join(', ');
    super(`Failed to delete ${count} account(s): ${accountIds}`);
    this.name = 'DeleteAccountsError';
    this.failures = failures;
  }
}
