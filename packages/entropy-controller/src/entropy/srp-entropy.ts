import { SLIP10Node } from '@metamask/key-tree';

import type {
  Bip32PathNode,
  Bip44Entropy,
  Bip44GetSignerOptions,
} from './entropy';
import type { Signer } from '../signer/signer';

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

  async getSigner(
    scope: string,
    options: Bip44GetSignerOptions,
  ): Promise<Signer> {
    switch (scope) {
      case 'bip122': {
        await SLIP10Node.fromDerivationPath({
          curve: 'secp256k1',
          derivationPath: [
            `bip39:${this.#mnemonic}`,
            ...asKeyTreeBip32Path(options.path),
          ],
        });

        throw new Error('Method not implemented.');
      }

      default:
        throw new Error(`Unsupported scope: ${scope}`);
    }
  }
}
