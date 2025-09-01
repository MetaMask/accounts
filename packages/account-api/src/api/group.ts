import type { KeyringAccount } from '@metamask/keyring-api';

// Circular import are allowed when using `import type`.
import type { AccountSelector } from './selector';
import {
  toAccountWalletId,
  type AccountWallet,
  type AccountWalletId,
  type AccountWalletIdOf,
  type AccountWalletType,
  type ParsedAccountWalletId,
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
 * Regex to validate a valid account group ID.
 */
export const ACCOUNT_GROUP_ID_REGEX =
  /^(?<walletId>(?<walletType>entropy|snap|keyring):(?<walletSubId>.+))\/(?<groupSubId>[^/]+)$/u;

/**
 * Parsed account group ID with its parsed wallet component and its sub-ID.
 */
export type ParsedAccountGroupId = {
  wallet: ParsedAccountWalletId;
  subId: string;
};

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

  /**
   * Query an account matching the selector.
   *
   * @param selector - Query selector.
   * @returns The account matching the selector or undefined if not matching.
   * @throws If multiple accounts match the selector.
   */
  get(selector: AccountSelector<Account>): Account | undefined;

  /**
   * Query accounts matching the selector.
   *
   * @param selector - Query selector.
   * @returns The accounts matching the selector.
   */
  select(selector: AccountSelector<Account>): Account[];
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

/**
 * Parse a account group ID to an object containing a parsed wallet ID information
 * and parsed account group ID information.
 * This validates the account group ID before parsing it.
 *
 * @param groupId - The account group ID to validate and parse.
 * @returns The parsed account group ID.
 */
export function parseAccountGroupId(groupId: string): ParsedAccountGroupId {
  const match = ACCOUNT_GROUP_ID_REGEX.exec(groupId);
  if (!match?.groups) {
    throw new Error('Invalid account group ID.');
  }

  return {
    wallet: {
      type: match.groups.walletType as AccountWalletType,
      subId: match.groups.walletSubId as string,
    },
    subId: match.groups.groupSubId as string,
  };
}

/**
 * Get account wallet ID from an account group ID.
 *
 * @param groupId - Account group ID.
 * @returns Associated account wallet ID to this account group ID.
 */
export function getAccountGroupWalletId(groupId: string): AccountWalletId {
  const { type, subId } = parseAccountGroupId(groupId).wallet;

  return toAccountWalletId(type, subId);
}

/**
 * Get the account group sub-ID from an account group ID.
 *
 * @param groupId - Account group ID.
 * @returns Stripped ID.
 */
export function getAccountGroupSubId(groupId: string): string {
  return parseAccountGroupId(groupId).subId;
}
