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
      // BIP-85 specifies HMAC-SHA512(key="bip-entropy-from-k", msg=k), where
      // k is the raw 32-byte child private key, including leading zeros.
      // https://github.com/bitcoin/bips/blob/master/bip-0085.mediawiki#specification
      entropy = hmac(
        sha512,
        new TextEncoder().encode('bip-entropy-from-k'),
        node.privateKey,
      );
      // Our profile uses a 256-bit root. Copy so the full BIP-85 output can be wiped.
      return new KeyRoot(entropy.slice(0, 32));
    } finally {
      seed.fill(0);
      entropy?.fill(0);
      node?.wipePrivateData();
      master?.wipePrivateData();
    }
  }

  /**
   * Derives secret bytes using HKDF-SHA256, a 32-byte zero salt, and exactly
   * the UTF-8 purpose as info. Output is not automatically a valid private key.
   * Outputs for the same purpose are prefix-related across lengths; use distinct
   * purposes for distinct uses. Longer output does not increase source entropy.
   *
   * @param options - Secret derivation options.
   * @param options.purpose - Stable, versioned purpose. Retain its exact value
   * and the effective root index with recoverable encrypted data. Callers are
   * responsible for following the purpose format; it is not checked at runtime.
   * @param options.length - Output length in bytes, an integer from 1 to 8160.
   * @returns Independent secret bytes, owned and eventually cleared by the
   * caller. Destroying the root does not clear already-derived keys.
   * @throws If the root is destroyed or the length is invalid.
   */
  async deriveSecret({
    purpose,
    length,
  }: {
    purpose: KeyDerivationPurpose;
    length: number;
  }): Promise<Uint8Array> {
    if (this.#destroyed) {
      throw new Error('Key root has been destroyed');
    }
    if (!Number.isInteger(length) || length < 1 || length > 255 * 32) {
      throw new Error(
        'Invalid secret length: expected an integer from 1 to 8160',
      );
    }
    return hkdf(
      sha256,
      this.#bytes,
      new Uint8Array(32),
      new TextEncoder().encode(purpose),
      length,
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
