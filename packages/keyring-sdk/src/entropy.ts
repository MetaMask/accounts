import { hmac } from '@noble/hashes/hmac';
import { sha256 } from '@noble/hashes/sha2';
import { v4 as uuid } from 'uuid';

/**
 * The type of an entropy source.
 */
export type EntropySourceType =
  | 'mnemonic'
  | 'ledger'
  | 'trezor'
  | 'private-key'
  | 'mpc';

/**
 * Unique identifier for an entropy source.
 *
 * Format: `entropy:{type}:{uuid}` where the UUID is a
 * deterministic fingerprint of the underlying secret, or `'_'` for entropies
 * that cannot be uniquely identified.
 */
export type EntropySourceId =
  `entropy:${EntropySourceType}:${string}`;

/**
 * Computes a deterministic, non-reversible fingerprint for a piece of entropy.
 *
 * The fingerprint is a UUID v4 seeded from the first 16 bytes of
 * `HMAC-SHA256(key=material, msg='metamask:fingerprint')`.
 *
 * `@noble/hashes` is synchronous today, but the async signature is kept as a
 * forward-compatible seam: a future migration to the Web Crypto API (or any
 * other async primitive) won't require changes at every call site.
 *
 * @param material - The raw entropy bytes (e.g. BIP-39 mnemonic bytes).
 * @returns A deterministic UUID v4 string that uniquely identifies the entropy
 * without exposing it.
 */
export async function fingerprint(material: Uint8Array): Promise<string> {
  const message = new TextEncoder().encode('metamask:fingerprint');
  const digest = hmac(sha256, material, message);
  return uuid({ random: digest.slice(0, 16) });
}

/**
 * Computes a stable {@link EntropySourceId} for an entropy source.
 *
 * The ID is formatted as `entropy:{type}:{uuid}`, where
 * the UUID segment is the {@link fingerprint} of `material` when provided, or
 * `'_'` for entropy sources whose secret never leaves the device (e.g. hardware
 * wallets).
 *
 * @param type - The entropy source type (e.g. `'mnemonic'`,
 * `'ledger'`, `'private-key'`).
 * @param material - The raw entropy bytes. Omit for hardware wallets or any
 * entropy source where the secret is not directly accessible.
 * @returns A stable {@link EntropySourceId} string.
 */
export async function toEntropySourceId(
  type: EntropySourceType,
  material?: Uint8Array,
): Promise<EntropySourceId> {
  const entropyFingerprint = material ? await fingerprint(material) : '_';
  return `entropy:${type}:${entropyFingerprint}`;
}
