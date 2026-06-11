/**
 * Pure helpers shared by the DMK bridge and its tests. Extracted from
 * `LedgerDmkBridge` so they can be unit-tested in isolation and reused
 * without an instance.
 *
 * @module dmk/internal-utils
 */

/**
 * Strip a leading `0x` from a hex string, if present.
 *
 * @param value - The hex string (with or without `0x` prefix).
 * @returns The hex string with no `0x` prefix.
 */
export function stripHexPrefix(value: string): string {
  return value.startsWith('0x') ? value.slice(2) : value;
}

/**
 * Strip the leading `m/` from a BIP-32 derivation path.
 *
 * DMK / signer-kit accepts paths without the leading `m/`.
 *
 * @param path - The BIP-32 path (e.g. `m/44'/60'/0'/0/0`).
 * @returns The path with no leading `m/`.
 */
export function stripPathPrefix(path: string): string {
  return path.replace(/^m\//u, '');
}

/**
 * Normalize a signature `v` (or any numeric/string hex-ish value) to a hex
 * string without `0x` prefix.
 *
 * @param value - The raw value (`bigint`, `number`, or hex string).
 * @returns The hex string with no `0x` prefix.
 */
export function toHexString(value: bigint | number | string): string {
  if (typeof value === 'string') {
    return stripHexPrefix(value);
  }
  return value.toString(16);
}

const HEX_PAIR_REGEX = /^[0-9a-fA-F]{2}$/u;

/**
 * Convert a hex string to a `Uint8Array`. Strips a leading `0x` if present.
 *
 * Throws on inputs that would silently produce wrong bytes:
 *  - odd-length strings (e.g. `'abc'`)
 *  - non-hex characters (e.g. `'zz'`)
 *
 * @param value - The hex string (with or without `0x` prefix).
 * @returns The decoded bytes.
 * @throws {Error} If the input has odd length or contains non-hex characters.
 */
export function hexToBytes(value: string): Uint8Array {
  const normalized = stripHexPrefix(value);
  if (normalized.length === 0) {
    return Uint8Array.from([]);
  }
  if (normalized.length % 2 !== 0) {
    throw new Error(
      'Hex string must have an even number of characters (got ' +
        `${normalized.length}): "${normalized}"`,
    );
  }

  const pairs = normalized.match(/.{1,2}/gu);
  if (!pairs) {
    // Should be unreachable given the length check above; defensive.
    return Uint8Array.from([]);
  }

  for (const pair of pairs) {
    if (!HEX_PAIR_REGEX.test(pair)) {
      throw new Error(
        `Hex string contains non-hex characters: "${pair}" in "${normalized}"`,
      );
    }
  }

  return Uint8Array.from(pairs.map((pair) => parseInt(pair, 16)));
}
