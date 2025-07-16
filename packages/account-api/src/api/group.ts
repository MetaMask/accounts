import type { KeyringAccount } from '@metamask/keyring-api';

// Circular import are allowed when using `import type`.
import type { AccountWallet, AccountWalletId } from './wallet';

/**
 * Default account group unique ID.
 *
 * This constant can be used to reference the "default" group from
 * an account wallet.
 */
export const DEFAULT_ACCOUNT_GROUP_UNIQUE_ID: string = 'default';

/**
 * Account group ID.
 */
export type AccountGroupId = `${AccountWalletId}/${string}`;

/**
 * Account group that can hold multiple accounts.
 */
export type AccountGroup<Account extends KeyringAccount> = {
  /**
   * Account group ID.
   */
  get id(): AccountGroupId;

  /**
   * Account wallet (parent).
   */
  get wallet(): AccountWallet<Account>;

  /**
   * Gets the "blockchain" accounts for this account group.
   *
   * @param id - Account ID.
   * @returns The "blockchain" accounts.
   */
  getAccounts(): Account[];

  /**
   * Gets the "blockchain" account for a given account ID.
   *
   * @param id - Account ID.
   * @returns The "blockchain" account or undefined if not found.
   */
  getAccount(id: Account['id']): Account | undefined;
};

/**
 * Convert a wallet ID and a unique ID, to a group ID.
 *
 * @param walletId - A wallet ID.
 * @param id - A unique ID.
 * @returns A group ID.
 */
export function toAccountGroupId(
  walletId: AccountWalletId,
  id: string,
): AccountGroupId {
  return `${walletId}/${id}`;
}

/**
 * Convert a wallet ID to the default group ID.
 *
 * @param walletId - A wallet ID.
 * @returns The default group ID.
 */
export function toDefaultAccountGroupId(
  walletId: AccountWalletId,
): AccountGroupId {
  return toAccountGroupId(walletId, DEFAULT_ACCOUNT_GROUP_UNIQUE_ID);
}
