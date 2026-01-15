import { bigIntToBytes, concatBytes, publicToAddress } from '@ethereumjs/util';
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
import type { Hex } from '@metamask/utils';
import { add0x, assert, bytesToHex, hexToBytes } from '@metamask/utils';

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
 * Parse an ECDSA signature.
 *
 * @param signature - The signature to parse.
 * @returns The parsed signature.
 */
export function parseEcdsaSignature(signature: Uint8Array): {
  r: Uint8Array;
  s: Uint8Array;
  v: bigint;
} {
  // TODO
}

/**
 * Convert an ECDSA signature to an Ethereum signature.
 *
 * @param signature - The signature to convert.
 * @returns The Ethereum signature.
 */
export function toEthSig(signature: Uint8Array): string {
  const { r, s, v } = parseEcdsaSignature(signature);
  const vRaw = bigIntToBytes(v);

  if (vRaw.length !== 1) {
    throw new Error('Invalid signature');
  }

  return bytesToHex(concatBytes(vRaw, r, s));
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
