import type { AccountId } from '@metamask/keyring-utils';
import { SnapError } from '@metamask/snaps-sdk';
import type { Json } from '@metamask/utils';

/**
 * Snap error thrown by `deleteAccounts` when one or more accounts could not
 * be deleted.
 *
 * The `deleteAccounts` method is best-effort: all accounts are attempted
 * even if some fail. This error is thrown after all accounts have been
 * processed, and contains details about which accounts failed.
 *
 * This error extends `SnapError` so that the `failures` data is preserved
 * when serialized across the Snap boundary.
 */
export class DeleteAccountsSnapError extends SnapError {
  /**
   * Create a `DeleteAccountsSnapError` from a map of failures.
   *
   * @param failures - Map of account IDs to error messages.
   */
  constructor(failures: Record<AccountId, string>) {
    const count = Object.keys(failures).length;
    const accountIds = Object.keys(failures).join(', ');
    super(`Failed to delete ${count} account(s): ${accountIds}`, {
      failures: failures as unknown as Record<string, Json>,
    });
  }
}
