import { RLP } from '@ethereumjs/rlp';
import {
  TransactionFactory,
  TypedTxData,
  type TypedTransaction,
} from '@ethereumjs/tx';
import { publicToAddress } from '@ethereumjs/util';
import type { MessageTypes, TypedMessage } from '@metamask/eth-sig-util';
import {
  recoverPersonalSignature,
  recoverTypedSignature,
  SignTypedDataVersion,
  TypedDataUtils,
} from '@metamask/eth-sig-util';
import type { Keyring } from '@metamask/keyring-utils';
import {
  add0x,
  bytesToHex,
  getChecksumAddress,
  Hex,
  remove0x,
} from '@metamask/utils';
import { Buffer } from 'buffer';
import type OldEthJsTransaction from 'ethereumjs-tx';
import HDKey from 'hdkey';

import { LedgerBridge, LedgerBridgeOptions } from './ledger-bridge';
import { handleLedgerTransportError } from './ledger-error-handler';
import { LedgerIframeBridgeOptions } from './ledger-iframe-bridge';

const pathBase = 'm';
const hdPathString = `${pathBase}/44'/60'/0'`;
const keyringType = 'Ledger Hardware';

// This number causes one of our failing tests to run very slowly, as the for loop needs to iterate 1000 times.
const MAX_INDEX = 1000;

enum NetworkApiUrls {
  Ropsten = 'https://api-ropsten.etherscan.io',
  Kovan = 'https://api-kovan.etherscan.io',
  Rinkeby = 'https://api-rinkeby.etherscan.io',
  Mainnet = `https://api.etherscan.io`,
}

type SignTransactionPayload = Awaited<
  ReturnType<LedgerBridge<LedgerIframeBridgeOptions>['deviceSignTransaction']>
>;

export type AccountPageEntry = {
  address: string;
  balance: number | null;
  index: number;
};

export type AccountPage = AccountPageEntry[];

export type AccountDetails = {
  index?: number;
  bip44?: boolean;
  hdPath?: string;
};

export type LedgerBridgeKeyringOptions = {
  hdPath: string;
  accounts: Hex[];
  deviceId: string;
  accountDetails: Readonly<Record<Hex, AccountDetails>>;
  accountIndexes: Readonly<Record<Hex, number>>;
  implementFullBIP44: boolean;
};

export type LedgerKeyringSerializedState = Partial<LedgerBridgeKeyringOptions>;

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

export class LedgerKeyring implements Keyring {
  static type: string = keyringType;

  deviceId = '';

  readonly type: string = keyringType;

  page = 0;

  perPage = 5;

  unlockedAccount = 0;

  accounts: readonly Hex[] = [];

  accountDetails: Record<string, AccountDetails> = {};

  hdk = new HDKey();

  hdPath = hdPathString;

  paths: Record<string, number> = {};

  network: NetworkApiUrls = NetworkApiUrls.Mainnet;

  implementFullBIP44 = false;

  bridge: LedgerBridge<LedgerBridgeOptions>;

  constructor({ bridge }: { bridge: LedgerBridge<LedgerBridgeOptions> }) {
    if (!bridge) {
      throw new Error('Bridge is a required dependency for the keyring');
    }

    this.bridge = bridge;
  }

  async init(): Promise<void> {
    return this.bridge.init();
  }

  async destroy(): Promise<void> {
    return this.bridge.destroy();
  }

  async serialize(): Promise<
    Omit<LedgerKeyringSerializedState, 'accountIndexes'>
  > {
    return {
      hdPath: this.hdPath,
      accounts: this.accounts.slice(),
      deviceId: this.deviceId,
      accountDetails: this.accountDetails,
      implementFullBIP44: false,
    };
  }

