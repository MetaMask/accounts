/* eslint-disable no-restricted-globals -- Buffer is required for HD-key and UR construction. */

import { mnemonicToSeedSync } from '@metamask/bip39';
import type { Hex } from '@metamask/utils';
import HdKey from 'hdkey';

import {
  QR_EMULATOR_ACCOUNT_DERIVATION_PATH,
  QR_EMULATOR_CHILDREN_PATH,
  QR_EMULATOR_SEED,
} from '../constants';
import { deriveAddressFromSeed } from '../constants';
import {
  createCryptoAccount,
  createCryptoHDKey,
  createCryptoOutput,
  parseXfp,
} from './registry';

/** Pairing mode: bundle of derived addresses, or a single account xpub. */
export type QrPairMode = 'crypto-account' | 'crypto-hdkey';

/** UR type string for a crypto-account UR. */
export const CRYPTO_ACCOUNT_TYPE = 'crypto-account';

/** UR type string for a crypto-hdkey UR. */
export const CRYPTO_HDKEY_TYPE = 'crypto-hdkey';

/** Serialized UR shape consumed by the QR keyring. */
export type SerializedUR = {
  type: string;
  cbor: string;
};

/**
 * Options for synthesizing a pairing UR from a seed.
 */
export type SynthesizeOptions = {
  /** BIP-39 mnemonic seed. */
  seed: string;
  /** Full account derivation path (e.g. `m/44'/60'/0'`). */
  accountPath: string;
  /** Children path within the account (e.g. `0/*`). */
  childrenPath: string;
  /** Device fingerprint, hex (optionally `0x`-prefixed). */
  xfp: string;
  /** Human-readable device name. */
  deviceName: string;
  /** Pairing mode. */
  pairMode: QrPairMode;
  /** Number of address descriptors to emit in `crypto-account` mode. */
  descriptorCount: number;
};

/** Default descriptor count for `crypto-account` mode. */
export const DEFAULT_DESCRIPTOR_COUNT = 5;

/**
 * Derive the root HD key from a mnemonic seed.
 *
 * @param seed - The BIP-39 mnemonic.
 * @returns The master HDKey.
 */
export function getMasterKey(seed: string = QR_EMULATOR_SEED): HdKey {
  return HdKey.fromMasterSeed(mnemonicToSeedSync(seed));
}

/**
 * Derive a child HD key from a seed at a full derivation path.
 *
 * @param seed - The BIP-39 mnemonic.
 * @param path - The full derivation path (e.g. `m/44'/60'/0'/0/0`).
 * @returns The derived HDKey.
 */
export function deriveKey(seed: string, path: string): HdKey {
  return getMasterKey(seed).derive(path);
}

/**
 * Build a `crypto-account` UR (a bundle of output descriptors, one per derived
 * address). This is the default pairing mode.
 *
 * @param options - Synthesize options.
 * @returns A SerializedUR with type `crypto-account`.
 */
export function buildCryptoAccountUR(options: SynthesizeOptions): SerializedUR {
  const sourceFingerprint = parseXfp(options.xfp);
  const outputs = Array.from(
    { length: options.descriptorCount },
    (_, index) => {
      const path = `${options.accountPath}/0/${index}`;
      const child = deriveKey(options.seed, path);
      return createCryptoOutput(
        createCryptoHDKey({
          publicKey: Buffer.from(child.publicKey),
          chainCode: Buffer.from(child.chainCode),
          originPath: options.accountPath
            .replace(/^[mM]\//u, '')
            .concat(`/0/${index}`),
          sourceFingerprint,
          name: options.deviceName,
          note: options.deviceName,
        }),
      );
    },
  );

  const account = createCryptoAccount(sourceFingerprint, outputs);
  const ur = account.toUR();
  return { type: ur.type, cbor: ur.cbor.toString('hex') };
}

/**
 * Build a `crypto-hdkey` UR (a single account-level extended public key). The
 * consumer derives child addresses from it using the children path.
 *
 * @param options - Synthesize options.
 * @returns A SerializedUR with type `crypto-hdkey`.
 */
export function buildCryptoHDKeyUR(options: SynthesizeOptions): SerializedUR {
  const sourceFingerprint = parseXfp(options.xfp);
  const accountKey = deriveKey(options.seed, options.accountPath);

  const hdKey = createCryptoHDKey({
    publicKey: Buffer.from(accountKey.publicKey),
    chainCode: Buffer.from(accountKey.chainCode),
    originPath: options.accountPath.replace(/^[mM]\//u, ''),
    sourceFingerprint,
    childrenPath: options.childrenPath.replace(/^[mM]\//u, ''),
    name: options.deviceName,
    note: options.deviceName,
  });

  const ur = hdKey.toUR();
  return { type: ur.type, cbor: ur.cbor.toString('hex') };
}

/**
 * Synthesize the pairing UR for the given mode. Defaults to
 * `crypto-account` (the canonical Keystone pairing format).
 *
 * @param options - Synthesize options.
 * @returns A SerializedUR the QR keyring can deserialize.
 */
export function synthesizeAccountUR(options: SynthesizeOptions): SerializedUR {
  return options.pairMode === 'crypto-hdkey'
    ? buildCryptoHDKeyUR(options)
    : buildCryptoAccountUR(options);
}

/**
 * Convenience: derive the address at a given index relative to an account path,
 * matching the children-path convention (`0/*`).
 *
 * @param seed - The BIP-39 mnemonic.
 * @param accountPath - The full account derivation path.
 * @param index - The child index.
 * @returns The EIP-55 checksum address.
 */
export function deriveAccountAddress(
  seed: string,
  accountPath: string,
  index: number,
): Hex {
  return deriveAddressFromSeed(seed, `${accountPath}/0/${index}`);
}

export { QR_EMULATOR_CHILDREN_PATH, QR_EMULATOR_ACCOUNT_DERIVATION_PATH };
