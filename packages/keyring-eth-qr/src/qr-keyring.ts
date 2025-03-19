import type { Keyring } from '@metamask/keyring-utils';
import type { Hex } from '@metamask/utils';

import { AccountDeriver } from './account-deriver';

export const QR_KEYRING_TYPE = 'QrKeyring';

export type QrKeyringOptions = {
  cbor: Hex;
};

/**
 * The state of the QrKeyring
 *
 * @property accounts - The accounts in the QrKeyring
 */
export type QrKeyringState = {
  accounts: Record<number, Hex>;
  cbor?: Hex | null;
};

/**
 * A keyring that derives accounts from a CBOR encoded UR
 */
export class QrKeyring implements Keyring<QrKeyringState> {
  type = QR_KEYRING_TYPE;

  #accounts: Map<number, Hex> = new Map();

  #accountToUnlock?: number | undefined;

  readonly #deriver: AccountDeriver = new AccountDeriver();

  constructor({ cbor }: QrKeyringOptions) {
    if (cbor) {
      this.submitCBOR(cbor);
    }
  }

  /**
   * Serializes the QrKeyring state
   *
   * @returns The serialized state
   */
  async serialize(): Promise<QrKeyringState> {
    return {
      accounts: Object.values(this.#accounts),
      cbor: this.#deriver.getCBOR(),
    };
  }

  /**
   * Deserializes the QrKeyring state
   *
   * @param state - The state to deserialize
   */
  async deserialize(state: QrKeyringState): Promise<void> {
    this.#accounts = new Map(
      Object.entries(state.accounts).map(([index, address]) => [
        Number(index),
        address,
      ]),
    );
    if (state.cbor) {
      this.submitCBOR(state.cbor);
    }
  }

  /**
   * Adds accounts to the QrKeyring
   *
   * @param accountsToAdd - The number of accounts to add
   * @returns The accounts added
   */
  async addAccounts(accountsToAdd: number): Promise<Hex[]> {
    const lastIndex = this.#accountToUnlock ?? this.#accounts.size;
    const newAccounts: Hex[] = [];

    for (let i = 0; i < accountsToAdd; i++) {
      const index = lastIndex + i + 1;
      const account = this.#deriver.deriveIndex(index);
      this.#accounts.set(index, account);
      newAccounts.push(account);
    }

    this.#accountToUnlock = undefined;

    return newAccounts;
  }

  /**
   * Gets the accounts in the QrKeyring
   *
   * @returns The accounts in the QrKeyring
   */
  async getAccounts(): Promise<Hex[]> {
    return Object.values(this.#accounts);
  }

  /**
   * Submits a CBOR encoded UR to the QrKeyring
   *
   * @param cbor - The CBOR encoded UR
   * @throws An error if the UR type is not supported
   */
  submitCBOR(cbor: Hex): void {
    this.#deriver.init(cbor);
  }

  /**
   * Sets the next account index to unlock
   *
   * @param index - The index of the account to unlock
   */
  setAccountToUnlock(index: number): void {
    this.#accountToUnlock = index;
  }
}
