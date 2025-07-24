import type { EntropySourceId, KeyringAccount } from '@metamask/keyring-api';
import type { SnapId } from '@metamask/snaps-sdk';

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
 * Account wallet options for the "entropy" wallet category.
 */
export type AccountWalletEntropyOptions = {
  type: AccountWalletCategory.Entropy;
  entropy: {
    id: EntropySourceId;
  };
};

/**
 * Account wallet options for the "snap" wallet category.
 */
export type AccountWalletSnapOptions = {
  type: AccountWalletCategory.Snap;
  snap: {
    id: SnapId;
  };
};

/**
 * Account wallet options for the "keyring" wallet category.
 */
export type AccountWalletKeyringOptions = {
  type: AccountWalletCategory.Keyring;
  keyring: {
    type: string;
  };
};

/**
 * Account wallet options for the "keyring" wallet category.
 */
export type AccountWalletOptions =
  | AccountWalletEntropyOptions
  | AccountWalletSnapOptions
  | AccountWalletKeyringOptions;

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
   * Account wallet category.
   */
  get options(): AccountWalletOptions;

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
