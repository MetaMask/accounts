/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { TypedTransaction, TypedTxData } from '@ethereumjs/tx';
import { TransactionFactory } from '@ethereumjs/tx';
import * as ethUtil from '@ethereumjs/util';
import type { MessageTypes, TypedMessage } from '@metamask/eth-sig-util';
import { SignTypedDataVersion, TypedDataUtils } from '@metamask/eth-sig-util';
import type {
  ConnectSettings,
  EthereumSignTypedDataMessage,
  EthereumSignTypedDataTypes,
  EVMSignedTx,
  EVMSignTransactionParams,
} from '@onekeyfe/hd-core';
// eslint-disable-next-line @typescript-eslint/no-shadow, n/prefer-global/buffer
import { Buffer } from 'buffer';
import type OldEthJsTransaction from 'ethereumjs-tx';
import { EventEmitter } from 'events';
import HDKey from 'hdkey';

import { ONEKEY_HARDWARE_UI_EVENT } from './constants';
import type { OneKeyBridge } from './onekey-bridge';

const pathBase = 'm';
const defaultHdPath = `${pathBase}/44'/60'/0'/0`;
const keyringType = 'OneKey Hardware';

enum NetworkApiUrls {
  Ropsten = 'https://api-ropsten.etherscan.io',
  Kovan = 'https://api-kovan.etherscan.io',
  Rinkeby = 'https://api-rinkeby.etherscan.io',
  Mainnet = `https://api.etherscan.io`,
}

export type AccountDetails = {
  index?: number;
  hdPath: string;
  passphraseState?: string | undefined;
};

export type AccountPageEntry = {
  address: string;
  balance: number | null;
  index: number;
};

export type AccountPage = AccountPageEntry[];

export type OneKeyControllerOptions = {
  hdPath?: string;
  accounts?: string[];
  accountDetails?: Readonly<Record<string, AccountDetails>>;
  page?: number;
  passphraseState?: string;
};

export type OneKeyControllerState = {
  hdPath: string;
  accounts: readonly string[];
  accountDetails: Readonly<Record<string, AccountDetails>>;
  page: number;
  passphraseState?: string;
};

/**
 * Check if the given transaction is made with ethereumjs-tx or @ethereumjs/tx
 *
 * Transactions built with older versions of ethereumjs-tx have a
 * getChainId method that newer versions do not.
 * Older versions are mutable
 * while newer versions default to being immutable.
 * Expected shape and type
 * of data for v, r and s differ (Buffer (old) vs BN (new)).
 *
 * @param tx - Transaction to check, instance of either ethereumjs-tx or @ethereumjs/tx.
 * @returns Returns `true` if tx is an old-style ethereumjs-tx transaction.
 */
function isOldStyleEthereumjsTx(
  tx: TypedTransaction | OldEthJsTransaction,
): tx is OldEthJsTransaction {
  return 'getChainId' in tx && typeof tx.getChainId === 'function';
}

/**
 * Check if the given value has a hex prefix.
 *
 * @param value - The value to check.
 * @returns Returns `true` if the value has a hex prefix.
 */
function hasHexPrefix(value: string): boolean {
  return value.startsWith('0x');
}

/**
 * Add a hex prefix to the given value.
 *
 * @param value - The value to add a hex prefix to.
 * @returns Returns the value with a hex prefix.
 */
function addHexPrefix(value: string): string {
  if (hasHexPrefix(value)) {
    return value;
  }
  return `0x${value}`;
}

/**
 * Check if the passphrase state is empty.
 *
 * @param passphraseState - The passphrase state to check.
 * @returns Returns `true` if the passphrase state is empty.
 */
function isEmptyPassphrase(passphraseState: string | undefined): boolean {
  return (
    passphraseState === null ||
    passphraseState === undefined ||
    passphraseState === ''
  );
}

export class OneKeyKeyring extends EventEmitter {
  readonly type: string = keyringType;

  static type: string = keyringType;

  page = 0;

  perPage = 5;

  unlockedAccount = 0;

