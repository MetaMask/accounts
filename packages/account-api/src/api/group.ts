import type { KeyringAccount } from '@metamask/keyring-api';
import type { AccountId } from '@metamask/keyring-utils';

import type { AccountWalletId } from './wallet';

export const DEFAULT_ACCOUNT_GROUP_UNIQUE_ID: string = 'default';
export const DEFAULT_ACCOUNT_GROUP_NAME: string = 'Default';

export type AccountGroupId = `${AccountWalletId}:${string}`;

export type AccountGroup<Account extends KeyringAccount> = {
  get id(): AccountGroupId;

  get index(): number;

  /**
   * Gets the "blockchain" accounts for this multichain account.
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
  getAccount(id: AccountId): Account | undefined;
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
  return `${walletId}:${id}`;
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
