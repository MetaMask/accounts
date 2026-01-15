import type { Signer } from '../signer';

export type EntropyType =
  // Entropies that use BIP-44 to derive signers.
  | 'bip44'
  // Entropies that expose basic private key signers.
  | 'private-key';

export type EntropyId = string;

/**
 * Represents a source of entropy that can provide signers.
 */
export type Entropy = {
  /**
   * The unique identifier for the entropy.
   */
  id: EntropyId;

  /**
   * The type of the entropy.
   */
  type: EntropyType;

  /**
   * Gets a signer from the entropy.
   *
   * @param options - Options for getting the signer.
   * @returns The signer.
   */
  getSigner(options: unknown): Promise<Signer>;
};

export type Bip32PathNode = `${number}` | `${number}'`;

export type Bip44GetSignerOptions = {
  /**
   * The elliptic curve that should be used to derive the signer.
   */
  curve: 'secp256k1' | 'ed25519';

  /**
   * The derivation path that should be used to derive the signer.
   */
  derivationPath: Bip32PathNode[];
};

/**
 * BIP-44 entropy interface.
 */
export type Bip44Entropy = Entropy & {
  type: 'bip44';

  id: EntropyId;

  getSigner(options: Bip44GetSignerOptions): Promise<Signer>;
};

/**
 * Checks if the entropy is a Bip44Entropy.
 *
 * @param entropy - The entropy to check.
 * @returns True if the entropy is a Bip44Entropy, false otherwise.
 */
export function isBip44Entropy(entropy: Entropy): entropy is Bip44Entropy {
  return entropy.type === 'bip44';
}

/**
 * Private key entropy interface.
 */
export type PrivateKeyEntropy = Entropy & {
  type: 'private-key';

  id: EntropyId;

  getSigner(): Promise<Signer>;
};

/**
 * Checks if the entropy is a PrivateKeyEntropy.
 *
 * @param entropy - The entropy to check.
 * @returns True if the entropy is a PrivateKeyEntropy, false otherwise.
 */
export function isPrivateKeyEntropy(
  entropy: Entropy,
): entropy is PrivateKeyEntropy {
  return entropy.type === 'private-key';
}

export type EntropyController = {
  addEntropy(entropy: Entropy): Promise<void>;

  updateEntropy(entropyId: EntropyId, entropy: Entropy): Promise<void>;

  deleteEntropy(entropyId: EntropyId): Promise<void>;

  getEntropyById(entropyId: EntropyId): Promise<Entropy>;

  getEntropyByType(entropyType: EntropyType): Promise<Entropy[]>;
};
