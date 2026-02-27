import { SLIP10Node } from '@metamask/key-tree';

import type {
  Bip32PathNode,
  Bip44Entropy,
  Bip44GetSignerOptions,
} from './entropy';
import type { BitcoinSigner } from '../signer/bitcoin-signer';

type KeyTreeBip32Node = `bip32:${number}` | `bip32:${number}'`;

/**
 * Converts a BIP-32 derivation path to Key Tree format.
 *
 * @param path - The BIP-32 derivation path.
 * @returns The Key Tree formatted derivation path.
 */
function asKeyTreeBip32Path(path: Bip32PathNode[]): KeyTreeBip32Node[] {
  return path.map((node) => `bip32:${node}` as KeyTreeBip32Node);
}

// Realistic SRP entropy implementation
export class SrpEntropy implements Bip44Entropy {
  readonly type = 'bip44';

  readonly id: string;

  readonly #mnemonic: string;

  constructor(id: string, mnemonic: string) {
    this.id = id;
    this.#mnemonic = mnemonic;
  }

  async getBitcoinSigner(
    options: Bip44GetSignerOptions,
  ): Promise<BitcoinSigner> {
    await SLIP10Node.fromDerivationPath({
      curve: options.curve,
      derivationPath: [
        `bip39:${this.#mnemonic}`,
        ...asKeyTreeBip32Path(options.derivationPath),
      ],
    });

    throw new Error('Method not implemented.');
  }
}
