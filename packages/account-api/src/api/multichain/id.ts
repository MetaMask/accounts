import type { EntropySourceId } from '@metamask/keyring-api';

import type { AccountGroupId } from '../group';
import { AccountWalletCategory } from '../wallet';

export type MultichainAccountWalletId =
  `${AccountWalletCategory.Entropy}:${EntropySourceId}`;

export type MultichainAccountId = `${MultichainAccountWalletId}/${number}`; // Use number for the account group index.

const GROUP_INDEX_REGEX = new RegExp(
  `^${AccountWalletCategory.Entropy}:.*/(?<groupIndex>\\d+)$`,
  'u',
);

/**
 * Gets the multichain account wallet ID from its entropy source.
 *
 * @param entropySource - Entropy source ID of that wallet.
 * @returns The multichain account wallet ID.
 */
export function toMultichainAccountWalletId(
  entropySource: EntropySourceId,
): MultichainAccountWalletId {
  return `${AccountWalletCategory.Entropy}:${entropySource}`;
}

/**
 * Gets the multichain account ID from its multichain account wallet ID and its index.
 *
 * @param walletId - Multichain account wallet ID.
 * @param groupIndex - Index of that multichain account.
 * @returns The multichain account ID.
 */
export function toMultichainAccountId(
  walletId: MultichainAccountWalletId,
  groupIndex: number,
): MultichainAccountId {
  return `${walletId}/${groupIndex}`;
}

/**
 * Gets the multichain account index from an account group ID.
 *
 * @param groupId - Account group ID.
 * @returns The multichain account index if extractable, undefined otherwise.
 */
export function getGroupIndexFromAccountGroupId(
  groupId: AccountGroupId,
): number | undefined {
  const matched = groupId.match(GROUP_INDEX_REGEX);
  if (matched) {
    if (matched.groups?.groupIndex !== undefined) {
      return Number(matched.groups.groupIndex);
    }
  }

  // Unable to extract group index.
  return undefined;
}
