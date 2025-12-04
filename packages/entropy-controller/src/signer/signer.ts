export type PrivateKey = string;

export type PublicKey = string;

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

export type Signer = PrivateKeySigner | IntentSigner | DataSigner;

/**
 * Checks if the signer is an IntentSigner.
 *
 * @param signer - The signer to check.
 * @returns True if the signer is an IntentSigner, false otherwise.
 */
export function isIntentSigner(signer: Signer): signer is IntentSigner {
  return 'signIntent' in signer;
}

/**
 * Checks if the signer is a DataSigner.
 *
 * @param signer - The signer to check.
 * @returns True if the signer is a DataSigner, false otherwise.
 */
export function isDataSigner(signer: Signer): signer is DataSigner {
  return 'signData' in signer;
}

/**
 * Checks if the signer is a PrivateKeySigner.
 *
 * @param signer - The signer to check.
 * @returns True if the signer is a PrivateKeySigner, false otherwise.
 */
export function isPrivateKeySigner(signer: Signer): signer is PrivateKeySigner {
  return 'getPrivateKey' in signer;
}
