import type { Keyring } from '@metamask/keyring-utils';
import type { Hex } from '@metamask/utils';
import { add0x, assert, getChecksumAddress } from '@metamask/utils';

import type { AirgappedSourceDetails } from './account-deriver';
import { AccountDeriver, KeyringMode } from './account-deriver';

export const QR_KEYRING_TYPE = 'QR Hardware Wallet Device';

export type QrKeyringOptions = {
  ur?: string;
};

/**
 * The state of the QrKeyring
 *
 * @property accounts - The accounts in the QrKeyring
 */
export type SerializedQrKeyringState = {
  version?: number;
  accounts: string[];
  indexes: Record<string, number>;
  currentAccount?: number;
} & (
  | {
      initialized?: false;
    }
  | ({
      initialized: true;
    } & AirgappedSourceDetails)
);

/**
 * Returns the default serialized state of the QrKeyring.
 *
 * @returns The default serialized state.
 */
export const getDefaultSerializedQrKeyringState =
  (): SerializedQrKeyringState => ({
    initialized: false,
    accounts: [],
    indexes: {},
  });

/**
 * Normalizes an address to a 0x-prefixed checksum address.
 *
 * @param address - The address to normalize.
 * @returns The normalized address as a Hex string.
 */
function normalizeAddress(address: string): Hex {
  return getChecksumAddress(add0x(address));
}

export class QrKeyring implements Keyring {
  static type = QR_KEYRING_TYPE;

  readonly type = QR_KEYRING_TYPE;

  readonly #deriver: AccountDeriver = new AccountDeriver();

  #accounts: Map<number, Hex> = new Map();

  #accountToUnlock?: number | undefined;

  constructor(options?: QrKeyringOptions) {
    if (options?.ur) {
      this.submitUR(options.ur);
    }
  }

  /**
   * Serializes the QrKeyring state
   *
   * @returns The serialized state
   */
  async serialize(): Promise<SerializedQrKeyringState> {
    const source = this.#deriver.getSourceDetails();

    if (
      !source ||
      ![KeyringMode.HD, KeyringMode.ACCOUNT].includes(source.keyringMode)
    ) {
      // the keyring has not initialized with a device source yet
      return getDefaultSerializedQrKeyringState();
    }

    const accounts = Array.from(this.#accounts.values());
    const indexes = Object.fromEntries(
      Array.from(this.#accounts.entries()).map(([index, address]) => [
        address,
        index,
      ]),
    );

    if (source.keyringMode === KeyringMode.HD) {
      // These properties are only relevant for HD Keys
      return {
        initialized: true,
        name: source.name,
        keyringMode: KeyringMode.HD,
        keyringAccount: source.keyringAccount,
        xfp: source.xfp,
        xpub: source.xpub,
        hdPath: source.hdPath,
        childrenPath: source.childrenPath,
        accounts,
        indexes,
      };
    }
    // These properties are only relevant for Account Keys
    return {
      initialized: true,
      name: source.name,
      keyringMode: KeyringMode.ACCOUNT,
      keyringAccount: source.keyringAccount,
      xfp: source.xfp,
      paths: source.paths,
      accounts,
      indexes,
    };
  }

  /**
   * Deserializes the QrKeyring state
   *
   * @param state - The serialized state to deserialize
   */
  async deserialize(state: SerializedQrKeyringState): Promise<void> {
    if (!state.initialized) {
      this.#accounts.clear();
      this.#deriver.clear();
      return;
    }

    // Recover accounts from the serialized state
    const { accounts = [], indexes = {} } = state;
    if (accounts.length !== Object.keys(indexes).length) {
      throw new Error(
        'The number of accounts does not match the number of indexes',
      );
    }
    this.#accounts = new Map(
      accounts.map((address) => {
        const normalizedAddress = normalizeAddress(address);
        const index = indexes[normalizedAddress];
        assert(index !== undefined, 'Address not found in indexes map');
        return [index, normalizedAddress];
      }),
    );

    // Initialize the deriver with the source details
    this.#deriver.init(state);
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
      const index = lastIndex + i;
      if (this.#accounts.has(index)) {
        continue;
      }

      const account = this.#deriver.deriveIndex(index);
      this.#accounts.set(index, account);
      newAccounts.push(account);
    }

    this.#accountToUnlock = lastIndex + accountsToAdd;
    return newAccounts;
  }

  /**
   * Gets the accounts in the QrKeyring
   *
   * @returns The accounts in the QrKeyring
   */
  async getAccounts(): Promise<Hex[]> {
    return Array.from(this.#accounts.values());
  }

  /**
   * Remove an account from the keyring
   *
   * @param address - The address of the account to remove
   */
  removeAccount(address: Hex): void {
    const normalizedAddress = normalizeAddress(address);
    this.#accounts.forEach((storedAddress, storedIndex) => {
      if (storedAddress === normalizedAddress) {
        this.#accounts.delete(storedIndex);
      }
    });
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
