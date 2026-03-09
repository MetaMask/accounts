import type { Signer } from '../signer';

/**
 * The type of entropy source.
 *
 * - `'bip44'` — Entropy that uses BIP-44 to derive signers.
 * - `'private-key'` — Entropy that exposes a basic private key signer.
 */
export type EntropyType = 'bip44' | 'private-key';

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
   * Gets a signer for a given scope from the entropy.
   *
   * @param scope - The CAIP-2 scope for which to get the signer
   * (e.g. `"bip122"` for Bitcoin, `"eip155"` for EVM).
   * @param options - Scope-specific options for getting the signer.
   * @returns The signer for the specified scope.
   */
  getSigner(scope: string, options: unknown): Promise<Signer>;
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
   * The derivation path that should be used to derive the signer.
   */
  path: Bip32PathNode[];
};

/**
 * BIP-44 entropy interface.
 */
export type Bip44Entropy = Entropy & {
  type: 'bip44';

  id: EntropyId;

  getSigner(scope: string, options: Bip44GetSignerOptions): Promise<Signer>;
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

  getSigner(scope: string): Promise<Signer>;
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
