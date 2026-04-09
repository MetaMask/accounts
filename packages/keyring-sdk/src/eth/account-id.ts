import { normalize } from '@metamask/eth-sig-util';
import type { AccountId } from '@metamask/keyring-utils';
import { hexToBytes } from '@metamask/utils';
import { sha256 } from 'ethereum-cryptography/sha256';
import { v4 as uuidv4 } from 'uuid';

/**
 * Generates a deterministic account ID for a given Ethereum address.
 *
 * The address is first normalized (lowercased, `0x`-prefixed) so that
 * checksum-cased and lowercase variants of the same address produce the
 * same ID. The ID is then a UUID v4 derived by seeding the UUID generator
 * with the first 16 bytes of the SHA-256 hash of the normalized address
 * bytes.
 *
 * @param address - The Ethereum address (hex string) to generate the account
 * ID from.
 * @returns A deterministic UUID v4 string to use as the account ID.
 */
export function generateEthAccountId(address: string): AccountId {
  const normalized = normalize(address) as string;
  return uuidv4({
    random: sha256(hexToBytes(normalized)).slice(0, 16),
  });
}
