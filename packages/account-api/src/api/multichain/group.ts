import { type KeyringAccount } from '@metamask/keyring-api';

import type {
  MultichainAccountWallet,
  MultichainAccountWalletId,
} from './wallet';
import type { Bip44Account } from '../bip44';
import type { AccountGroup, AccountGroupType } from '../group';
import type { AccountWalletType } from '../wallet';

/**
 * Multichain account ID.
 */
export type MultichainAccountGroupId = `${MultichainAccountWalletId}/${number}`; // Use number for the account group index.

/**
 * Regex to validate a valid multichain account group ID.
 */
export const MULTICHAIN_ACCOUNT_GROUP_ID_REGEX =
  /^(?<walletId>(?<walletType>entropy):(?<walletSubId>.+))\/(?<groupIndex>[0-9]+)$/u;

/**
 * Parsed account group ID with its parsed wallet component and its sub-ID.
 */
export type ParsedMultichainAccountGroupId = {
  wallet: {
    id: MultichainAccountWalletId;
    type: AccountWalletType.Entropy;
    subId: string;
  };
  groupIndex: number;
};

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
  get groupIndex(): number;
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
 * Parse a multichain account group ID to an object containing a multichain
 * wallet ID information (wallet type and wallet sub-ID), as well as
 * multichain account group ID information (group index).
 *
 * @param groupId - The multichain account group ID to validate and parse.
 * @returns The parsed multichain account group ID.
 * @throws When the group ID format is invalid.
 */
export function parseMultichainAccountGroupId(
  groupId: string,
): ParsedMultichainAccountGroupId {
  const match = MULTICHAIN_ACCOUNT_GROUP_ID_REGEX.exec(groupId);
  if (!match?.groups) {
    throw new Error(`Invalid multichain account group ID: "${groupId}"`);
  }

  const walletId = match.groups.walletId as MultichainAccountWalletId;
  const walletType = match.groups.walletType as AccountWalletType.Entropy;
  const walletSubId = match.groups.walletSubId as string;

  return {
    wallet: {
      id: walletId,
      type: walletType,
      subId: walletSubId,
    },
    groupIndex: Number(match.groups.groupIndex),
  };
}

/**
 * Gets the multichain account index from an account group ID.
 *
 * @param id - Multichain account ID.
 * @returns The multichain account index if extractable, undefined otherwise.
 * @throws When the group ID format is invalid.
 */
export function getGroupIndexFromMultichainAccountGroupId(
  id: MultichainAccountGroupId,
): number {
  return parseMultichainAccountGroupId(id).groupIndex;
}
