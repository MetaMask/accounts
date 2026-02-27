export type PrivateKey = string;

/**
 * Represents a signer's public key information.
 *
 * Can be one of:
 * - An address only.
 * - A public key with an optional chain code.
 * - An address with a public key and an optional chain code.
 */
export type PublicKey =
  | {
      address: string;
    }
  | {
      publicKey: string;
      chainCode?: string;
    }
  | {
      address: string;
      publicKey: string;
      chainCode?: string;
    };

export type SigningIntent = string;

export type SigningData = string;

export type Signature = string;

export type SigningRequestType = 'intent' | 'data';

/**
 * Base signer type.s
 */
type BaseSigner = {
  getPublicKey(): Promise<PublicKey>;
};

/**
 * Signer that can sign intents.
 *
 * Intents are structured data that include context about what is being signed.
 */
export type IntentSigner = BaseSigner & {
  /**
   * Signs a signing intent.
   *
   * @param intent - The intent to sign.
   * @returns The signature.
   */
  signIntent(intent: SigningIntent): Promise<Signature>;
};

/**
 * Signer that can sign arbitrary raw data.
 */
export type DataSigner = BaseSigner & {
  /**
   * Signs arbitrary raw data.
   *
   * @param data - The data to sign.
   * @returns The signature.
   */
  signData(data: SigningData): Promise<Signature>;
};

/**
 * Signer based on a simple private key.
 */
export type PrivateKeySigner = DataSigner & {
  /**
   * Gets the private key used by the signer.
   *
   * @returns The private key.
   */
  getPrivateKey(): Promise<PrivateKey>;
};
