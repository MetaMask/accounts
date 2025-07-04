import type { EntropySourceId } from '@metamask/keyring-api';

export type MultichainAccountWalletId = `multichain-account-wallet:${string}`;

export type MultichainAccountId = `${MultichainAccountWalletId}:${number}`; // Use number for the account group index.

/**
 * Gets the multichain account wallet ID from its entropy source.
 *
 * @param entropySource - Entropy source ID of that wallet.
 * @returns The multichain account wallet ID.
 */
export function toMultichainAccountWalletId(
  entropySource: EntropySourceId,
): MultichainAccountWalletId {
  return `multichain-account-wallet:${entropySource}`;
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
  return `${walletId}:${groupIndex}`;
}
