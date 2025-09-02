import {
  type EntropySourceId,
  type KeyringAccount,
} from '@metamask/keyring-api';

import type { MultichainAccountGroup } from './group';
import type { Bip44Account } from '../bip44';
import type { AccountWallet } from '../wallet';
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
