import type { KeyringAccount } from '@metamask/keyring-api';

// Circular import are allowed when using `import type`.
import type { AccountGroup, AccountGroupId } from './group';

/**
 * Wallet type.
 *
 * Each wallet types groups accounts using different criterias.
 */
export enum AccountWalletType {
  /**
   * Wallet grouping accounts based on their entropy source.
   */
  Entropy = 'entropy',

  /**
   * Wallet grouping accounts based on their keyring's type.
   */
  Keyring = 'keyring',

  /**
   * Wallet grouping accounts associated with an account management Snap.
   */
  Snap = 'snap',
}

/**
 * Account wallet ID.
 */
export type AccountWalletId = `${AccountWalletType}:${string}`;

/**
 * Account wallet that can hold multiple account groups.
 */
export type AccountWallet<Account extends KeyringAccount> = {
  /**
   * Account wallet ID.
   */
  get id(): AccountWalletId;

  /**
   * Account wallet type.
   */
  get type(): AccountWalletType;

  /**
   * Gets account group for a given ID.
   *
   * @param id - Account group ID.
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
 * Convert a unique ID to a wallet ID for a given type.
 *
 * @param type - A wallet type.
 * @param id - A unique ID.
 * @returns A wallet ID.
 */
export function toAccountWalletId(
  type: AccountWalletType,
  id: string,
): AccountWalletId {
  return `${type}:${id}`;
}
