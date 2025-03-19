import type { Keyring } from '@metamask/keyring-utils';
import type { Hex } from '@metamask/utils';

import { AccountDeriver } from './account-deriver';

export const QR_KEYRING_TYPE = 'QR Hardware Wallet Device';

export type QrKeyringOptions = {
  ur?: string;
};

/**
 * The state of the QrKeyring
 *
 * @property accounts - The accounts in the QrKeyring
 */
export type QrKeyringState = {
  accounts: Record<number, Hex>;
  ur?: string | null;
};

/**
 * A keyring that derives accounts from a CBOR encoded UR
 */
export class QrKeyring implements Keyring {
  static type = QR_KEYRING_TYPE;

  type = QR_KEYRING_TYPE;

  #accounts: Map<number, Hex> = new Map();

  #accountToUnlock?: number | undefined;

  readonly #deriver: AccountDeriver = new AccountDeriver();

  constructor(options?: QrKeyringOptions) {
    if (options?.ur) {
      this.submitUR(options.ur);
    }
  }

  /**
   * Gets the UR of the QrKeyring
   *
   * @returns The UR of the QrKeyring
   */
  get ur(): string | null {
    return this.#deriver.getUR();
  }

  /**
   * Serializes the QrKeyring state
   *
   * @returns The serialized state
   */
  async serialize(): Promise<QrKeyringState> {
    return {
      accounts: Object.values(this.#accounts),
      ur: this.#deriver.getUR(),
    };
  }

  /**
   * Deserializes the QrKeyring state
   *
   * @param state - The state to deserialize
   */
  async deserialize(state: QrKeyringState): Promise<void> {
    const { accounts, ur } = state;

    this.#accounts = new Map(
      Object.entries(accounts).map(([index, address]) => [
        Number(index),
        address,
      ]),
    );

    if (ur) {
      this.submitUR(ur);
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

      if (this.#accounts.has(index)) {
        throw new Error(`Account at index ${index} already exists`);
      }

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
   * @param ur - The CBOR encoded UR
   */
  submitUR(ur: string): void {
    this.#deriver.init(ur);
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
