import { RLP } from '@ethereumjs/rlp';
import {
  type FeeMarketEIP1559Transaction,
  TransactionFactory,
  TransactionType,
  type TypedTransaction,
  type TypedTxData,
} from '@ethereumjs/tx';
import {
  DataType,
  ETHSignature,
  EthSignRequest,
} from '@keystonehq/bc-ur-registry-eth';
import type { TypedMessage, MessageTypes } from '@metamask/eth-sig-util';
import type { Keyring } from '@metamask/keyring-utils';
import { type Hex, add0x, getChecksumAddress, remove0x } from '@metamask/utils';
import { stringify, v4 as uuidv4 } from 'uuid';

import {
  type AirgappedSignerDetails,
  type IndexedAddress,
  AirgappedSigner,
  KeyringMode,
} from './airgapped-signer';

export const QR_KEYRING_TYPE = 'QR Hardware Wallet Device';

const DEFAULT_SCAN_REQUEST_TITLE = 'Scan with your hardware wallet';

const DEFAULT_SCAN_REQUEST_DESCRIPTION =
  'After your device has scanned this QR code, click on "Scan" to receive the information.';

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

  readonly bridge: QrKeyringBridge;

  readonly #signer: AirgappedSigner = new AirgappedSigner();

  #accounts: Hex[] = [];

  #accountToUnlock?: number | undefined;

  #currentPage: number = 0;

  constructor(options: QrKeyringOptions) {
    this.bridge = options.bridge;

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
  submitUR(ur: string | SerializedUR): void {
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

  /**
   * Get the name of the paired device or the keyring type
   * if unavailable.
   *
   * @returns The name of the paired device or the keyring type.
   */
  getName(): string {
    const source = this.#signer.getSourceDetails();
    return source?.name ?? QR_KEYRING_TYPE;
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
    if (!this.#signer.isInitialized()) {
      await this.#scanAndInitialize();
    }

    return this.#signer.getAddressesPage(this.#currentPage);
  }

  /**
   * Clear the keyring state and forget any paired device or accounts.
   */
  async forgetDevice(): Promise<void> {
    this.#signer.clear();
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
    const signerSource = this.#signer.getSourceDetails();
    if (!signerSource?.xfp) {
      throw new Error('Keyring is not initialized. Please scan a QR code.');
    }

    const dataType =
      transaction.type === TransactionType.Legacy
        ? DataType.transaction
        : DataType.typedTransaction;

    const messageToSign = Buffer.from(
      transaction.type === TransactionType.Legacy
        ? RLP.encode(transaction.getMessageToSign())
        : (transaction as FeeMarketEIP1559Transaction).getMessageToSign(),
    );

    const requestId = uuidv4();
    const ethSignRequestUR = EthSignRequest.constructETHRequest(
      messageToSign,
      dataType,
      this.#signer.pathFromAddress(address),
      signerSource.xfp,
      requestId,
      Number(transaction.common.chainId()),
    ).toUR();

    const { r, s, v } = await this.#requestSignature({
      requestId,
      payload: {
        type: ethSignRequestUR.type,
        cbor: ethSignRequestUR.cbor.toString('hex'),
      },
      requestTitle: 'Scan with your hardware wallet',
      requestDescription:
        'After your device has signed this message, click on "Scan" to receive the signature',
    });

    return TransactionFactory.fromTxData(
      {
        ...transaction,
        r,
        s,
        v,
      },
      {
        common: transaction.common,
      },
    );
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
    const signerSource = this.#signer.getSourceDetails();
    if (!signerSource?.xfp) {
      throw new Error('Keyring is not initialized. Please scan a QR code.');
    }

    const requestId = uuidv4();
    const ethSignRequestUR = EthSignRequest.constructETHRequest(
      Buffer.from(JSON.stringify(data), 'utf8'),
      DataType.typedData,
      this.#signer.pathFromAddress(address),
      signerSource.xfp,
      requestId,
      undefined,
      address,
    ).toUR();

    const { r, s, v } = await this.#requestSignature({
      requestId,
      payload: {
        type: ethSignRequestUR.type,
        cbor: ethSignRequestUR.cbor.toString('hex'),
      },
      requestTitle: DEFAULT_SCAN_REQUEST_TITLE,
      requestDescription: DEFAULT_SCAN_REQUEST_DESCRIPTION,
    });

    return add0x(
      Buffer.concat([
        Uint8Array.from(r),
        Uint8Array.from(s),
        Uint8Array.from(v),
      ]).toString('hex'),
    );
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
    const signerSource = this.#signer.getSourceDetails();
    if (!signerSource?.xfp) {
      throw new Error('Keyring is not initialized. Please scan a QR code.');
    }

    const requestId = uuidv4();
    const ethSignRequestUR = EthSignRequest.constructETHRequest(
      Buffer.from(remove0x(message), 'hex'),
      DataType.personalMessage,
      this.#signer.pathFromAddress(address),
      signerSource.xfp,
      requestId,
      undefined,
      address,
    ).toUR();

    const { r, s, v } = await this.#requestSignature({
      requestId,
      payload: {
        type: ethSignRequestUR.type,
        cbor: ethSignRequestUR.cbor.toString('hex'),
      },
    });

    return add0x(
      Buffer.concat([
        Uint8Array.from(r),
        Uint8Array.from(s),
        Uint8Array.from(v),
      ]).toString('hex'),
    );
  }

  /**
   * Scan for a QR code and initialize the keyring with the
   * scanned UR.
   */
  async #scanAndInitialize(): Promise<void> {
    this.submitUR(
      await this.bridge.requestScan({ type: QrScanRequestType.PAIR }),
    );
  }

  /**
   * Request a signature for a transaction or message.
   *
   * @param request - The signature request containing the data to sign.
   * @returns The signature as an object containing r, s, and v values.
   */
  async #requestSignature(
    request: QrSignatureRequest,
  ): Promise<{ r: Buffer; s: Buffer; v: Buffer }> {
    const response = await this.bridge.requestScan({
      type: QrScanRequestType.SIGN,
      request,
    });
    const signatureEnvelope = ETHSignature.fromCBOR(
      Buffer.from(response.cbor, 'hex'),
    );
    const signature = signatureEnvelope.getSignature();
    const requestId = signatureEnvelope.getRequestId();

    if (!requestId) {
      throw new Error('Signature request ID is missing.');
    }

    if (request.requestId !== stringify(requestId)) {
      throw new Error(
        `Signature request ID mismatch. Expected: ${
          request.requestId
        }, received: ${requestId.toString('hex')}`,
      );
    }

    return {
      r: signature.subarray(0, 32),
      s: signature.subarray(32, 64),
      v: signature.subarray(64),
    };
  }
}
