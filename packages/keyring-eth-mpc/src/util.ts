import {
  bigIntToBytes,
  concatBytes,
  ecrecover,
  publicToAddress,
  pubToAddress,
} from '@ethereumjs/util';
import type {
  MessageTypes,
  TypedDataV1,
  TypedMessage,
} from '@metamask/eth-sig-util';
import {
  normalize,
  SignTypedDataVersion,
  TypedDataUtils,
  typedSignatureHash,
} from '@metamask/eth-sig-util';
import type { RandomNumberGenerator } from '@metamask/mfa-wallet-interface';
import type { Hex, Json } from '@metamask/utils';
import { add0x, assert, bytesToHex, hexToBytes } from '@metamask/utils';

const SESSION_NONCE_BYTE_LENGTH = 32;
export const AES_GCM_IV_LENGTH = 12;

/**
 * Generate a session nonce: random bytes from the RNG, hex-encoded.
 *
 * @param rng - The random number generator.
 * @returns Hex-encoded 32-byte random nonce.
 */
export function generateSessionNonce(rng: RandomNumberGenerator): Hex {
  return bytesToHex(rng.generateRandomBytes(SESSION_NONCE_BYTE_LENGTH));
}

/**
 * Encrypt plaintext with AES-GCM. The IV is prepended to the ciphertext.
 *
 * @param key - 16- or 32-byte AES key.
 * @param plaintext - Bytes to encrypt.
 * @param iv - 12-byte IV.
 * @returns `iv || ciphertext || tag`.
 */
export async function encryptBytes(
  key: Uint8Array,
  plaintext: Uint8Array,
  iv: Uint8Array,
): Promise<Uint8Array> {
  if (iv.length !== AES_GCM_IV_LENGTH) {
    throw new Error('Invalid IV length');
  }
  if (key.length !== 16 && key.length !== 32) {
    throw new Error('Invalid backup encryption key length');
  }

  const cryptoKey = await globalThis.crypto.subtle.importKey(
    'raw',
    key,
    'AES-GCM',
    false,
    ['encrypt'],
  );
  const ciphertext = await globalThis.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    plaintext,
  );
  return concatBytes(iv, new Uint8Array(ciphertext));
}

/**
 * Decrypt a payload produced by {@link encryptBytes}.
 *
 * @param key - 16- or 32-byte AES key.
 * @param payload - `iv || ciphertext || tag`.
 * @returns The plaintext bytes.
 */
export async function decryptBytes(
  key: Uint8Array,
  payload: Uint8Array,
): Promise<Uint8Array> {
  if (payload.length <= AES_GCM_IV_LENGTH) {
    throw new Error('Invalid ciphertext');
  }
  if (key.length !== 16 && key.length !== 32) {
    throw new Error('Invalid backup encryption key length');
  }

  const iv = payload.slice(0, AES_GCM_IV_LENGTH);
  const ciphertext = payload.slice(AES_GCM_IV_LENGTH);
  const cryptoKey = await globalThis.crypto.subtle.importKey(
    'raw',
    key,
    'AES-GCM',
    false,
    ['decrypt'],
  );
  const plaintext = await globalThis.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    ciphertext,
  );
  return new Uint8Array(plaintext);
}

const SECP256K1_N = BigInt(
  '0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141',
);
const SECP256K1_HALF_N = SECP256K1_N / 2n;

/**
 * Convert a public key to an address.
 *
 * @param pubKey - The public key to convert.
 * @returns The address.
 */
export function publicToAddressHex(pubKey: Uint8Array): Hex {
  const addrBytes = publicToAddress(pubKey);
  return bytesToHex(addrBytes);
}

/**
 * Normalize an address.
 *
 * @param address - The address to normalize.
 * @returns The normalized address.
 */
export function normalizeAddress(address: string): Hex {
  const normalized = normalize(address);
  assert(normalized, 'Expected address to be set');
  return add0x(normalized);
}

/**
 * Check if two addresses are equal.
 *
 * @param address1 - The first address.
 * @param address2 - The second address.
 * @returns Whether the addresses are equal.
 */
export function equalAddresses(address1: string, address2: string): boolean {
  return normalizeAddress(address1) === normalizeAddress(address2);
}

/**
 * Convert an ECDSA signature in compact format (64 bytes) to a signature in
 * Ethereum extended format (65 bytes).
 *
 * @param signature - The signature to convert.
 * @param hash - The hash of the message.
 * @param pubKey - The public key of the signer.
 * @returns The Ethereum signature.
 */
