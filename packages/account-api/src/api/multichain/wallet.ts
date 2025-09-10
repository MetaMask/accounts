import {
  type EntropySourceId,
  type KeyringAccount,
} from '@metamask/keyring-api';

import type { MultichainAccountGroup } from './group';
import type { Bip44Account } from '../bip44';
import type { AccountWallet, BaseAccountWalletStatus } from '../wallet';
import { AccountWalletType } from '../wallet';

/**
 * Multichain account wallet ID.
 */
export type MultichainAccountWalletId =
  `${AccountWalletType.Entropy}:${EntropySourceId}`;

/**
 * Regex to validate a valid multichain account wallet ID.
 */
export const MULTICHAIN_ACCOUNT_WALLET_ID_REGEX =
  /^(?<walletId>(?<walletType>entropy):(?<walletSubId>.+))$/u;

/**
 * Parsed multichain account wallet ID with its wallet type and sub-ID.
 */
export type ParsedMultichainAccountWalletId = {
  type: AccountWalletType.Entropy;
  subId: string;
};

/**
 * Wallet status.
 *
 * Those status are used to report in which "state" the wallet is currently
 * in. All of those operations cannot run concurrently, thus, the wallet
 * cannot have multiple status at once.
 */
export type MultichainAccountWalletStatus =
  | BaseAccountWalletStatus
  /**
   * Discovery is in progress for this wallet. New account groups will be
   * automatically added based on the account provider discovery result.
   */
  | 'in-progress:discovery'
  /**
   * Alignment is in progress for this wallet. Account groups will be
   * automatically updated based on the active account providers.
   */
  | 'in-progress:alignment'
  /**
   * An on-going operation (creating/deleting) is in progress for this
   * wallet. Account groups will either be created or deleted during
   * this operation.
   */
  | 'in-progress:operation';

/**
 * A multichain account wallet that holds multiple multichain accounts (one multichain account per
 * group index).
 */
export type MultichainAccountWallet<
  Account extends Bip44Account<KeyringAccount>,
> = AccountWallet<Account> & {
  /**
   * Multichain account wallet ID.
   */
  get id(): MultichainAccountWalletId;

  /**
   * Multichain account wallet type, which is always {@link AccountWalletType.Entropy}.
   */
  get type(): AccountWalletType.Entropy;

  /**
   * Multichain account wallet entropy source.
   */
  get entropySource(): EntropySourceId;

  /**
   * Multichain account wallet status.
   */
  get status(): MultichainAccountWalletStatus;

  /**
   * Gets multichain account for a given index.
   *
   * @param groupIndex - Multichain account index.
   * @returns The multichain account associated with the given index.
   */
  getMultichainAccountGroup(
    groupIndex: number,
  ): MultichainAccountGroup<Account> | undefined;

  /**
   * Gets all multichain accounts.
   *
   * @returns The multichain accounts.
   */
  getMultichainAccountGroups(): MultichainAccountGroup<Account>[];
};

/**
 * Gets the multichain account wallet ID from its entropy source.
 *
 * @param entropySource - Entropy source ID of that wallet.
 * @returns The multichain account wallet ID.
 */
export function toMultichainAccountWalletId(
  entropySource: EntropySourceId,
): MultichainAccountWalletId {
  return `${AccountWalletType.Entropy}:${entropySource}`;
}

/**
 * Checks if the given value is {@link MultichainAccountWalletId}.
 *
 * @param value - The value to check.
 * @returns Whether the value is a {@link MultichainAccountWalletId}.
 */
export function isMultichainAccountWalletId(
  value: string,
): value is MultichainAccountWalletId {
  return MULTICHAIN_ACCOUNT_WALLET_ID_REGEX.test(value);
}

/**
 * Parse a multichain account wallet ID to an object containing wallet ID
 * information (wallet type and sub-ID).
 *
 * @param walletId - The account wallet ID to validate and parse.
 * @returns The parsed account wallet ID.
 * @throws When the wallet ID format is invalid.
 */
export function parseMultichainAccountWalletId(
  walletId: string,
): ParsedMultichainAccountWalletId {
  const match = MULTICHAIN_ACCOUNT_WALLET_ID_REGEX.exec(walletId);
  if (!match?.groups) {
    throw new Error(`Invalid multichain account wallet ID: "${walletId}"`);
  }

  return {
    type: match.groups.walletType as AccountWalletType.Entropy,
    subId: match.groups.walletSubId as string,
  };
}
