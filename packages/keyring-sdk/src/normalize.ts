import type { KeyringAccount } from '@metamask/keyring-api';
import { isEvmAccountType } from '@metamask/keyring-api';

/**
 * Normalize a keyring account's address.
 *
 * EVM addresses are lowercased; non-EVM addresses (e.g. Solana) are
 * left as-is because they are case-sensitive.
 *
 * @param account - The account whose address to normalize.
 * @returns The normalized account address.
 */
export function normalizeAccountAddress(account: KeyringAccount): string {
  return isEvmAccountType(account.type)
    ? account.address.toLowerCase()
    : account.address;
}
