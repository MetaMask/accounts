import type { KeyringAccount } from '@metamask/keyring-api';

import type { AccountGroup, AccountGroupId } from './group';

export enum AccountWalletCategory {
  Entropy = 'entropy',
  Keyring = 'keyring',
  Snap = 'snap',
}

export type AccountWalletId = `${AccountWalletCategory}:${string}`;

export type AccountWallet<Account extends KeyringAccount> = {
  get id(): AccountWalletId;

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