  hdk = new HDKey();

  accounts: readonly string[] = [];

  accountDetails: Record<string, AccountDetails> = {};

  passphraseState: string | undefined;

  hdPath = defaultHdPath;

  network: NetworkApiUrls = NetworkApiUrls.Mainnet;

  implementFullBIP44 = false;

  bridge: OneKeyBridge;

  constructor({ bridge }: { bridge: OneKeyBridge }) {
    super();

    if (!bridge) {
      throw new Error('Bridge is a required dependency for the keyring');
    }

    this.bridge = bridge;
    this.bridge.on(ONEKEY_HARDWARE_UI_EVENT, (_event: any) => {
      this.emit(ONEKEY_HARDWARE_UI_EVENT, _event);
    });
  }

  async init(settings: Partial<ConnectSettings>): Promise<void> {
    return this.bridge.init(settings);
  }

  async destroy(): Promise<void> {
    this.bridge.off(ONEKEY_HARDWARE_UI_EVENT);
    return this.bridge.dispose();
  }

  async serialize(): Promise<OneKeyControllerState> {
    return Promise.resolve({
      hdPath: this.hdPath,
      accounts: this.accounts,
      accountDetails: this.accountDetails,
      page: this.page,
    });
  }

  async deserialize(opts: OneKeyControllerOptions = {}): Promise<void> {
    this.hdPath = opts.hdPath ?? defaultHdPath;
    this.accounts = opts.accounts ?? [];
    this.accountDetails = opts.accountDetails ?? {};
    this.page = opts.page ?? 0;
    return Promise.resolve();
  }

  getModel(): string | undefined {
    return this.bridge.model;
  }

  setAccountToUnlock(index: number): void {
    this.unlockedAccount = index;
  }

  setHdPath(hdPath: string): void {
    this.hdPath = hdPath;
  }

  lock(): void {
    this.hdk = new HDKey();
  }

  isUnlocked(): boolean {
    return Boolean(this.hdk?.publicKey);
  }

  async unlock(): Promise<string> {
    if (this.isUnlocked()) {
      return 'already unlocked';
    }

    return new Promise((resolve, reject) => {
      // eslint-disable-next-line no-void
      void this.bridge
        .getPassphraseState()
        .then((passphraseResponse) => {
          if (passphraseResponse.success) {
            this.passphraseState = passphraseResponse.payload;
          }
          if (!passphraseResponse.success) {
            reject(new Error('getPassphraseState failed'));
            return;
          }
          this.passphraseState = passphraseResponse.payload;

          // eslint-disable-next-line no-void
          void this.bridge
            .getPublicKey({
              showOnOneKey: false,
              chainId: 1,
              path: this.#getBasePath(),
              passphraseState: this.passphraseState ?? '',
            })
            .then(async (res) => {
              if (res.success) {
                this.hdk.publicKey = Buffer.from(res.payload.publicKey, 'hex');
                this.hdk.chainCode = Buffer.from(res.payload.chainCode, 'hex');
                resolve('just unlocked');
              } else {
                reject(new Error('getPublicKey failed'));
              }
            });
        })
        .catch((error) => {
          reject(new Error(error?.toString() || 'Unknown error'));
        });
    });
  }

  async addAccounts(numberOfAccounts = 1): Promise<readonly string[]> {
    await this.unlock().catch((error) => {
      throw new Error(error?.toString() || 'Unknown error');
    });

    return new Promise((resolve, reject) => {
      const from = this.unlockedAccount;
      const to = from + numberOfAccounts;
      const newAccounts: string[] = [];

      try {
        for (let i = from; i < to; i++) {
          const address = this.#addressFromIndex(i);
          const hdPath = this.#getPathForIndex(i);
          if (typeof address === 'undefined') {
            throw new Error('Unknown error');
          }
          if (!this.accounts.includes(address)) {
            this.accounts = [...this.accounts, address];
            newAccounts.push(address);
          }
          if (!this.accountDetails[address]) {
            this.accountDetails[address] = {
              index: from + i,
              hdPath,
              passphraseState: this.passphraseState,
            };
          }
          this.page = 0;
        }

        resolve(newAccounts);
      } catch (error) {
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
        reject(error);
      }
    });
  }