  async deserialize(opts: LedgerKeyringSerializedState): Promise<void> {
    this.hdPath = opts.hdPath ?? hdPathString;
    this.accounts = opts.accounts ?? [];
    this.deviceId = opts.deviceId ?? '';
    this.accountDetails = opts.accountDetails ?? {};

    if (!opts.accountDetails) {
      this.#migrateAccountDetails(opts);
    }

    this.implementFullBIP44 = opts.implementFullBIP44 ?? false;

    const keys = new Set<string>(Object.keys(this.accountDetails));
    // Remove accounts that don't have corresponding account details
    this.accounts = this.accounts.filter((account) =>
      keys.has(this.#getChecksumHexAddress(account)),
    );

    return Promise.resolve();
  }

  public setDeviceId(deviceId: string): void {
    this.deviceId = deviceId;
  }

  public getDeviceId(): string {
    return this.deviceId;
  }

  #migrateAccountDetails(opts: Partial<LedgerBridgeKeyringOptions>): void {
    if (this.#isLedgerLiveHdPath() && opts.accountIndexes) {
      for (const [account, index] of Object.entries(opts.accountIndexes)) {
        this.accountDetails[account] = {
          bip44: true,
          hdPath: this.#getPathForIndex(index),
        };
      }
    }
    const keys = new Set<string>(Object.keys(this.accountDetails));
    // try to migrate non-LedgerLive accounts too
    if (!this.#isLedgerLiveHdPath()) {
      this.accounts.forEach((account) => {
        const key = this.#getChecksumHexAddress(account);

        if (!keys.has(key)) {
          this.accountDetails[key] = {
            bip44: false,
            hdPath: this.#pathFromAddress(account),
          };
        }
      });
    }
  }

  isUnlocked(): boolean {
    return Boolean(this.hdk.publicKey);
  }

  isConnected(): boolean {
    return this.bridge.isDeviceConnected;
  }

  setAccountToUnlock(index: number): void {
    this.unlockedAccount = index;
  }

  setHdPath(hdPath: string): void {
    // Reset HDKey if the path changes
    if (this.hdPath !== hdPath) {
      this.hdk = new HDKey();
    }
    this.hdPath = hdPath;
  }

  async unlock(hdPath?: string, updateHdk = true): Promise<Hex> {
    if (this.isUnlocked() && !hdPath) {
      // if the device is already unlocked and no path is provided,
      // we return the checksummed address of the public key stored in
      // `this.hdk`, which is the root address of the last unlocked path.
      return this.#getChecksumHexAddress(
        bytesToHex(publicToAddress(this.hdk.publicKey, true)),
      );
    }
    const path = hdPath ? this.#toLedgerPath(hdPath) : this.hdPath;

    let payload;
    try {
      payload = await this.bridge.getPublicKey({
        hdPath: path,
      });
    } catch (error: unknown) {
      handleLedgerTransportError(
        error,
        'Ledger: Unknown error while unlocking account',
      );
    }

    if (updateHdk && payload.chainCode) {
      this.hdk.publicKey = Buffer.from(payload.publicKey, 'hex');
      this.hdk.chainCode = Buffer.from(payload.chainCode, 'hex');
    }

