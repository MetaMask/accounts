import { type KeyringAccount } from '@metamask/keyring-api';

import type {
  MultichainAccountWallet,
  MultichainAccountWalletId,
} from './wallet';
import type { Bip44Account } from '../bip44';
import type { AccountGroup, AccountGroupType } from '../group';
import { AccountWalletType } from '../wallet';

const MULTICHAIN_ACCOUNT_GROUP_ID_REGEX = new RegExp(
  `^${AccountWalletType.Entropy}:.*/(?<groupIndex>\\d+)$`,
  'u',
);

/**
 * Multichain account ID.
 */
export type MultichainAccountGroupId = `${MultichainAccountWalletId}/${number}`; // Use number for the account group index.

/**
 * A multichain account that holds multiple accounts.
 */
export type MultichainAccountGroup<
  Account extends Bip44Account<KeyringAccount>,
> = AccountGroup<Account> & {
  /**
   * Multichain account group ID.
   */
  get id(): MultichainAccountGroupId;

  /**
   * Multichain account type.
   */
  get type(): AccountGroupType.MultichainAccount;

  /**
   * Multichain account's wallet reference (parent).
   */
  get wallet(): MultichainAccountWallet<Account>;

  /**
   * Multichain account group index.
   */
  get index(): number;
};

/**
 * Gets the multichain account group ID from its multichain account wallet ID and its index.
 *
 * @param walletId - Multichain account wallet ID.
 * @param groupIndex - Index of that multichain account.
 * @returns The multichain account ID.
 */
export function toMultichainAccountGroupId(
  walletId: MultichainAccountWalletId,
  groupIndex: number,
): MultichainAccountGroupId {
  return `${walletId}/${groupIndex}`;
}

/**
 * Checks if the given value is {@link MultichainAccountGroupId}.
 *
 * @param value - The value to check.
 * @returns Whether the value is a {@link MultichainAccountGroupId}.
 */
export function isMultichainAccountGroupId(
  value: string,
): value is MultichainAccountGroupId {
  return MULTICHAIN_ACCOUNT_GROUP_ID_REGEX.test(value);
}

/**
 * Gets the multichain account index from an account group ID.
 *
 * @param id - Multichain account ID.
 * @returns The multichain account index if extractable, undefined otherwise.
 */
export function getGroupIndexFromMultichainAccountGroupId(
  id: MultichainAccountGroupId,
): number {
  const matched = id.match(MULTICHAIN_ACCOUNT_GROUP_ID_REGEX);
  if (matched?.groups?.groupIndex === undefined) {
    // Unable to extract group index, even though, type wise, this should not
    // be possible!
    throw new Error('Unable to extract group index');
  }

  return Number(matched.groups.groupIndex);
}