  getName(): string {
    return keyringType;
  }

  async getFirstPage(): Promise<AccountPage> {
    this.page = 0;
    return this.#getPage(1);
  }

  async getNextPage(): Promise<AccountPage> {
    return this.#getPage(1);
  }

  async getPreviousPage(): Promise<AccountPage> {
    return this.#getPage(-1);
  }

  async getAccounts(): Promise<readonly string[]> {
    return Promise.resolve(this.accounts.slice());
  }

  removeAccount(address: string): void {
    const filteredAccounts = this.accounts.filter(
      (a) => a.toLowerCase() !== address.toLowerCase(),
    );

    if (filteredAccounts.length === this.accounts.length) {
      throw new Error(`Address ${address} not found in this keyring`);
    }

    this.accounts = filteredAccounts;
    delete this.accountDetails[ethUtil.toChecksumAddress(address)];
  }

  async updateTransportMethod(
    transportType: ConnectSettings['env'],
  ): Promise<void> {
    return this.bridge.updateTransportMethod(transportType);
  }

  #normalize(buffer: Buffer): string {
    return ethUtil.bytesToHex(buffer);
  }

  /**
   * Signs a transaction using OneKey.
   *
   * Accepts either an ethereumjs-tx or @ethereumjs/tx transaction, and returns
   * the same type.
   *
   * @param address - Hex string address.
   * @param tx - Instance of either new-style or old-style ethereumjs transaction.
   * @returns The signed transaction, an instance of either new-style or old-style
   * ethereumjs transaction.
   */
  async signTransaction(
    address: string,
    tx: TypedTransaction | OldEthJsTransaction,
  ): Promise<TypedTransaction | OldEthJsTransaction> {
    if (isOldStyleEthereumjsTx(tx)) {
      // In this version of ethereumjs-tx we must add the chainId in hex format
      // to the initial v value. The chainId must be included in the serialized
      // transaction which is only communicated to ethereumjs-tx in this
      // value. In newer versions the chainId is communicated via the 'Common'
      // object.
      return this.#signTransaction(
        address,
        // @types/ethereumjs-tx and old ethereumjs-tx versions document
        // this function return value as Buffer, but the actual
        // Transaction._chainId will always be a number.
        // See https://github.com/ethereumjs/ethereumjs-tx/blob/v1.3.7/index.js#L126
        tx.getChainId() as unknown as number,
        tx,
        (payload) => {
          tx.v = Buffer.from(payload.v, 'hex');
          tx.r = Buffer.from(payload.r, 'hex');
          tx.s = Buffer.from(payload.s, 'hex');
          return tx;
        },
      );
    }
    return this.#signTransaction(
      address,
      Number(tx.common.chainId()),
      tx,
      (payload) => {
        // Because tx will be immutable, first get a plain javascript object that
        // represents the transaction. Using txData here as it aligns with the
        // nomenclature of ethereumjs/tx.
        const txData: TypedTxData = tx.toJSON();
        // The fromTxData utility expects a type to support transactions with a type other than 0
        txData.type = tx.type;
        // The fromTxData utility expects v,r and s to be hex prefixed
        txData.v = ethUtil.addHexPrefix(payload.v);
        txData.r = ethUtil.addHexPrefix(payload.r);
        txData.s = ethUtil.addHexPrefix(payload.s);
        // Adopt the 'common' option from the original transaction and set the
        // returned object to be frozen if the original is frozen.
        return TransactionFactory.fromTxData(txData, {
          common: tx.common,
          freeze: Object.isFrozen(tx),
        });
      },
    );
  }

  async #signTransaction<T extends TypedTransaction | OldEthJsTransaction>(
    address: string,
    chainId: number,
    tx: T,
    handleSigning: (tx: EVMSignedTx) => T,
  ): Promise<T> {
    let transaction: EVMSignTransactionParams['transaction'];
    if (isOldStyleEthereumjsTx(tx)) {
      // legacy transaction from ethereumjs-tx package has no .toJSON() function,
      // so we need to convert to hex-strings manually manually
      transaction = {
        to: this.#normalize(tx.to),
        value: this.#normalize(tx.value),
        data: this.#normalize(tx.data),
        chainId,
        nonce: this.#normalize(tx.nonce),
        gasLimit: this.#normalize(tx.gasLimit),
        gasPrice: this.#normalize(tx.gasPrice),
      };
    } else {
      // new-style transaction from @ethereumjs/tx package
      // we can just copy tx.toJSON() for everything except chainId, which must be a number
      transaction = {
        ...tx.toJSON(),
        chainId,
        to: this.#normalize(Buffer.from(tx.to?.bytes ?? [])),
      } as unknown as EVMSignTransactionParams['transaction'];
    }

    try {
      const details = this.#accountDetailsFromAddress(address);
      const response = await this.bridge.ethereumSignTransaction({
        path: details.hdPath,
        passphraseState: details.passphraseState ?? '',
        useEmptyPassphrase: isEmptyPassphrase(details.passphraseState),
        transaction,
      });
      if (response.success) {
        const newOrMutatedTx = handleSigning(response.payload);

        const addressSignedWith = ethUtil.toChecksumAddress(
          ethUtil.addHexPrefix(
            newOrMutatedTx.getSenderAddress().toString('hex'),
          ),
        );
        const correctAddress = ethUtil.toChecksumAddress(address);
        if (addressSignedWith !== correctAddress) {
          throw new Error("signature doesn't match the right address");
        }

        return newOrMutatedTx;
      }
      throw new Error(response.payload?.error || 'Unknown error');
    } catch (error) {
      throw new Error(error?.toString() ?? 'Unknown error');
    }
  }

  async signMessage(withAccount: string, data: string): Promise<string> {
    return this.signPersonalMessage(withAccount, data);
  }

  // For personal_sign, we need to prefix the message:
  async signPersonalMessage(
    withAccount: string,
    message: string,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const details = this.#accountDetailsFromAddress(withAccount);
      this.bridge
        .ethereumSignMessage({
          path: details.hdPath,
          passphraseState: details.passphraseState ?? '',
          useEmptyPassphrase: isEmptyPassphrase(details.passphraseState),
          messageHex: ethUtil.stripHexPrefix(message),
        })
        .then((response) => {
          if (response.success) {
            if (
              response.payload.address !==
              ethUtil.toChecksumAddress(withAccount)
            ) {
              reject(new Error('signature doesnt match the right address'));
            }
            const signature = addHexPrefix(response.payload.signature);
            // eslint-disable-next-line promise/no-multiple-resolved
            resolve(signature);
          } else {
            reject(new Error(response.payload?.error || 'Unknown error'));
          }
        })
        .catch((error) => {
          reject(new Error(error?.toString() || 'Unknown error'));
        });
    });
  }

  // EIP-712 Sign Typed Data
  async signTypedData<T extends MessageTypes>(
    address: string,
    data: TypedMessage<T>,
    { version }: { version?: SignTypedDataVersion },
  ): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
    const useV4 = version === SignTypedDataVersion.V4;
    const dataVersion = useV4
      ? SignTypedDataVersion.V4
      : SignTypedDataVersion.V3;
    const typedData = TypedDataUtils.sanitizeData(data);
    const domainHash = TypedDataUtils.hashStruct(
      'EIP712Domain',
      typedData.domain,
      typedData.types,
      dataVersion,
    ).toString('hex');
    const messageHash = TypedDataUtils.hashStruct(
      typedData.primaryType as string,
      typedData.message,
      typedData.types,
      dataVersion,
    ).toString('hex');

    const details = this.#accountDetailsFromAddress(address);
    const response = await this.bridge.ethereumSignTypedData({
      path: details.hdPath,
      passphraseState: details.passphraseState ?? '',
      useEmptyPassphrase: isEmptyPassphrase(details.passphraseState),
      data: data as EthereumSignTypedDataMessage<EthereumSignTypedDataTypes>,
      domainHash,
      messageHash,
      metamaskV4Compat: Boolean(useV4), // eslint-disable-line camelcase
    });

    if (response.success) {
      if (ethUtil.toChecksumAddress(address) !== response.payload.address) {
        throw new Error('signature doesnt match the right address');
      }
      return addHexPrefix(response.payload.signature);
    }

    throw new Error(response.payload?.error || 'Unknown error');
  }

  exportAccount(): never {
    throw new Error('Not supported on this device');
  }

  forgetDevice(): void {
    this.accounts = [];
    this.page = 0;
    this.unlockedAccount = 0;
    this.accountDetails = {};
    this.passphraseState = undefined;
  }

  async getPassphraseState(
    _index: number,
    _hdPath: string,
  ): Promise<string | undefined> {
    // TODO: implement
    return Promise.resolve(undefined);
  }

  async #getPage(
    increment: number,
  ): Promise<{ address: string; balance: number | null; index: number }[]> {
    this.page += increment;

    if (this.page <= 0) {
      this.page = 1;
    }

    return new Promise((resolve, reject) => {
      const from = (this.page - 1) * this.perPage;
      const to = from + this.perPage;

      const accounts: {
        address: string;
        balance: number | null;
        index: number;
      }[] = [];

      this.unlock()
        .then(async () => {
          for (let i = from; i < to; i++) {
            const address = this.#addressFromIndex(i);
            if (typeof address === 'undefined') {
              throw new Error('Unknown error');
            }
            accounts.push({
              index: from + i,
              address,
              balance: null,
            });
          }
          resolve(accounts);
        })
        .catch((error) => {
          // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
          reject(error);
        });
    });
  }

  #accountDetailsFromAddress(address: string): AccountDetails {
    const checksummedAddress = ethUtil.toChecksumAddress(address);
    const accountDetails = this.accountDetails[checksummedAddress];
    if (typeof accountDetails === 'undefined') {
      throw new Error('Unknown address');
    }
    return accountDetails;
  }

  #addressFromIndex(i: number): string {
    const dkey = this.hdk.derive(this.#getDerivePath(i));
    const address = ethUtil.bytesToHex(
      ethUtil.publicToAddress(dkey.publicKey, true),
    );
    return ethUtil.toChecksumAddress(address);
  }

  #getDerivePath(index: number): string {
    if (this.#isLedgerLiveHdPath()) {
      throw new Error('Ledger Live is not supported');
    }
    if (this.#isLedgerLegacyHdPath()) {
      return `${pathBase}/${index}`;
    }
    if (this.#isStandardBip44HdPath()) {
      return `${pathBase}/0/${index}`;
    }
    return `${pathBase}/${index}`;
  }

  #getBasePath(): string {
    if (this.#isLedgerLiveHdPath()) {
      throw new Error('Ledger Live is not supported');
    }
    return "m/44'/60'/0'";
  }

  #getPathForIndex(index: number): string {
    // Check if the path is BIP 44 (Ledger Live)
    if (this.#isLedgerLiveHdPath()) {
      return `m/44'/60'/${index}'/0/0`;
    }

    if (this.#isLedgerLegacyHdPath()) {
      return `m/44'/60'/0'/${index}`;
    }

    if (this.#isStandardBip44HdPath()) {
      return `m/44'/60'/0'/0/${index}`;
    }

    // default path: m/44'/60'/0'/0/x
    return `${this.hdPath}/${index}`;
  }

  #isLedgerLiveHdPath(): boolean {
    return this.hdPath === `m/44'/60'/x'/0/0`;
  }

  #isLedgerLegacyHdPath(): boolean {
    return this.hdPath === `m/44'/60'/0'/x`;
  }

  #isStandardBip44HdPath(): boolean {
    return (
      this.hdPath === `m/44'/60'/0'/0/x` || this.hdPath === `m/44'/60'/0'/0`
    );
  }
}
