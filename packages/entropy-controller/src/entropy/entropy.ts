import type { CaipChainId, KeyringAccountType } from '@metamask/keyring-api';

import type { Signer } from '../signer';
import type { Eip155Scope, Eip155Signer } from '../signer/eip155-signer';
import type { Bip32PathNode } from '../signer/signer';

/**
 * The category of entropy source.
 *
 * - `'bip44'` — Entropy that uses BIP-44 to derive signers.
 * - `'raw'` — Entropy that exposes a single key directly, without derivation.
 */
export type EntropyCategory = 'bip44' | 'raw';

/**
 * The type of entropy source, expressed as `category:implementation`.
 *
 * Examples: `'bip44:mnemonic'`, `'bip44:ledger'`, `'raw:private-key'`, `'raw:mpc'`.
 */
export type EntropyType = `${EntropyCategory}:${string}`;

/**
 * Unique identifier for an entropy source.
 */
export type EntropyId = string;

/**
 * Maps a CAIP-2 scope to its corresponding signer type.
 *
 * Add a branch here when introducing a new scope/signer pair.
 */
export type ScopeToSigner<Scope extends CaipChainId> = Scope extends Eip155Scope
  ? Eip155Signer
  : Signer;

/**
 * Represents a source of entropy that can provide signers.
 *
 * The `Scopes` type parameter constrains which scopes this entropy source
 * accepts. Defaults to `CaipChainId` for use in collections (e.g. {@link EntropyController}).
 */
export type Entropy<Scopes extends CaipChainId = CaipChainId> = {
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
   * The return type is automatically narrowed to the signer bound to `Scope` via
   * {@link ScopeToSigner}.
   *
   * @param scope - The CAIP-2 chain ID for which to get the signer.
   * @param options - Entropy-specific options for getting the signer.
   * @returns The signer for the specified scope.
   */
  getSigner<Scope extends Scopes>(
    scope: Scope,
    options: unknown,
  ): Promise<ScopeToSigner<Scope>>;
};

/**
 * Options for getting a signer from a BIP-44 entropy source.
 */
export type Bip44GetSignerOptions = {
  /**
   * The derivation path that should be used to derive the signer.
   */
  derivationPath: Bip32PathNode[];
};

/**
 * BIP-44 entropy interface.
 *
 * The `Scopes` type parameter declares which scopes this entropy source
 * accepts (e.g. `Bip44Entropy<Eip155Scope>`).
 */
export type Bip44Entropy<Scopes extends CaipChainId = CaipChainId> =
  Entropy<Scopes> & {
    type: `bip44:${string}`;

    getSigner<Scope extends Scopes>(
      scope: Scope,
      options: Bip44GetSignerOptions,
    ): Promise<ScopeToSigner<Scope>>;
  };

/**
 * Checks if the entropy is a Bip44Entropy.
 *
 * @param entropy - The entropy to check.
 * @returns True if the entropy is a Bip44Entropy, false otherwise.
 */
export function isBip44Entropy(entropy: Entropy): entropy is Bip44Entropy {
  return entropy.type.startsWith('bip44:');
}

/**
 * Options for getting a signer from a raw entropy source.
 */
export type RawGetSignerOptions = {
  /**
   * The type of account to get the signer for.
   */
  accountType: KeyringAccountType;
};

/**
 * Raw entropy interface.
 *
 * The `Scopes` type parameter declares which scopes this entropy source
 * accepts (e.g. `RawEntropy<Eip155Scope>`).
 */
export type RawEntropy<Scopes extends CaipChainId = CaipChainId> =
  Entropy<Scopes> & {
    type: `raw:${string}`;

    getSigner<Scope extends Scopes>(
      scope: Scope,
      options: RawGetSignerOptions,
    ): Promise<ScopeToSigner<Scope>>;
  };

/**
 * Checks if the entropy is a RawEntropy.
 *
 * @param entropy - The entropy to check.
 * @returns True if the entropy is a RawEntropy, false otherwise.
 */
export function isRawEntropy(entropy: Entropy): entropy is RawEntropy {
  return entropy.type.startsWith('raw:');
}
