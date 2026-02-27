/**
 * Response from {@link BitcoinSigner.getXpub}.
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
 * Arguments for {@link BitcoinSigner.getAddress}.
 */
export type GetAddressArguments = {
  /**
   * Whether this is a change address (0 = receiving, 1 = change).
   */
  change: 0 | 1;

  /**
   * The address index.
   */
  index: number;
};

/**
 * Response from {@link BitcoinSigner.getAddress}.
 */
export type GetAddressResponse = {
  /**
   * The Bitcoin address.
   */
  address: string;
};

/**
 * Arguments for {@link BitcoinSigner.signPsbt}.
 */
export type SignPsbtArguments = {
  /**
   * The PSBT to sign (base64-encoded).
   */
  psbt: string;
};

/**
 * Response from {@link BitcoinSigner.signPsbt}.
 */
export type SignPsbtResponse = {
  /**
   * The PSBT with signatures added (base64-encoded). May still be partially
   * signed if the transaction requires multiple signers (e.g., multisig).
   */
  psbt: string;
};

/**
 * Arguments for {@link BitcoinSigner.signMessage}.
 */
export type SignMessageArguments = {
  /**
   * The message to sign (UTF-8 string).
   */
  message: string;
};

/**
 * Response from {@link BitcoinSigner.signMessage}.
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
 * The derivation path and address type are bound at construction time, so a signer for
 * `m/84'/0'/0'` is a different instance than one for `m/86'/0'/0'`.
 */
export type BitcoinSigner = {
  /**
   * Gets the extended public key for the account.
   *
   * @returns The xpub and master fingerprint.
   */
  getXpub(): Promise<GetXpubResponse>;

  /**
   * Gets an address at a specific index.
   *
   * The signer already knows its account-level derivation path. The caller only needs
   * to specify the final two path segments.
   *
   * @param args - The address derivation arguments.
   * @returns The address.
   */
  getAddress(args: GetAddressArguments): Promise<GetAddressResponse>;

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
