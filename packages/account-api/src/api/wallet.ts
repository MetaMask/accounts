import type { KeyringAccount } from '@metamask/keyring-api';

// Circular import are allowed when using `import type`.
import type { AccountGroup, AccountGroupId } from './group';

export enum AccountWalletCategory {
  /**
   * Category for wallets that group accounts based on their
   * entropy source.
   */
  Entropy = 'entropy',

  /**
   * Category for wallets that group accounts based on their
   * keyring's type.
   */
  Keyring = 'keyring',

  /**
   * Category for wallets that group accounts associated with an
   * account management Snap.
   */
  Snap = 'snap',
}

/**
 * Account wallet ID.
 */
export type AccountWalletId = `${AccountWalletCategory}:${string}`;

/**
 * Account wallet that can hold multiple account groups.
 */
export type AccountWallet<Account extends KeyringAccount> = {
  /**
   * Account wallet ID.
   */
  get id(): AccountWalletId;

  /**
   * Account wallet category.
   */
  get category(): AccountWalletCategory;

  /**
   * Gets account group for a given ID.
   *
   * @returns Account group.
   */
  getAccountGroup(id: AccountGroupId): AccountGroup<Account> | undefined;

  /**
   * Gets all account groups.
   *
   * @returns Account groups.
   */
  getAccountGroups(): AccountGroup<Account>[];
};

/**
 * Convert a unique ID to a wallet ID for a given category.
 *
 * @param category - A wallet category.
 * @param id - A unique ID.
 * @returns A wallet ID.
 */
export function toAccountWalletId(
  category: AccountWalletCategory,
  id: string,
): AccountWalletId {
  return `${category}:${id}`;
}
