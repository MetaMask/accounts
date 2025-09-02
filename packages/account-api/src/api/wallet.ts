import type { KeyringAccount } from '@metamask/keyring-api';

// Circular import are allowed when using `import type`.
import type { AccountGroup, AccountGroupId } from './group';

/**
 * Wallet type.
 *
 * Each wallet types groups accounts using different criterias.
 */
export enum AccountWalletType {
  /** Wallet grouping accounts based on their entropy source. */
  Entropy = 'entropy',

  /** Wallet grouping accounts based on their keyring's type. */
  Keyring = 'keyring',

  /** Wallet grouping accounts associated with an account management Snap. */
  Snap = 'snap',
}

/**
 * Account wallet ID.
 */
export type AccountWalletId = `${AccountWalletType}:${string}`;

/**
 * Regex to validate an account wallet ID.
 */
export const ACCOUNT_WALLET_ID_REGEX =
  /^(?<walletType>entropy|keyring|snap):(?<walletSubId>.+)$/u;

/**
 * Parsed account wallet ID with its wallet type and sub-ID.
 */
export type ParsedAccountWalletId = {
  type: AccountWalletType;
  subId: string;
};

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
 * Type utility to compute a constrained {@link AccountWalletId} type given a
 * specifc {@link AccountWalletType}.
 */
export type AccountWalletIdOf<WalletType extends AccountWalletType> =
  `${WalletType}:${string}`;

/**
 * Convert a unique ID to a wallet ID for a given type.
 *
 * @param type - A wallet type.
 * @param id - A unique ID.
 * @returns A wallet ID.
 */
export function toAccountWalletId<WalletType extends AccountWalletType>(
  type: WalletType,
  id: string,
): AccountWalletIdOf<WalletType> {
  return `${type}:${id}`;
}

/**
 * Checks if the given value is {@link AccountWalletId}.
 *
 * @param value - The value to check.
 * @returns Whether the value is a {@link AccountWalletId}.
 */
export function isAccountWalletId(value: string): value is AccountWalletId {
  return ACCOUNT_WALLET_ID_REGEX.test(value);
}

/**
 * Parse a account wallet ID to an object containing a parsed wallet ID information
 * and parsed account wallet ID information.
 * This validates the account wallet ID before parsing it.
 *
 * @param walletId - The account wallet ID to validate and parse.
 * @returns The parsed account wallet ID.
 */
export function parseAccountWalletId(walletId: string): ParsedAccountWalletId {
  const match = ACCOUNT_WALLET_ID_REGEX.exec(walletId);
  if (!match?.groups) {
    throw new Error('Invalid account wallet ID');
  }

  return {
    type: match.groups.walletType as AccountWalletType,
    subId: match.groups.walletSubId as string,
  };
}

/**
 * Strip the account wallet type from an account wallet ID.
 *
 * Note: This function will return the input as-is if the input is not a valid.
 *
 * @param walletId - Account wallet ID.
 * @returns Stripped ID.
 */
export function stripAccountWalletType(walletId: string): string {
  try {
    return parseAccountWalletId(walletId).subId;
  } catch {
    return walletId;
  }
}
