import type { KeyringAccount } from '@metamask/keyring-api';

// Circular import are allowed when using `import type`.
import type {
  AccountWallet,
  AccountWalletId,
  AccountWalletIdOf,
  AccountWalletType,
} from './wallet';

/**
 * Default account group unique ID.
 *
 * This constant can be used to reference the "default" group from
 * an account wallet.
 */
export const DEFAULT_ACCOUNT_GROUP_UNIQUE_ID: string = 'default';

/**
 * Account group object.
 *
 * Each group types groups accounts using different criterias.
 */
export enum AccountGroupType {
  /** Group that represents a multichain account. */
  MultichainAccount = 'multichain-account',

  /** Group that represents a single account. */
  SingleAccount = 'single-account',
}

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
   * Account group type.
   */
  get type(): AccountGroupType;

  /**
   * Account wallet (parent).
   */
  get wallet(): AccountWallet<Account>;

  /**
   * Gets the accounts for this account group.
   *
   * @returns The accounts.
   */
  getAccounts(): Account[];

  /**
   * Gets the account for a given account ID.
   *
   * @param id - Account ID.
   * @returns The account or undefined if not found.
   */
  getAccount(id: Account['id']): Account | undefined;
};

/**
 * Type utility to compute a constrained {@link AccountGroupId} type given a
 * specifc {@link AccountWalletType}.
 */
export type AccountGroupIdOf<WalletType extends AccountWalletType> =
  `${AccountWalletIdOf<WalletType>}/${string}`;

/**
 * Convert a wallet ID and a unique ID, to a group ID.
 *
 * @param walletId - A wallet ID.
 * @param id - A unique ID.
 * @returns A group ID.
 */
export function toAccountGroupId<WalletType extends AccountWalletType>(
  walletId: AccountWalletIdOf<WalletType>,
  id: string,
): AccountGroupIdOf<WalletType> {
  return `${walletId}/${id}`;
}

/**
 * Convert a wallet ID to the default group ID.
 *
 * @param walletId - A wallet ID.
 * @returns The default group ID.
 */
export function toDefaultAccountGroupId<WalletType extends AccountWalletType>(
  walletId: AccountWalletIdOf<WalletType>,
): AccountGroupIdOf<WalletType> {
  return toAccountGroupId<WalletType>(
    walletId,
    DEFAULT_ACCOUNT_GROUP_UNIQUE_ID,
  );
}
