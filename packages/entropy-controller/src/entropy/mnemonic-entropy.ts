import {
  createBip39KeyFromSeed,
  mnemonicToSeed,
  secp256k1,
} from '@metamask/key-tree';
import type { CaipChainId } from '@metamask/keyring-api';

import type { Bip44Entropy, Bip44GetSignerOptions } from './entropy';
import { isEip155Scope } from '../signer/eip155-signer';
import type { Eip155Scope, Eip155Signer } from '../signer/eip155-signer';
import { MnemonicEip155Signer } from '../signer/mnemonic-eth-signer';
import type { Signer } from '../signer/signer';
import { toBip32KeyTreePath } from '../utils';

/**
 * {@link Entropy} implementation backed by a BIP-39 mnemonic phrase.
 *
 * Derives keys from the mnemonic using BIP-32 and creates signers on demand for a
 * given scope and derivation path.
 */
export class MnemonicEntropy implements Bip44Entropy {
  readonly type = 'bip44:mnemonic' as const;

  readonly id: string;

  readonly #mnemonic: string;

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

  async getSigner(
    scope: Eip155Scope,
    options: Bip44GetSignerOptions,
  ): Promise<Eip155Signer>;

  async getSigner(
    scope: CaipChainId,
    options: Bip44GetSignerOptions,
  ): Promise<Signer>;

  async getSigner(
    scope: CaipChainId,
    options: Bip44GetSignerOptions,
  ): Promise<Signer> {
    const { derivationPath } = options;

    const seed = await mnemonicToSeed(this.#mnemonic);
    const root = await createBip39KeyFromSeed(seed, secp256k1);
    const accountNode = await root.derive(toBip32KeyTreePath(derivationPath));

    if (isEip155Scope(scope)) {
      return new MnemonicEip155Signer(scope, accountNode);
    }

    throw new Error(`Unsupported scope: ${scope}`);
  }
}
