import type { KeyDerivationPurpose } from '@metamask/key-derivation-purposes';
import { mnemonicToSeed, validateMnemonic } from '@metamask/scure-bip39';
import { wordlist } from '@metamask/scure-bip39/dist/wordlists/english';
import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha2';
import { HDKey } from 'ethereum-cryptography/hdkey';

declare const keyRootBrand: unique symbol;

/**
 * An opaque shared key root. Keep it secret and use it only with
 * {@link deriveEncryptionKey}; it is not a signing or encryption key.
 *
 * This handle is local to this SDK instance and cannot be serialized.
 * Opacity discourages misuse; it is not a security boundary.
 */
export type KeyRoot = {
  readonly [keyRootBrand]: true;
};

const roots = new WeakMap<KeyRoot, Uint8Array>();

// Four-byte ASCII labels `meta`, `mask`, and `keys`, interpreted big-endian.
const KEY_ROOT_PATH = "m/1835365473'/1835103083'/1801812339'";

/**
 * Derives an opaque shared key root using the fixed ADR-0009 scheme:
 * BIP-39 (empty passphrase), then secp256k1 BIP-32 at `m/meta'/mask'/keys'/index'`.
 * Local entropy-source identifiers never participate in derivation.
 *
 * @param options - Root derivation options.
 * @param options.mnemonic - A BIP-39 phrase string, validated against the English
 * wordlist after NFKD normalization. Convert other representations explicitly.
 * @param options.index - Key generation, an integer from 0 through 2^31 - 1.
 * Defaults to 0 when omitted or undefined.
 * @returns An opaque root granting access to every purpose at this index.
 * @throws If the mnemonic or index is invalid.
 */
export async function deriveKeyRoot({
  mnemonic,
  index = 0,
}: {
  mnemonic: string;
  index?: number | undefined;
}): Promise<KeyRoot> {
  if (!Number.isInteger(index) || index < 0 || index > 0x7fffffff) {
    throw new Error(
      'Invalid key index: expected an integer from 0 to 2^31 - 1',
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
      `${KEY_ROOT_PATH}/${index}'`,
    );
    if (!privateKey) {
      throw new Error('Failed to derive key root');
    }
    const root = Object.freeze({}) as KeyRoot;
    roots.set(root, privateKey);
    return root;
  } finally {
    seed.fill(0);
  }
}

/**
 * Derives a 32-byte symmetric encryption key using HKDF-SHA256, with the root as
 * input key material, a 32-byte zero salt, and the UTF-8 purpose as info.
 * These parameters are fixed by ADR-0009, not versioned by the purpose.
 * Encryption keys can protect key material or application data, but MUST NOT
 * be reinterpreted as signing keys. Future key types require separate helpers
 * specifying their algorithm and domain separation.
 *
 * @param options - Encryption-key derivation options.
 * @param options.root - An opaque root returned by {@link deriveKeyRoot}.
 * @param options.purpose - A unique, stable, versioned, non-empty string, such as
 * `metamask:money-account:mfa:encryption-key:v1`. Retain this exact string and the
 * root's index with recoverable encrypted data.
 * @returns The raw 32-byte encryption key. Fingerprint these bytes, not the root.
 * @throws If the root is not from this SDK instance or the purpose is invalid.
 */
export async function deriveEncryptionKey({
  root,
  purpose,
}: {
  root: KeyRoot;
  purpose: KeyDerivationPurpose;
}): Promise<Uint8Array> {
  const privateKey = roots.get(root);
  if (!privateKey) {
    throw new Error('Invalid key root');
  }
  if (
    typeof purpose !== 'string' ||
    !/^metamask:.+:v[0-9]+(?![\s\S])/u.test(purpose)
  ) {
    throw new Error(
      'Invalid key purpose: expected metamask:<scope>:v<non-negative integer>',
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
