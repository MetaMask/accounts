import type { Signer } from './signer';

/**
 * Response from {@link Bip122Signer.getXpub}.
 */
export type GetXpubResponse = {
  /**
   * The serialized extended public key string (e.g., xpub..., ypub..., zpub...).
   */
  xpub: string;

  /**
   * The fingerprint of the master root key (4 bytes, hex-encoded).
   */
  fingerprint: string;
};

/**
 * Response from {@link Bip122Signer.getAddress}.
 */
export type GetAddressResponse = {
  /**
   * The Bitcoin address.
   */
  address: string;
};

/**
 * Arguments for {@link Bip122Signer.signPsbt}.
 */
export type SignPsbtArguments = {
  /**
   * The PSBT to sign (base64-encoded).
   */
  psbt: string;
};

/**
 * Response from {@link Bip122Signer.signPsbt}.
 */
export type SignPsbtResponse = {
  /**
   * The PSBT with signatures added (base64-encoded). May still be partially signed if
   * the transaction requires multiple signers (e.g., multisig).
   */
  psbt: string;
};

/**
 * Arguments for {@link Bip122Signer.signMessage}.
 */
export type SignMessageArguments = {
  /**
   * The message to sign (UTF-8 string).
   */
  message: string;
};

/**
 * Response from {@link Bip122Signer.signMessage}.
 */
export type SignMessageResponse = {
  /**
   * The signature (base64-encoded). The format depends on the address type (BIP-137 for
   * legacy, BIP-322 for segwit and taproot).
   */
  signature: string;
};

/**
 * Bitcoin signer interface.
 *
 * Defines the signing operations needed for Bitcoin, independent of the entropy source
 * (SRP, Ledger, Trezor, etc.).
 *
 * The full derivation path (including change and index) is bound at construction time,
 * so each signer instance corresponds to a single address (e.g. `m/84'/0'/0'/0/0`).
 */
export type Bip122Signer = Signer & {
  /**
   * Gets the extended public key for the account.
   *
   * @returns The xpub and master fingerprint.
   */
  getXpub(): Promise<GetXpubResponse>;

  /**
   * Gets the address for this signer's derivation path.
   *
   * @returns The address.
   */
  getAddress(): Promise<GetAddressResponse>;

  /**
   * Signs a PSBT (Partially Signed Bitcoin Transaction).
   *
   * The signer signs all inputs it can sign (those matching its derivation) and returns
   * the updated PSBT with signatures added.
   *
   * @param args - The PSBT signing arguments.
   * @returns The updated PSBT.
   */
  signPsbt(args: SignPsbtArguments): Promise<SignPsbtResponse>;

  /**
   * Signs a message using Bitcoin Signed Message format.
   *
   * @param args - The message signing arguments.
   * @returns The signature.
   */
  signMessage(args: SignMessageArguments): Promise<SignMessageResponse>;
};

/**
 * Checks if a signer is a {@link Bip122Signer}.
 *
 * @param signer - The signer to check.
 * @returns True if the signer's scope starts with `"bip122:"`.
 */
export function isBip122Signer(signer: Signer): signer is Bip122Signer {
  return signer.scope.startsWith('bip122:');
}
