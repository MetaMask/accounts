import { mnemonicToSeed, validateMnemonic } from '@metamask/scure-bip39';
import { wordlist } from '@metamask/scure-bip39/dist/wordlists/english';
import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha2';
import { HDKey } from 'ethereum-cryptography/hdkey';

declare const wrappingKeyRootBrand: unique symbol;

/**
 * An opaque wrapping-key root. Keep it secret and use it only with
 * {@link deriveWrappingKey}; it is not a signing or encryption key.
 *
 * This handle is local to this SDK instance and cannot be serialized.
 * Opacity discourages misuse; it is not a security boundary.
 */
export type WrappingKeyRoot = {
  readonly [wrappingKeyRootBrand]: true;
};

/**
 * A namespaced, versioned wrapping-key purpose. Use a unique, stable scope
 * and a non-negative integer version.
 */
export type WrappingKeyPurpose = `metamask:${string}:v${number}`;

const roots = new WeakMap<WrappingKeyRoot, Uint8Array>();

// Four-byte ASCII labels `meta`, `mask`, and `wrap`, interpreted big-endian.
const WRAPPING_KEY_PATH = "m/1835365473'/1835103083'/2003984752'";

/**
 * Derives an opaque wrapping-key root using the fixed ADR-0009 scheme:
 * BIP-39 (empty passphrase), then secp256k1 BIP-32 at `meta'/mask'/wrap'/index'`.
 * Local entropy-source identifiers never participate in derivation.
 *
 * @param options - Root derivation options.
 * @param options.mnemonic - A BIP-39 phrase string, validated against the English
 * wordlist after NFKD normalization. Convert other representations explicitly.
 * @param options.index - Key generation, an integer from 0 through 2^31 - 1.
 * @returns An opaque root granting access to every purpose at this index.
 * @throws If the mnemonic or index is invalid.
 */
export async function deriveWrappingKeyRoot({
  mnemonic,
  index,
}: {
  mnemonic: string;
  index: number;
}): Promise<WrappingKeyRoot> {
  if (!Number.isInteger(index) || index < 0 || index > 0x7fffffff) {
    throw new Error(
      'Invalid wrapping-key index: expected an integer from 0 to 2^31 - 1',
    );
  }
  if (typeof mnemonic !== 'string') {
    throw new Error('Invalid mnemonic: expected a BIP-39 phrase string');
  }
  const normalizedMnemonic = mnemonic.normalize('NFKD');
  if (!validateMnemonic(normalizedMnemonic, wordlist)) {
    throw new Error('Invalid mnemonic: expected a valid English BIP-39 phrase');
  }

  const seed = await mnemonicToSeed(normalizedMnemonic, wordlist, '');
  try {
    const { privateKey } = HDKey.fromMasterSeed(seed).derive(
      `${WRAPPING_KEY_PATH}/${index}'`,
    );
    if (!privateKey) {
      throw new Error('Failed to derive wrapping-key root');
    }
    const root = Object.freeze({}) as WrappingKeyRoot;
    roots.set(root, privateKey);
    return root;
  } finally {
    seed.fill(0);
  }
}

/**
 * Derives a 32-byte symmetric wrapping key using HKDF-SHA256, with the root as
 * input key material, a 32-byte zero salt, and the UTF-8 purpose as info.
 * These parameters are fixed by ADR-0009, not versioned by the purpose.
 *
 * @param options - Wrapping-key derivation options.
 * @param options.root - An opaque root returned by {@link deriveWrappingKeyRoot}.
 * @param options.purpose - A unique, stable, versioned, non-empty string, such as
 * `metamask:money-account:mfa:encryption-key:v1`. Retain this exact string and the
 * root's index with recoverable encrypted data.
 * @returns The raw 32-byte wrapping key. Fingerprint these bytes, not the root.
 * @throws If the root is not from this SDK instance or the purpose is invalid.
 */
export async function deriveWrappingKey({
  root,
  purpose,
}: {
  root: WrappingKeyRoot;
  purpose: WrappingKeyPurpose;
}): Promise<Uint8Array> {
  const privateKey = roots.get(root);
  if (!privateKey) {
    throw new Error('Invalid wrapping-key root');
  }
  if (
    typeof purpose !== 'string' ||
    !/^metamask:.+:v[0-9]+(?![\s\S])/u.test(purpose)
  ) {
    throw new Error(
      'Invalid wrapping-key purpose: expected metamask:<scope>:v<non-negative integer>',
    );
  }
  return hkdf(
    sha256,
    privateKey,
    new Uint8Array(32),
    new TextEncoder().encode(purpose),
    32,
  );
}