    return add0x(payload.address);
  }

  async addAccounts(amount: number): Promise<Hex[]> {
    return new Promise((resolve, reject) => {
      this.unlock()
        .then(async (_) => {
          const from = this.unlockedAccount;
          const to = from + amount;
          const newAccounts: Hex[] = [];
          for (let i = from; i < to; i++) {
            const path = this.#getPathForIndex(i);
            let address: Hex;
            if (this.#isLedgerLiveHdPath()) {
              address = await this.unlock(path);
            } else {
              address = this.#addressFromIndex(pathBase, i);
            }

            this.accountDetails[this.#getChecksumHexAddress(address)] = {
              // TODO: consider renaming this property, as the current name is misleading
              // It's currently used to represent whether an account uses the Ledger Live path.
              bip44: this.#isLedgerLiveHdPath(),
              hdPath: path,
            };

            if (!this.accounts.includes(address)) {
              this.accounts = [...this.accounts, address];
              newAccounts.push(address);
            }
            this.page = 0;
          }
          resolve(newAccounts);
        })
        .catch(reject);
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

  async getAccounts(): Promise<Hex[]> {
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
    delete this.accountDetails[this.#getChecksumHexAddress(address)];
  }

  async attemptMakeApp(): Promise<boolean> {
    return this.bridge.attemptMakeApp();
  }

  async updateTransportMethod(transportType: string): Promise<boolean> {
    return this.bridge.updateTransportMethod(transportType);
  }

  // tx is an instance of the ethereumjs-transaction class.
  async signTransaction(
    address: Hex,
    tx: TypedTransaction | OldEthJsTransaction,
  ): Promise<TypedTransaction | OldEthJsTransaction> {
    let rawTxHex;
    // transactions built with older versions of ethereumjs-tx have a
    // getChainId method that newer versions do not. Older versions are mutable
    // while newer versions default to being immutable. Expected shape and type
    // of data for v, r and s differ (Buffer (old) vs BN (new))
    if (isOldStyleEthereumjsTx(tx)) {
      // In this version of ethereumjs-tx we must add the chainId in hex format
      // to the initial v value. The chainId must be included in the serialized
      // transaction which is only communicated to ethereumjs-tx in this
      // value. In newer versions the chainId is communicated via the 'Common'
      // object.
      tx.v = tx.getChainId();
      // @ts-expect-error tx.r should be a Buffer, but we are assigning a string
      tx.r = '0x00';
      // @ts-expect-error tx.s should be a Buffer, but we are assigning a string
      tx.s = '0x00';

      rawTxHex = tx.serialize().toString('hex');

      return this.#signTransaction(address, rawTxHex, (payload) => {
        tx.v = Buffer.from(payload.v, 'hex');
        tx.r = Buffer.from(payload.r, 'hex');
        tx.s = Buffer.from(payload.s, 'hex');
        return tx;
      });
    }

    // The below `encode` call is only necessary for legacy transactions, as `getMessageToSign`
    // calls `rlp.encode` internally for non-legacy transactions. As per the "Transaction Execution"
    // section of the ethereum yellow paper, transactions need to be "well-formed RLP, with no additional
    // trailing bytes".

    // Note also that `getMessageToSign` will return valid RLP for all transaction types, whereas the
    // `serialize` method will not for any transaction type except legacy. This is because `serialize` includes
    // empty r, s and v values in the encoded rlp. This is why we use `getMessageToSign` here instead of `serialize`.
    const messageToSign = tx.getMessageToSign();

    rawTxHex = Array.isArray(messageToSign)
      ? Buffer.from(RLP.encode(messageToSign)).toString('hex')
      : bytesToHex(messageToSign);

    return this.#signTransaction(address, rawTxHex, (payload) => {
      // Because tx will be immutable, first get a plain javascript object that
      // represents the transaction. Using txData here as it aligns with the
      // nomenclature of ethereumjs/tx.
      const txData: TypedTxData = tx.toJSON();
      // The fromTxData utility expects a type to support transactions with a type other than 0
      txData.type = tx.type;
      // The fromTxData utility expects v,r and s to be hex prefixed
      txData.v = add0x(payload.v);
      txData.r = add0x(payload.r);
      txData.s = add0x(payload.s);
      // Adopt the 'common' option from the original transaction and set the
      // returned object to be frozen if the original is frozen.
      return TransactionFactory.fromTxData(txData, {
        common: tx.common,
        freeze: Object.isFrozen(tx),
      });
    });
  }

  async #signTransaction(
    address: Hex,
    rawTxHex: string,
    handleSigning: (
      payload: SignTransactionPayload,
    ) => TypedTransaction | OldEthJsTransaction,
  ): Promise<TypedTransaction | OldEthJsTransaction> {
    const hdPath = await this.unlockAccountByAddress(address);

    if (!hdPath) {
      throw new Error('Ledger: hdPath is empty while signing transaction');
    }

    let payload;

    try {
      payload = await this.bridge.deviceSignTransaction({
        tx: remove0x(rawTxHex),
        hdPath,
      });
    } catch (error: unknown) {
      handleLedgerTransportError(
        error,
        'Ledger: Unknown error while signing transaction',
      );
    }

    const newOrMutatedTx = handleSigning(payload);
    const valid = newOrMutatedTx.verifySignature();
    if (valid) {
      return newOrMutatedTx;
    }
    throw new Error('Ledger: The transaction signature is not valid');
  }

  async signMessage(withAccount: Hex, data: string): Promise<string> {
    return this.signPersonalMessage(withAccount, data);
  }

  // For personal_sign, we need to prefix the message:
  async signPersonalMessage(
    withAccount: Hex,
    message: string,
  ): Promise<string> {
    const hdPath = await this.unlockAccountByAddress(withAccount);

    if (!hdPath) {
      throw new Error('Ledger: Unknown error while signing message');
    }

    let payload;
    try {
      payload = await this.bridge.deviceSignMessage({
        hdPath,
        message: remove0x(message),
      });
    } catch (error: unknown) {
      handleLedgerTransportError(
        error,
        'Ledger: Unknown error while signing message',
      );
    }

    let modifiedV = parseInt(String(payload.v), 10).toString(16);
    if (modifiedV.length < 2) {
      modifiedV = `0${modifiedV}`;
    }

    const signature = `0x${payload.r}${payload.s}${modifiedV}`;
    const addressSignedWith = recoverPersonalSignature({
      data: message,
      signature,
    });
    if (
      this.#getChecksumHexAddress(addressSignedWith) !==
      this.#getChecksumHexAddress(withAccount)
    ) {
      throw new Error('Ledger: The signature doesnt match the right address');
    }
    return signature;
  }

  async unlockAccountByAddress(address: Hex): Promise<string | undefined> {
    const checksummedAddress = this.#getChecksumHexAddress(address);
    const accountDetails = this.accountDetails[checksummedAddress];
    if (!accountDetails) {
      throw new Error(
        `Ledger: Account for address '${checksummedAddress}' not found`,
      );
    }
    const { hdPath } = accountDetails;
    const unlockedAddress = await this.unlock(hdPath, false);

    // unlock resolves to the address for the given hdPath as reported by the ledger device
    // if that address is not the requested address, then this account belongs to a different device or seed
    if (unlockedAddress.toLowerCase() !== address.toLowerCase()) {
      throw new Error(
        `Ledger: Account ${address} does not belong to the connected device`,
      );
    }
    return hdPath;
  }

  async signTypedData<
    Version extends SignTypedDataVersion.V4,
    Types extends MessageTypes,
    Options extends { version?: Version },
  >(
    withAccount: Hex,
    data: TypedMessage<Types>,
    options?: Options,
  ): Promise<string> {
    const { version } = options ?? {};
    const isV4 = version === 'V4';
    if (!isV4) {
      throw new Error(
        'Ledger: Only version 4 of typed data signing is supported',
      );
    }

    const { domain, types, primaryType, message } =
      TypedDataUtils.sanitizeData(data);

    const hdPath = await this.unlockAccountByAddress(withAccount);

    if (!hdPath) {
      throw new Error('Ledger: Unknown error while signing message');
    }

    let payload;
    try {
      payload = await this.bridge.deviceSignTypedData({
        hdPath,
        message: {
          domain: {
            name: domain.name,
            chainId: domain.chainId,
            version: domain.version,
            verifyingContract: domain.verifyingContract,
            salt:
              domain.salt instanceof ArrayBuffer
                ? Buffer.from(domain.salt).toString('hex')
                : domain.salt,
          },
          types,
          primaryType: primaryType.toString(),
          message,
        },
      });
    } catch (error: unknown) {
      handleLedgerTransportError(
        error,
        'Ledger: Unknown error while signing message',
      );
    }

    let recoveryId = parseInt(String(payload.v), 10).toString(16);
    if (recoveryId.length < 2) {
      recoveryId = `0${recoveryId}`;
    }
    const signature = `0x${payload.r}${payload.s}${recoveryId}`;
    const addressSignedWith = recoverTypedSignature({
      data,
      signature,
      version: SignTypedDataVersion.V4,
    });

    if (
      this.#getChecksumHexAddress(addressSignedWith) !==
      this.#getChecksumHexAddress(withAccount)
    ) {
      throw new Error('Ledger: The signature doesnt match the right address');
    }
    return signature;
  }

  forgetDevice(): void {
    this.deviceId = '';
    this.accounts = [];
    this.page = 0;
    this.unlockedAccount = 0;
    this.paths = {};
    this.accountDetails = {};
    this.hdk = new HDKey();
  }

  /* PRIVATE METHODS */
  async #getPage(increment: number): Promise<AccountPage> {
    this.page += increment;

    if (this.page <= 0) {
      this.page = 1;
    }
    const from = (this.page - 1) * this.perPage;
    const to = from + this.perPage;

    await this.unlock();
    let accounts;
    if (this.#isLedgerLiveHdPath()) {
      accounts = await this.#getAccountsBIP44(from, to);
    } else {
      accounts = this.#getAccountsLegacy(from, to);
    }
    return accounts;
  }

  async #getAccountsBIP44(from: number, to: number): Promise<AccountPage> {
    const accounts: AccountPage = [];

    for (let i = from; i < to; i++) {
      const path = this.#getPathForIndex(i);
      const address = await this.unlock(path);
      const valid = this.implementFullBIP44
        ? await this.#hasPreviousTransactions(address)
        : true;
      accounts.push({
        address,
        balance: null,
        index: i,
      });

      // PER BIP44
      // "Software should prevent a creation of an account if
      // a previous account does not have a transaction history
      // (meaning none of its addresses have been used before)."
      if (!valid) {
        break;
      }
    }
    return accounts;
  }

  #getAccountsLegacy(from: number, to: number): AccountPage {
    const accounts: AccountPage = [];

    for (let i = from; i < to; i++) {
      const address = this.#addressFromIndex(pathBase, i);
      accounts.push({
        address,
        balance: null,
        index: i,
      });
      this.paths[this.#getChecksumHexAddress(address)] = i;
    }
    return accounts;
  }

  #addressFromIndex(basePath: string, i: number): Hex {
    const dkey = this.hdk.derive(`${basePath}/${i}`);
    const address = bytesToHex(publicToAddress(dkey.publicKey, true));
    return this.#getChecksumHexAddress(address);
  }

  #pathFromAddress(address: string): string {
    const checksummedAddress = this.#getChecksumHexAddress(address);
    let index = this.paths[checksummedAddress];
    if (typeof index === 'undefined') {
      for (let i = 0; i < MAX_INDEX; i++) {
        if (checksummedAddress === this.#addressFromIndex(pathBase, i)) {
          index = i;
          break;
        }
      }
    }

    if (typeof index === 'undefined') {
      throw new Error('Unknown address');
    }
    return this.#getPathForIndex(index);
  }

  #getPathForIndex(index: number): string {
    // Check if the path is BIP 44 (Ledger Live)
    return this.#isLedgerLiveHdPath()
      ? `m/44'/60'/${index}'/0/0`
      : `${this.hdPath}/${index}`;
  }

  #isLedgerLiveHdPath(): boolean {
    return this.hdPath === `m/44'/60'/0'/0/0`;
  }

  #toLedgerPath(path: string): string {
    return path.toString().replace('m/', '');
  }

  async #hasPreviousTransactions(address: string): Promise<boolean> {
    const apiUrl = this.#getApiUrl();
    const response = await window.fetch(
      `${apiUrl}/api?module=account&action=txlist&address=${address}&tag=latest&page=1&offset=1`,
    );
    const parsedResponse = await response.json();
    return parsedResponse.status !== '0' && parsedResponse.result.length > 0;
  }

  #getApiUrl(): NetworkApiUrls {
    return this.network;
  }

  #getChecksumHexAddress(address: string): Hex {
    return getChecksumAddress(add0x(address));
  }
}
