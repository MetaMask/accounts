/* eslint-disable no-restricted-globals -- Buffer is required for ECDSA signing. */

/* eslint-disable id-length -- r/s/v are the canonical ECDSA signature component names. */

import { RLP } from '@ethereumjs/rlp';
import {
  ETHSignature,
  EthSignRequest,
  DataType,
} from '@keystonehq/bc-ur-registry-eth';
import { mnemonicToSeedSync } from '@metamask/bip39';
import {
  personalSign,
  signTypedData,
  SignTypedDataVersion,
} from '@metamask/eth-sig-util';
import { add0x } from '@metamask/utils';
import { keccak256 } from 'ethereum-cryptography/keccak';
import HdKey from 'hdkey';
import { ecdsaSign } from 'secp256k1';

import { QR_EMULATOR_SEED } from '../constants';
import type { SerializedUR } from './ur-synth';

/**
 * Result of a signing operation: the three ECDSA signature components.
 * `v` is encoded as minimal big-endian bytes (1 byte for parity/27-28, more
 * for EIP-155 legacy chain-id-encoded values).
 */
type SignatureParts = {
  r: Buffer;
  s: Buffer;
  v: Buffer;
};

/** Options for the signer. */
export type SignerOptions = {
  /** BIP-39 mnemonic seed used to derive signing keys. */
  seed: string;
};

/**
 * Convert a non-negative bigint to minimal big-endian bytes (matching
 * `@ethereumjs/util`'s `bigIntToUnpaddedBytes`).
 *
 * @param value - The non-negative bigint.
 * @returns Minimal big-endian bytes.
 */
function bigIntToUnpaddedBytes(value: bigint): Buffer {
  if (value === 0n) {
    return Buffer.alloc(0);
  }
  const hexString = value.toString(16);
  const padded = hexString.length % 2 === 0 ? hexString : `0${hexString}`;
  return Buffer.from(padded, 'hex');
}

/**
 * Derive the 32-byte private key at a full derivation path from a seed.
 *
 * @param seed - The BIP-39 mnemonic.
 * @param path - The full derivation path, with or without a leading `m/`.
 * @returns The 32-byte private key.
 */
export function derivePrivateKey(seed: string, path: string): Buffer {
  const normalized = path.startsWith('m') ? path : `m/${path}`;
  const child = HdKey.fromMasterSeed(mnemonicToSeedSync(seed)).derive(
    normalized,
  );
  return Buffer.from(child.privateKey);
}

/**
 * Sign a transaction signing payload (the output of
 * `Transaction.getMessageToSign()`, RLP-encoded) with ECDSA and compute the
 * correct `v` value.
 *
 * - Legacy (`DataType.transaction`): honours EIP-155 when the payload carries a
 *   chain id (9 RLP items); otherwise emits pre-EIP-155 `v` (27/28).
 * - Typed (`DataType.typedTransaction`): emits parity `v` (0/1).
 *
 * @param signData - The RLP-encoded signing payload.
 * @param dataType - The BC-UR registry data type.
 * @param privateKey - The 32-byte private key.
 * @returns The signature parts.
 */
function signTransactionPayload(
  signData: Buffer,
  dataType: DataType,
  privateKey: Buffer,
): SignatureParts {
  const hash = keccak256(signData);
  const { signature, recid } = ecdsaSign(
    Uint8Array.from(hash),
    Uint8Array.from(privateKey),
  );
  const r = Buffer.from(signature.subarray(0, 32));
  const s = Buffer.from(signature.subarray(32, 64));

  let v: Buffer;
  if (dataType === DataType.transaction) {
    const decoded = RLP.decode(signData);
    if (Array.isArray(decoded) && decoded.length === 9) {
      const chainIdBytes = Buffer.from(decoded[6] as Uint8Array);
      const chainIdHex =
        chainIdBytes.length === 0 ? '0' : chainIdBytes.toString('hex');
      const chainId = BigInt(`0x${chainIdHex}`);
      v = bigIntToUnpaddedBytes(chainId * 2n + 35n + BigInt(recid));
    } else {
      v = Buffer.from([27 + recid]);
    }
  } else {
    v = Buffer.from([recid]);
  }

  return { r, s, v };
}

/**
 * Sign an EIP-191 personal message payload using `@metamask/eth-sig-util`.
 *
 * @param signData - The raw message bytes (already hex-decoded by the keyring).
 * @param privateKey - The 32-byte private key.
 * @returns The signature parts (v is 27/28).
 */
function signPersonalMessagePayload(
  signData: Buffer,
  privateKey: Buffer,
): SignatureParts {
  const signature = personalSign({
    privateKey,
    data: add0x(signData.toString('hex')),
  });
  const bytes = Buffer.from(signature.slice(2), 'hex');
  return {
    r: bytes.subarray(0, 32),
    s: bytes.subarray(32, 64),
    v: bytes.subarray(64),
  };
}

/**
 * Sign EIP-712 typed data (v4) using `@metamask/eth-sig-util`.
 *
 * @param signData - The UTF-8 JSON-encoded typed data.
 * @param privateKey - The 32-byte private key.
 * @returns The signature parts (v is 27/28).
 */
function signTypedDataPayload(
  signData: Buffer,
  privateKey: Buffer,
): SignatureParts {
  const data = JSON.parse(signData.toString('utf8'));
  const signature = signTypedData({
    privateKey,
    data,
    version: SignTypedDataVersion.V4,
  });
  const bytes = Buffer.from(signature.slice(2), 'hex');
  return {
    r: bytes.subarray(0, 32),
    s: bytes.subarray(32, 64),
    v: bytes.subarray(64),
  };
}

/**
 * Decode an `EthSignRequest` SerializedUR into the registry object.
 *
 * @param ur - The SerializedUR (type `eth-sign-request`).
 * @returns The decoded EthSignRequest.
 */
export function decodeSignRequest(ur: SerializedUR): EthSignRequest {
  return EthSignRequest.fromCBOR(Buffer.from(ur.cbor, 'hex'));
}

/**
 * Sign an `EthSignRequest` SerializedUR and produce an `eth-signature`
 * SerializedUR containing a real ECDSA signature from the derived key.
 *
 * The returned `requestId` mirrors the incoming request so the QR keyring's
 * request-id validation succeeds.
 *
 * @param ur - The SerializedUR of the sign request.
 * @param options - Signer options.
 * @returns A SerializedUR (type `eth-signature`).
 */
export function signRequest(
  ur: SerializedUR,
  options: SignerOptions = { seed: QR_EMULATOR_SEED },
): SerializedUR {
  const request = decodeSignRequest(ur);
  const dataType = request.getDataType();
  const signData = Buffer.from(request.getSignData());
  const path = request.getDerivationPath() ?? '';
  const privateKey = derivePrivateKey(options.seed, path);

  let parts: SignatureParts;
  switch (dataType) {
    case DataType.transaction:
    case DataType.typedTransaction:
      parts = signTransactionPayload(signData, dataType, privateKey);
      break;
    case DataType.personalMessage:
      parts = signPersonalMessagePayload(signData, privateKey);
      break;
    case DataType.typedData:
      parts = signTypedDataPayload(signData, privateKey);
      break;
    default:
      throw new Error(
        `Unsupported sign request data type: ${String(dataType)}`,
      );
  }

  const signature = Buffer.concat([parts.r, parts.s, parts.v]);
  const requestId = request.getRequestId();
  const ethSignature = new ETHSignature(signature, requestId);
  const result = ethSignature.toUR();
  return { type: result.type, cbor: result.cbor.toString('hex') };
}
