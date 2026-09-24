import { normalize } from '@metamask/eth-sig-util';
import type { AccountId } from '@metamask/keyring-utils';
import { hexToBytes } from '@metamask/utils';
import { sha256 } from '@noble/hashes/sha2';
import memoize from 'lodash/memoize.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Returns the SHA-256 digest of the given hex string.
 * This function is memoized for performance, since the digest is the
 * expensive part of the UUID derivations below, and repeated derivations
 * for the same input are common (e.g. on every keyring synchronization).
 *
 * @param hashInput - The hex string to hash.
 * @returns The 32-byte SHA-256 digest.
 */
const getSha256Digest = memoize(
  (hashInput: string): Uint8Array => sha256(hexToBytes(hashInput)),
);

/**
 * Derives 16 bytes suitable for seeding a UUID v4 generator, deterministically,
 * from the SHA-256 hash of the given hex string.
 *
 * The underlying digest is memoized, but this function deliberately returns a
 * fresh copy on every call: the `uuid` package stamps the version and variant
 * bits in place, so sharing a single array across callers would be unsafe.
 *
 * The input is hashed as-is. Hex casing is irrelevant, since `hexToBytes`
 * ignores it, but any other canonicalization is the caller's responsibility.
 *
 * @param hashInput - The hex string to derive the bytes from.
 * @returns A fresh 16-byte `Uint8Array` to use as the `random` option of the
 * `uuid` package's v4 generator.
 */
export function getDeterministicUuidV4Random(hashInput: string): Uint8Array {
  return getSha256Digest(hashInput).slice(0, 16);
}

/**
 * Derives a deterministic UUID v4 from the SHA-256 hash of the given hex
 * string.
 * This is the unmemoized version, primarily used for testing.
 *
 * @param hashInput - The hex string to derive the UUID from.
 * @returns A deterministic UUID v4 string.
 */
export function getDeterministicUuidV4Unmemoized(hashInput: string): string {
  return uuidv4({ random: getDeterministicUuidV4Random(hashInput) });
}

/**
 * Derives a deterministic UUID v4 from the SHA-256 hash of the given hex
 * string. Repeated calls with the same input return the same UUID.
 * This function is memoized for performance.
 *
 * The input is hashed as-is. Hex casing is irrelevant, since `hexToBytes`
 * ignores it, but any other canonicalization is the caller's responsibility.
 *
 * @param hashInput - The hex string to derive the UUID from.
 * @returns A deterministic UUID v4 string.
 */
export const getDeterministicUuidV4 = memoize(getDeterministicUuidV4Unmemoized);

/**
 * Generates a deterministic account ID for a given Ethereum address.
 * This is the unmemoized version, primarily used for testing.
 *
 * @param address - The Ethereum address (hex string) to generate the account
 * ID from.
 * @returns A deterministic UUID v4 string to use as the account ID.
 */
export function generateEthAccountIdUnmemoized(address: string): AccountId {
  const normalized = normalize(address) as string;
  return getDeterministicUuidV4Unmemoized(normalized);
}

/**
 * Generates a deterministic account ID for a given Ethereum address.
 *
 * The address is first normalized (lowercased, `0x`-prefixed) so that
 * checksum-cased and lowercase variants of the same address produce the
 * same ID. The ID is then a UUID v4 derived by seeding the UUID generator
 * with the first 16 bytes of the SHA-256 hash of the normalized address
 * bytes.
 *
 * This function is memoized for performance.
 *
 * @param address - The Ethereum address (hex string) to generate the account
 * ID from.
 * @returns A deterministic UUID v4 string to use as the account ID.
 */
export const generateEthAccountId = memoize(generateEthAccountIdUnmemoized);
