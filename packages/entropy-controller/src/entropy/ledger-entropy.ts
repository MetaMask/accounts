import type {
  DeviceManagementKit,
  DeviceSessionId,
} from '@ledgerhq/device-management-kit';
import { SignerBtcBuilder } from '@ledgerhq/device-signer-kit-bitcoin';
import type { SignerBtc } from '@ledgerhq/device-signer-kit-bitcoin';
import type { Bip122Signer } from 'src/signer';

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
   * @param dmk - The Ledger Device Management Kit instance.
   * @param sessionId - The active device session ID.
   */
  constructor(
    id: string,
    dmk: DeviceManagementKit,
    sessionId: DeviceSessionId,
  ) {
    this.id = id;
    this.#session = new SignerBtcBuilder({ dmk, sessionId }).build();
  }

  async getSigner(
    scope: `bip122:${string}`,
    options: Bip44GetSignerOptions,
  ): Promise<Bip122Signer>;

  async getSigner(
    scope: string,
    options: Bip44GetSignerOptions,
  ): Promise<Signer> {
    if (scope.startsWith('bip122:')) {
      return new LedgerBitcoinSigner(
        this.#session,
        scope as `bip122:${string}`,
        options.path,
      );
    }

    throw new Error(`Unsupported scope: ${scope}`);
  }
}
