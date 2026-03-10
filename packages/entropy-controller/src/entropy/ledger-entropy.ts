import type { SignerBtc } from '@ledgerhq/device-signer-kit-bitcoin';

import type { Bip44Entropy, Bip44GetSignerOptions } from './entropy';
import { LedgerBitcoinSigner } from '../signer/ledger-bitcoin-signer';
import type { Signer } from '../signer/signer';

/**
 * {@link Entropy} implementation backed by a Ledger device.
 *
 * Wraps a `SignerBtc` session and creates signers on demand for a given
 * scope and derivation path.
 */
export class LedgerEntropy implements Bip44Entropy {
  readonly type = 'bip44';

  readonly id: string;

  readonly #session: SignerBtc;

  /**
   * Creates a new LedgerEntropy.
   *
   * @param id - A unique identifier for this entropy source.
   * @param session - The Ledger DMK Bitcoin signer session.
   */
  constructor(id: string, session: SignerBtc) {
    this.id = id;
    this.#session = session;
  }

  async getSigner(
    scope: string,
    options: Bip44GetSignerOptions,
  ): Promise<Signer> {
    switch (scope) {
      case 'bip122':
        return new LedgerBitcoinSigner(this.#session, options.path);
      default:
        throw new Error(`Unsupported scope: ${scope}`);
    }
  }
}
