import type { Keyring } from '@metamask/keyring-utils';
import type { Hex } from '@metamask/utils';
import { add0x, getChecksumAddress } from '@metamask/utils';

import {
  type AirgappedSignerDetails,
  AirgappedSigner,
  KeyringMode,
} from './airgapped-signer';

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
  accounts?: string[];
  currentAccount?: number;
} & (
  | {
      initialized?: false;
    }
  | ({
      initialized: true;
    } & AirgappedSignerDetails)
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

  readonly #signer: AirgappedSigner = new AirgappedSigner();

  #accounts: Hex[] = [];

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
    const source = this.#signer.getSourceDetails();

    if (
      !source ||
      ![KeyringMode.HD, KeyringMode.ACCOUNT].includes(source.keyringMode)
    ) {
      // the keyring has not initialized with a device source yet
      return getDefaultSerializedQrKeyringState();
    }

    const accounts = this.#accounts.slice();

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
        indexes: source.indexes,
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
      indexes: source.indexes,
    };
  }

  /**
   * Deserializes the QrKeyring state
   *
   * @param state - The serialized state to deserialize
   */
  async deserialize(state: SerializedQrKeyringState): Promise<void> {
    if (!state.initialized) {
      this.#accounts = [];
      this.#signer.clear();
      return;
    }

    this.#signer.init(state);
    this.#accounts = (state.accounts ?? []).map(normalizeAddress);
  }

  /**
   * Adds accounts to the QrKeyring
   *
   * @param accountsToAdd - The number of accounts to add
   * @returns The accounts added
   */
  async addAccounts(accountsToAdd: number): Promise<Hex[]> {
    const lastAccount = this.#accounts[this.#accounts.length - 1];
    const startIndex =
      this.#accountToUnlock ??
      (lastAccount ? this.#signer.indexFromAddress(lastAccount) : 0);
    const newAccounts: Hex[] = [];

    for (let i = 0; i < accountsToAdd; i++) {
      const index = startIndex + i;
      const address = this.#signer.addressFromIndex(index);

      if (this.#accounts.includes(address)) {
        continue;
      }

      this.#accounts.push(address);
      newAccounts.push(address);
    }

    this.#accountToUnlock = startIndex + accountsToAdd;
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
    this.#accounts = this.#accounts.filter(
      (account) => account !== normalizedAddress,
    );
  }

  /**
   * Submits a CBOR encoded UR to the QrKeyring
   *
   * @param ur - The CBOR encoded UR
   */
  submitUR(ur: string): void {
    this.#signer.init(ur);
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
