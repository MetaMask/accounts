import {
  bigIntToBytes,
  concatBytes,
  ecrecover,
  publicToAddress,
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

import type { InitRole, ThresholdKeyId } from './types';

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

  const rBuf = signature.slice(0, 32);
  const sBuf = signature.slice(32, 64);

  const expectedAddr = publicToAddressHex(pubKey);

  for (const candidateV of [0n, 1n]) {
    try {
      const candidatePubKey = ecrecover(hash, candidateV + 27n, rBuf, sBuf);
      if (publicToAddressHex(candidatePubKey) === expectedAddr) {
        const vInt = candidateV + 27n;
        return concatBytes(rBuf, sBuf, bigIntToBytes(vInt));
      }
    } catch {
      // Ignore errors
    }
  }

  throw new Error('Invalid signature');
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
 * Parse the init role from a JSON object.
 *
 * @param initRole - The init role to parse.
 * @returns The parsed init role.
 */
export function parseInitRole(initRole: Json): InitRole {
  if (initRole !== 'initiator' && initRole !== 'responder') {
    throw new Error('Invalid init role');
  }
  return initRole;
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
