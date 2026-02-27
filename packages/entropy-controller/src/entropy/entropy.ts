import type { BitcoinSigner } from '../signer';

/**
 * The type of entropy source.
 */
export type EntropyType =
  // Entropies that use BIP-44 to derive signers.
  | 'bip44'
  // Entropies that expose basic private key signers.
  | 'private-key';

/**
 * Unique identifier for an entropy source.
 */
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
   * Gets a Bitcoin signer from the entropy.
   *
   * @param options - Options for getting the signer.
   * @returns The Bitcoin signer.
   */
  getBitcoinSigner(options: unknown): Promise<BitcoinSigner>;
};

/**
 * A single node in a BIP-32 derivation path, either normal or hardened (with `'`).
 */
export type Bip32PathNode = `${number}` | `${number}'`;

/**
 * Options for getting a signer from a BIP-44 entropy source.
 */
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

  getBitcoinSigner(options: Bip44GetSignerOptions): Promise<BitcoinSigner>;
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

  getBitcoinSigner(): Promise<BitcoinSigner>;
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

/**
 * Controller for managing entropy sources.
 */
export type EntropyController = {
  /**
   * Adds a new entropy source.
   *
   * @param entropy - The entropy to add.
   */
  addEntropy(entropy: Entropy): Promise<void>;

  /**
   * Updates an existing entropy source.
   *
   * @param entropyId - The ID of the entropy to update.
   * @param entropy - The new entropy data.
   */
  updateEntropy(entropyId: EntropyId, entropy: Entropy): Promise<void>;

  /**
   * Deletes an entropy source.
   *
   * @param entropyId - The ID of the entropy to delete.
   */
  deleteEntropy(entropyId: EntropyId): Promise<void>;

  /**
   * Gets an entropy source by its ID.
   *
   * @param entropyId - The ID of the entropy to retrieve.
   * @returns The matching entropy.
   */
  getEntropyById(entropyId: EntropyId): Promise<Entropy>;

  /**
   * Gets all entropy sources of a given type.
   *
   * @param entropyType - The type of entropy to filter by.
   * @returns The matching entropies.
   */
  getEntropyByType(entropyType: EntropyType): Promise<Entropy[]>;
};
