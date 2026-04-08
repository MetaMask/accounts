import type { SLIP10Node } from '@metamask/key-tree';
import {
  createBip39KeyFromSeed,
  mnemonicToSeed,
  secp256k1,
} from '@metamask/key-tree';

import type {
  Bip44Entropy,
  Bip44GetSignerOptions,
  ScopeToSigner,
} from './entropy';
import type { Eip155Scope } from '../signer/eip155-signer';
import { MnemonicEip155Signer } from '../signer/mnemonic-eip155-signer';
import { toBip32KeyTreePath } from '../utils';

/**
 * {@link Entropy} implementation backed by a BIP-39 mnemonic phrase.
 *
 * Derives keys from the mnemonic using BIP-32 and creates signers on demand for a given
 * scope and derivation path.
 */
export class MnemonicEntropy implements Bip44Entropy<Eip155Scope> {
  readonly type = 'bip44:mnemonic' as const;

  readonly id: string;

  readonly #mnemonic: string;

  // Lazily cached: seed derivation (PBKDF2) and root node creation are expensive, so we
  // compute them once and reuse across getSigner calls.
  //
  // Stored as a Promise (not the resolved value) so that concurrent getSigner calls
  // share a single in-flight computation rather than each kicking off a duplicate
  // derivation.
  #root?: Promise<SLIP10Node>;

  /**
   * Creates a new MnemonicEntropy.
   *
   * @param id - A unique identifier for this entropy source.
   * @param mnemonic - The BIP-39 mnemonic phrase.
   */
  constructor(id: string, mnemonic: string) {
    this.id = id;
    this.#mnemonic = mnemonic;
  }

  async getSigner<Scope extends Eip155Scope>(
    scope: Scope,
    options: Bip44GetSignerOptions,
  ): Promise<ScopeToSigner<Scope>> {
    const { derivationPath } = options;

    if (!this.#root) {
      this.#root = mnemonicToSeed(this.#mnemonic).then(async (seed) =>
        createBip39KeyFromSeed(seed, secp256k1),
      );
    }

    const root = await this.#root;
    const accountNode = await root.derive(toBip32KeyTreePath(derivationPath));

    return new MnemonicEip155Signer(scope, accountNode) as ScopeToSigner<Scope>;
  }
}
