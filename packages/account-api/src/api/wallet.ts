import type { KeyringAccount } from '@metamask/keyring-api';

// Circular import are allowed when using `import type`.
import type { Bip44Account } from './bip44';
import type { AccountGroup, AccountGroupId } from './group';
import type { MultichainAccountWallet } from './multichain';

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
 * Wallet status.
 *
 * Those status are used to report in which "state" the wallet is currently
 * in. All of those operations cannot run concurrently, thus, the wallet
 * cannot have multiple status at once.
 */
export type AccountWalletStatus =
  /**
   * The wallet is not initialized yet.
   */
  | 'uninitialized'
  /**
   * The wallet is ready to run any operation.
   */
  | 'ready';

/**
 * Parsed account wallet ID with its wallet type and sub-ID.
 */
export type ParsedAccountWalletId = {
  type: AccountWalletType;
  subId: string;
};

/**
 * Keyring account wallet that can hold multiple account groups.
 */
export type BaseAccountWallet<Account extends KeyringAccount> = {
  /**
   * Account wallet ID.
   */
  get id(): AccountWalletId;

  /**
   * Account wallet type.
   */
  get type(): AccountWalletType;

  /**
   * Account wallet status.
   */
  get status(): string; // Has to be refined by the type extending this base type.

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
 * Keyring account wallet that can hold multiple account groups.
 */
export type KeyringAccountWallet<Account extends KeyringAccount> =
  BaseAccountWallet<Account> & {
    /**
     * Keyring account wallet type, which is always {@link AccountWalletType.Keyring}.
     */
    get type(): AccountWalletType.Keyring;

    /**
     * Account wallet status.
     */
    get status(): AccountWalletStatus;
  };

/**
 * Snap keyring account wallet that can hold multiple account groups.
 */
export type SnapAccountWallet<Account extends KeyringAccount> =
  BaseAccountWallet<Account> & {
    /**
     * Snap account wallet type, which is always {@link AccountWalletType.Snap}.
     */
    get type(): AccountWalletType.Snap;

    /**
     * Account wallet status.
     */
    get status(): AccountWalletStatus;
  };

/**
 * Type constraint for a {@link AccountGroupObject}. If one of its union-members
 * does not match this contraint, {@link AccountGroupObject} will resolve
 * to `never`.
 */
type IsAccountWallet<
  Wallet extends BaseAccountWallet<Account>,
  Account extends KeyringAccount,
> = Wallet;

/**
 * Account wallet that can hold multiple account groups.
 */
export type AccountWallet<Account extends KeyringAccount> = IsAccountWallet<
  | KeyringAccountWallet<Account>
  | SnapAccountWallet<Account>
  | MultichainAccountWallet<Bip44Account<Account>>,
  Account
>;

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
 * Parse an account wallet ID to an object containing a wallet ID information
 * (wallet type and wallet sub-ID).
 *
 * @param walletId - The account wallet ID to validate and parse.
 * @returns The parsed account wallet ID.
 * @throws When the wallet ID format is invalid.
 */
export function parseAccountWalletId(walletId: string): ParsedAccountWalletId {
  const match = ACCOUNT_WALLET_ID_REGEX.exec(walletId);
  if (!match?.groups) {
    throw new Error(`Invalid account wallet ID: "${walletId}"`);
  }

  return {
    type: match.groups.walletType as AccountWalletType,
    subId: match.groups.walletSubId as string,
  };
}

/**
 * Strip the account wallet type from an account wallet ID.
 *
 * @param walletId - Account wallet ID.
 * @returns Account wallet sub-ID.
 * @throws When the wallet ID format is invalid.
 */
export function stripAccountWalletType(walletId: string): string {
  return parseAccountWalletId(walletId).subId;
}
