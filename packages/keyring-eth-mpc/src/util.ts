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
import type { Hex, Json } from '@metamask/utils';
import { add0x, assert, bytesToHex, hexToBytes } from '@metamask/utils';

import type { Custodian, ThresholdKeyId } from './types';

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
 * Parse the key ID from a JSON object.
 *
 * @param keyId - The key ID to parse.
 * @returns The parsed key ID.
 */
export function parseThresholdKeyId(keyId: Json): ThresholdKeyId {
  if (typeof keyId !== 'string') {
    throw new Error('Invalid key ID');
  }
  return keyId;
}

/**
 * Parse verifier IDs from a JSON object.
 *
 * @param verifierIds - The verifier IDs to parse.
 * @returns The parsed verifier IDs.
 */
export function parseVerifierIds(verifierIds: Json): string[] {
  if (!Array.isArray(verifierIds)) {
    throw new Error('Invalid verifier IDs: expected an array');
  }
  for (const id of verifierIds) {
    if (typeof id !== 'string') {
      throw new Error('Invalid verifier ID: expected a string');
    }
  }
  return verifierIds as string[];
}

/**
 * Parse the selected verifier index from a JSON object.
 *
 * @param selectedVerifierIndex - The selected verifier index to parse.
 * @returns The parsed selected verifier index.
 */
export function parseSelectedVerifierIndex(
  selectedVerifierIndex: Json,
): number {
  if (typeof selectedVerifierIndex !== 'number') {
    throw new Error('Invalid selected verifier index: expected a number');
  }
  if (!Number.isInteger(selectedVerifierIndex) || selectedVerifierIndex < 0) {
    throw new Error(
      'Invalid selected verifier index: expected a non-negative integer',
    );
  }
  return selectedVerifierIndex;
}

/**
 * Parse custodians from a JSON object.
 *
 * @param custodians - The custodians to parse.
 * @returns The parsed custodians.
 */
export function parseCustodians(custodians: Json): Custodian[] {
  if (!Array.isArray(custodians)) {
    throw new Error('Invalid custodians: expected an array');
  }
  for (const custodian of custodians) {
    if (
      !custodian ||
      typeof custodian !== 'object' ||
      Array.isArray(custodian)
    ) {
      throw new Error('Invalid custodian: expected an object');
    }
    if (typeof custodian.partyId !== 'string') {
      throw new Error('Invalid custodian partyId: expected a string');
    }
    if (custodian.type !== 'user' && custodian.type !== 'cloud') {
      throw new Error(
        "Invalid custodian type: expected 'user' or 'cloud'",
      );
    }
  }
  return custodians as Custodian[];
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
