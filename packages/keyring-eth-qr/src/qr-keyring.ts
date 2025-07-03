import { type TypedTransaction, type TypedTxData } from '@ethereumjs/tx';
import type { TypedMessage, MessageTypes } from '@metamask/eth-sig-util';
import type { Keyring } from '@metamask/keyring-utils';
import { type Hex, add0x, assert, getChecksumAddress } from '@metamask/utils';

import {
  type DeviceDetails,
  type IndexedAddress,
  Device,
  DeviceMode,
} from './device';

export const QR_KEYRING_TYPE = 'QR Hardware Wallet Device';

export enum QrScanRequestType {
  /**
   * Request a scan for a QR code containing a UR
   * with information related to a hardware wallet.
   */
  PAIR = 'pair',
  /**
   * Request a scan for a QR code containing a
   * UR-encoded transaction signature.
   */
  SIGN = 'sign',
}

export type QrSignatureRequest = {
  requestId: string;
  payload: SerializedUR;
  requestTitle?: string;
  requestDescription?: string;
};

export type QrScanRequest = {
  type: QrScanRequestType;
  request?: QrSignatureRequest;
};

export type SerializedUR = {
  type: string;
  cbor: string;
};

export type QrKeyringBridge = {
  requestScan: (request: QrScanRequest) => Promise<SerializedUR>;
};