export function toEthSig(
  signature: Uint8Array,
  hash: Uint8Array,
  pubKey: Uint8Array,
): Uint8Array {
  if (signature.length !== 64) {
    throw new Error('Invalid signature length');
  }

  // Enforce low `s`

  const rBuf = signature.slice(0, 32);
  let sBuf = signature.slice(32, 64);

  const sInt = BigInt(add0x(bytesToHex(sBuf)));
  if (sInt > SECP256K1_HALF_N) {
    const newSInt = SECP256K1_N - sInt;
    const newSBytes = bigIntToBytes(newSInt);

    if (newSBytes.length < 32) {
      sBuf = new Uint8Array(32);
      sBuf.set(newSBytes, 32 - newSBytes.length);
    } else {
      sBuf = new Uint8Array(newSBytes);
    }
  }

  // Compute `v`
  // ---------------------------------------------------------------------------
  // NOTE: If the signing library provided the parity of R.y, we could compute
  // `v` directly and skip the costly ecrecover operation.
  // ---------------------------------------------------------------------------

  const expectedAddr = publicKeyToAddressHex(pubKey);

  const checkParity = (parity: bigint): boolean => {
    try {
      const candidatePubKey = ecrecover(hash, parity, rBuf, sBuf);
      return publicToAddressHex(candidatePubKey) === expectedAddr;
    } catch {
      return false;
    }
  };

  const parity = checkParity(0n) ? 0n : 1n;

  // Ethereum's recovery value: `v = parity(R.y) + 27`
  const vInt = parity + 27n;

  // Ethereum's extended signature format: `[r | s | v]`
  return concatBytes(rBuf, sBuf, bigIntToBytes(vInt));
}

/**
 * Parse an extended ECDSA signature.
 *
 * @param signature - The signature to parse.
 * @returns The parsed signature.
 */
export function parseEthSig(signature: Uint8Array): {
  r: Uint8Array;
  s: Uint8Array;
  v: bigint;
} {
  if (signature.length !== 65) {
    throw new Error('Invalid signature length');
  }

  const rBuf = signature.slice(0, 32);
  const sBuf = signature.slice(32, 64);
  const vByte = signature[64];

  // This check is technically redundant because length is 65, but satisfies TS
  if (vByte === undefined) {
    throw new Error('Invalid signature v value');
  }
  const vInt = BigInt(vByte);

  return { r: rBuf, s: sBuf, v: vInt };
}

/**
 * Parse the version of a signed typed data object.
 *
 * @param opts - The options object.
 * @returns The version of the signed typed data object.
 */
export function parseSignedTypedDataVersion(
  opts?: Record<string, unknown>,
): SignTypedDataVersion {
  let version = opts?.version as SignTypedDataVersion | undefined;
  if (!version || !Object.keys(SignTypedDataVersion).includes(version)) {
    version = SignTypedDataVersion.V1;
  }
  return version;
}

/**
 * Get the hash of a signed typed data object.
 *
 * @param data - The data to hash.
 * @param version - The version of the signed typed data object.
 * @returns The hash of the signed typed data object.
 */
export function getSignedTypedDataHash<
  Version extends SignTypedDataVersion,
  MessageType extends MessageTypes,
>(
  data: Version extends 'V1' ? TypedDataV1 : TypedMessage<MessageType>,
  version: Version,
): Uint8Array {
  if (version === SignTypedDataVersion.V1) {
    const hash = typedSignatureHash(data as unknown as TypedDataV1);
    return hexToBytes(hash);
  }

  const hash = TypedDataUtils.eip712Hash(
    data as TypedMessage<MessageType>,
    version,
  );
  return new Uint8Array(hash);
}

/**
 * Parse a non-empty string field from JSON.
 *
 * @param value - The value to parse.
 * @param fieldName - Field name for error messages.
 * @returns The parsed string.
 */
function parseNonEmptyString(value: Json, fieldName: string): string {
  if (typeof value !== 'string') {
    throw new Error(`Invalid ${fieldName}: expected a string`);
  }
  if (value.length < 1) {
    throw new Error(`Invalid ${fieldName}: expected a non-empty string`);
  }
  return value;
}

/**
 * Parse a server network id from a JSON value.
 *
 * @param serverNetId - The server network id to parse.
 * @returns The parsed server network id.
 */
export function parseServerNetId(serverNetId: Json): string {
  return parseNonEmptyString(serverNetId, 'server network id');
}

/**
 * Parse a share epoch from a JSON value.
 *
 * @param shareEpoch - The share epoch to parse.
 * @returns The parsed share epoch.
 */
export function parseShareEpoch(shareEpoch: Json): number {
  if (typeof shareEpoch !== 'number' || !Number.isInteger(shareEpoch)) {
    throw new Error('Invalid share epoch: expected an integer');
  }
  if (shareEpoch < 1) {
    throw new Error('Invalid share epoch: expected a positive integer');
  }
  return shareEpoch;
}

/**
 * Parse TSS setup from a JSON value.
 *
 * @param tssSetup - Hex-encoded setup, or `null` when unset.
 * @returns The parsed setup bytes, or `null`.
 */
export function parseTssSetup(tssSetup: Json): Uint8Array | null {
  if (tssSetup === null) {
    return null;
  }
  if (typeof tssSetup !== 'string') {
    throw new Error('Invalid tss setup: expected a hex string or null');
  }
  return hexToBytes(tssSetup);
}

/**
 * Convert a public key to an address.
 *
 * @param publicKey - The public key to convert.
 * @returns The address.
 */
export function publicKeyToAddressHex(publicKey: Uint8Array): Hex {
  return bytesToHex(pubToAddress(publicKey, true));
}
