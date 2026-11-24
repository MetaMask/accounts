import type { KeyDerivationPurpose } from '@metamask/key-derivation-purposes';
import { mnemonicToSeed, validateMnemonic } from '@metamask/scure-bip39';
import { wordlist } from '@metamask/scure-bip39/dist/wordlists/english';
import { hkdf } from '@noble/hashes/hkdf';
import { hmac } from '@noble/hashes/hmac';
import { sha256, sha512 } from '@noble/hashes/sha2';
import { HDKey } from 'ethereum-cryptography/hdkey';

// BIP-85 followed by decimal-concatenated ASCII codes for `META` and `MASK`.
const KEY_ROOT_PATH = "m/83696968'/77698465'/77658375'";

/**
 * A shared secret root for purpose-specific key derivation. Private storage
 * prevents accidental exposure, but is not a security boundary. Destroy the
 * root when finished to zeroize its owned buffer (best-effort cleanup, not
 * guaranteed erasure of all copies from process memory).
 */
export class KeyRoot {
  readonly #bytes: Uint8Array;

  #destroyed = false;

  // Constructors cannot use native # syntax; only the factory creates roots.
  // eslint-disable-next-line no-restricted-syntax
  private constructor(bytes: Uint8Array) {
    this.#bytes = bytes;
    Object.freeze(this);
  }

  /**
   * Derives a root using BIP-39 (empty passphrase), secp256k1 BIP-32 at
   * `m/83696968'/META'/MASK'/index'`, and the first 32 bytes of BIP-85's
   * HMAC-SHA512 output. Local entropy-source IDs are not used.
   *
   * @param options - Root derivation options.
   * @param options.mnemonic - English BIP-39 phrase, normalized with NFKD before
   * validation. Convert byte representations explicitly before calling.
   * @param options.index - Generation from 0 through 2^31 - 1; defaults to 0.
   * @returns A root granting access to every purpose at this index.
   * @throws If the mnemonic or index is invalid.
   */
  static async fromMnemonic({
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
      throw new Error(
        'Invalid mnemonic: expected a valid English BIP-39 phrase',
      );
    }

    const seed = await mnemonicToSeed(normalizedMnemonic, wordlist, '');
    let master: HDKey | undefined;
    let node: HDKey | undefined;
    let entropy: Uint8Array | undefined;
    try {
      master = HDKey.fromMasterSeed(seed);
      node = master.derive(`${KEY_ROOT_PATH}/${index}'`);
      if (!node.privateKey) {
        throw new Error('Failed to derive key root');
      }
      entropy = hmac(
        sha512,
        new TextEncoder().encode('bip-entropy-from-k'),
        node.privateKey,
      );
      // Copy rather than retain a view into the temporary entropy buffer.
      return new KeyRoot(entropy.slice(0, 32));
    } finally {
      seed.fill(0);
      entropy?.fill(0);
      node?.wipePrivateData();
      master?.wipePrivateData();
    }
  }

  /**
   * Derives a 32-byte encryption key using HKDF-SHA256, a 32-byte zero salt,
   * and exactly the UTF-8 purpose as info (ADR-0009). Do not reinterpret the
   * output as a signing key; other key types require separate constructions.
   *
   * @param options - Encryption-key derivation options.
   * @param options.purpose - Stable, versioned purpose. Retain its exact value
   * and the effective root index with recoverable encrypted data.
   * @returns Independent raw key bytes, owned and eventually cleared by the
   * caller. Destroying the root does not clear already-derived keys.
   * @throws If the root is destroyed or the purpose is invalid.
   */
  async deriveEncryptionKey({
    purpose,
  }: {
    purpose: KeyDerivationPurpose;
  }): Promise<Uint8Array> {
    if (this.#destroyed) {
      throw new Error('Key root has been destroyed');
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
      this.#bytes,
      new Uint8Array(32),
      new TextEncoder().encode(purpose),
      32,
    );
  }

  /**
   * Zeroizes the owned root buffer and permanently disables derivation.
   * Safe to call repeatedly. This cannot erase mnemonic strings, library or
   * runtime copies, or keys previously returned to the caller.
   */
  destroy(): void {
    this.#bytes.fill(0);
    this.#destroyed = true;
  }

  /**
   * Rejects serialization to prevent accidentally persisting an unusable root.
   *
   * @throws Always; roots cannot be serialized.
   */
  toJSON(): never {
    throw new Error('Key roots cannot be serialized');
  }
}