export type QrKeyringOptions = {
  ur?: string;
  bridge: QrKeyringBridge;
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
    } & DeviceDetails)
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

  readonly bridge: QrKeyringBridge;

  #device?: Device | undefined;

  #accounts: Hex[] = [];

  #accountToUnlock?: number | undefined;

  #currentPage: number = 0;

  constructor(options: QrKeyringOptions) {
    this.bridge = options.bridge;

    if (options?.ur) {
      this.pairDevice(options.ur);
    }
  }

  /**
   * Serializes the QrKeyring state
   *
   * @returns The serialized state
   */
  async serialize(): Promise<SerializedQrKeyringState> {
    const deviceDetails = this.#device
      ? this.#device.getDeviceDetails()
      : undefined;

    if (
      !deviceDetails ||
      ![DeviceMode.HD, DeviceMode.ACCOUNT].includes(deviceDetails.keyringMode)
    ) {
      // the keyring has not initialized with a deviceDetails device yet
      return getDefaultSerializedQrKeyringState();
    }

    const accounts = this.#accounts.slice();

    if (deviceDetails.keyringMode === DeviceMode.HD) {
      // These properties are only relevant for HD Keys
      return {
        initialized: true,
        name: deviceDetails.name,
        keyringMode: DeviceMode.HD,
        keyringAccount: deviceDetails.keyringAccount,
        xfp: deviceDetails.xfp,
        xpub: deviceDetails.xpub,
        hdPath: deviceDetails.hdPath,
        childrenPath: deviceDetails.childrenPath,
        accounts,
        indexes: deviceDetails.indexes,
      };
    }
    // These properties are only relevant for Account Keys
    return {
      initialized: true,
      name: deviceDetails.name,
      keyringMode: DeviceMode.ACCOUNT,
      keyringAccount: deviceDetails.keyringAccount,
      xfp: deviceDetails.xfp,
      paths: deviceDetails.paths,
      accounts,
      indexes: deviceDetails.indexes,
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
      this.#device = undefined;
      return;
    }

    this.#device = new Device({
      requestScan: this.bridge.requestScan.bind(this.bridge),
      source: state,
    });
    this.#accounts = (state.accounts ?? []).map(normalizeAddress);
  }

  /**
   * Adds accounts to the QrKeyring
   *
   * @param accountsToAdd - The number of accounts to add
   * @returns The accounts added
   */
  async addAccounts(accountsToAdd: number): Promise<Hex[]> {
    if (!this.#device) {
      throw new Error('No device paired.');
    }

    const lastAccount = this.#accounts[this.#accounts.length - 1];
    const startIndex =
      this.#accountToUnlock ??
      (lastAccount ? this.#device.indexFromAddress(lastAccount) : 0);
    const newAccounts: Hex[] = [];

    for (let i = 0; i < accountsToAdd; i++) {
      const index = startIndex + i;
      const address = this.#device.addressFromIndex(index);

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
   * Pair a QR-based Hardware Device from a CBOR encoded UR to the QrKeyring
   *
   * @param ur - The CBOR encoded UR
   */
  pairDevice(ur: string | SerializedUR): void {
    this.#device = new Device({
      requestScan: this.bridge.requestScan.bind(this.bridge),
      source: ur,
    });
  }

  /**
   * Sets the next account index to unlock
   *
   * @param index - The index of the account to unlock
   */
  setAccountToUnlock(index: number): void {
    this.#accountToUnlock = index;
  }

  /**
   * Get the name of the paired device or the keyring type
   * if unavailable.
   *
   * @returns The name of the paired device or the keyring type.
   */
  getName(): string {
    if (!this.#device) {
      return QR_KEYRING_TYPE;
    }
    const source = this.#device.getDeviceDetails();
    return source.name;
  }

  /**
   * Fetch the first page of accounts. If the keyring is not currently initialized,
   * it will trigger a scan request to initialize it.
   *
   * @returns The first page of accounts as an array of Hex strings.
   */
  async getFirstPage(): Promise<IndexedAddress[]> {
    this.#currentPage = 0;
    return this.getCurrentPage();
  }

  /**
   * Fetch the next page of accounts. If the keyring is not currently initialized,
   * it will trigger a scan request to initialize it.
   *
   * @returns The next page of accounts as an array of IndexedAddress objects.
   */
  async getNextPage(): Promise<IndexedAddress[]> {
    this.#currentPage += 1;
    return this.getCurrentPage();
  }

  /**
   * Fetch the previous page of accounts. If the keyring is not currently initialized,
   * it will trigger a scan request to initialize it.
   *
   * @returns The previous page of accounts as an array of IndexedAddress objects.
   */
  async getPreviousPage(): Promise<IndexedAddress[]> {
    if (this.#currentPage > 0) {
      this.#currentPage -= 1;
    } else {
      this.#currentPage = 0;
    }
    return this.getCurrentPage();
  }

  /**
   * Fetch the current page of accounts. If the keyring is not currently initialized,
   * it will trigger a scan request to initialize it.
   *
   * @returns The current page of accounts as an array of IndexedAddress objects.
   */
  async getCurrentPage(): Promise<IndexedAddress[]> {
    if (!this.#device) {
      await this.#scanAndInitialize();
    }
    assert(
      this.#device,
      'A device is expected to be paired before fetching accounts.',
    );
    return this.#device.getAddressesPage(this.#currentPage);
  }

  /**
   * Clear the keyring state and forget any paired device or accounts.
   */
  async forgetDevice(): Promise<void> {
    this.#device = undefined;
    this.#accounts = [];
    this.#accountToUnlock = undefined;
    this.#currentPage = 0;
  }

  /**
   * Sign a transaction. This is equivalent to the `eth_signTransaction`
   * Ethereum JSON-RPC method. See the Ethereum JSON-RPC API documentation for
   * more details.
   *
   * @param address - The address of the account to use for signing.
   * @param transaction - The transaction to sign.
   * @returns The signed transaction.
   */
  async signTransaction(
    address: Hex,
    transaction: TypedTransaction,
  ): Promise<TypedTxData> {
    if (!this.#device) {
      throw new Error('No device paired.');
    }
    return this.#device.signTransaction(address, transaction);
  }

  /**
   * Sign a message. This is equivalent to the `eth_signTypedData` v4 Ethereum
   * JSON-RPC method.
   *
   * @param address - The address of the account to use for signing.
   * @param data - The data to sign.
   * @returns The signed message.
   */
  async signTypedData<Types extends MessageTypes>(
    address: Hex,
    data: TypedMessage<Types>,
  ): Promise<string> {
    if (!this.#device) {
      throw new Error('No device paired.');
    }
    return this.#device.signTypedData(address, data);
  }

  /**
   * Sign a message. This is equivalent to the `eth_sign` Ethereum JSON-RPC
   * method, which is exposed by MetaMask as the method `personal_sign`. See
   * the Ethereum JSON-RPC API documentation for more details.
   *
   * For more information about this method and why we call it `personal_sign`,
   * see the {@link https://docs.metamask.io/guide/signing-data.html|MetaMask Docs}.
   *
   * @param address - The address of the account to use for signing.
   * @param message - The message to sign.
   * @returns The signed message.
   */
  async signPersonalMessage(address: Hex, message: Hex): Promise<string> {
    if (!this.#device) {
      throw new Error('No device paired.');
    }
    return this.#device.signPersonalMessage(address, message);
  }

  /**
   * Scan for a QR code and initialize the keyring with the
   * scanned UR.
   */
  async #scanAndInitialize(): Promise<void> {
    this.pairDevice(
      await this.bridge.requestScan({ type: QrScanRequestType.PAIR }),
    );
  }
}
