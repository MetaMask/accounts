import type { TypedTransaction } from '@ethereumjs/tx';
import {
  privateToPublic,
  publicToAddress,
  ecsign,
  arrToBufArr,
  bufferToHex,
} from '@ethereumjs/util';
import {
  concatSig,
  decrypt,
  type EthEncryptedData,
  getEncryptionPublicKey,
  type MessageTypes,
  normalize,
  personalSign,
  signTypedData,
  SignTypedDataVersion,
  type TypedDataV1,
  type TypedMessage,
} from '@metamask/eth-sig-util';
import {
  type CryptographicFunctions,
  mnemonicToSeed,
} from '@metamask/key-tree';
import { generateMnemonic } from '@metamask/scure-bip39';
import { wordlist } from '@metamask/scure-bip39/dist/wordlists/english';
import { assert, assertIsHexString, remove0x } from '@metamask/utils';
import { HDKey } from 'ethereum-cryptography/hdkey';
import { keccak256 } from 'ethereum-cryptography/keccak';
import { bytesToHex } from 'ethereum-cryptography/utils';

// Options:
const hdPathString = `m/44'/60'/0'/0`;
const type = 'HD Key Tree';

type JsCastedBuffer = {
  type: 'Buffer';
  data: unknown;
};

export type HDKeyringOptions = {
  cryptographicFunctions?: CryptographicFunctions;
};

/**
 * The serialized state of an `HDKeyring` instance.
 *
 * @property mnemonic - The mnemonic seed phrase as an array of numbers.
 * @property numberOfAccounts - The number of accounts in the keyring.
 * @property hdPath - The HD path used to derive accounts.
 */
export type HDKeyringState = {
  mnemonic: number[] | Uint8Array | Buffer | string;
  numberOfAccounts: number;
  hdPath: string;
};

/**
 * Options for selecting an account from an `HDKeyring` instance.
 *
 * @property withAppKeyOrigin - The origin of the app requesting the account.
 */
export type HDKeyringAccountSelectionOptions = {
  withAppKeyOrigin?: string;
};

/**
 * Checks if the given value is a JsCastedBuffer.
 *
 * @param maybeJsCastedBuffer - The value to check.
 * @returns `true` if the value is a JsCastedBuffer, `false` otherwise.
 */
function isJsCastedBuffer(
  maybeJsCastedBuffer: unknown,
): maybeJsCastedBuffer is JsCastedBuffer {
  return (
    typeof maybeJsCastedBuffer === 'object' &&
    maybeJsCastedBuffer !== null &&
    'type' in maybeJsCastedBuffer &&
    maybeJsCastedBuffer.type === 'Buffer' &&
    'data' in maybeJsCastedBuffer
  );
}

export class HdKeyring {
  static type: string = type;

  type: string = type;

  mnemonic?: Uint8Array | null;

  root?: HDKey | null;

  hdWallet?: HDKey;

  hdPath: string = hdPathString;

  #wallets: HDKey[] = [];

  readonly #cryptographicFunctions?: CryptographicFunctions;

  constructor(opts: HDKeyringOptions = {}) {
    // Cryptographic functions to be used by `@metamask/key-tree`. It will use built-in implementations if not provided here.
    this.#cryptographicFunctions = opts.cryptographicFunctions;
  }

  /**
   * Initialize the keyring with a random mnemonic.
   *
   * @returns A promise that resolves when the process is complete.
   */
  async generateRandomMnemonic(): Promise<void> {
    await this.#initFromMnemonic(generateMnemonic(wordlist));
  }

  /**
   * Return the serialized state of the keyring.
   *
   * @returns The serialized state of the keyring.
   */
  async serialize(): Promise<HDKeyringState> {
    let mnemonic: number[] = [];

    if (this.mnemonic) {
      const mnemonicAsString = this.#uint8ArrayToString(this.mnemonic);
      mnemonic = Array.from(new TextEncoder().encode(mnemonicAsString));
    }

    return {
      mnemonic,
      numberOfAccounts: this.#wallets.length,
      hdPath: this.hdPath,
    };
  }

  /**
   * Initialize the keyring with the given serialized state.
   *
   * @param opts - The serialized state of the keyring.
   * @returns An empty array.
   */
  async deserialize(opts: Partial<HDKeyringState> = {}): Promise<string[]> {
    if (opts.numberOfAccounts && !opts.mnemonic) {
      throw new Error(
        'Eth-Hd-Keyring: Deserialize method cannot be called with an opts value for numberOfAccounts and no menmonic',
      );
    }

    if (this.root) {
      throw new Error(
        'Eth-Hd-Keyring: Secret recovery phrase already provided',
      );
    }
    this.#wallets = [];
    this.mnemonic = null;
    this.root = null;
    this.hdPath = opts.hdPath ?? hdPathString;

    if (opts.mnemonic) {
      await this.#initFromMnemonic(opts.mnemonic);
    }

    if (opts.numberOfAccounts) {
      return this.addAccounts(opts.numberOfAccounts);
    }

    return [];
  }

  /**
   * Add new accounts to the keyring. The accounts will be derived
   * sequentially from the root HD wallet, using increasing indices.
   *
   * @param numberOfAccounts - The number of accounts to add.
   * @returns The addresses of the new accounts.
   */
  async addAccounts(numberOfAccounts = 1): Promise<string[]> {
    if (!this.root) {
      throw new Error('Eth-Hd-Keyring: No secret recovery phrase provided');
    }

    const oldLen = this.#wallets.length;
    const newWallets = [];
    for (let i = oldLen; i < numberOfAccounts + oldLen; i++) {
      const wallet = this.root.deriveChild(i);
      newWallets.push(wallet);
      this.#wallets.push(wallet);
    }
    const hexWallets = newWallets.map((wallet) => {
      return this.#addressfromPublicKey(wallet.publicKey as Uint8Array);
    });
    return Promise.resolve(hexWallets);
  }

  /**
   * Get the addresses of all accounts in the keyring.
   *
   * @returns The addresses of all accounts in the keyring.
   */
  async getAccounts(): Promise<string[]> {
    return this.#wallets.map((wallet) =>
      this.#addressfromPublicKey(wallet.publicKey as Uint8Array),
    );
  }

  /**
   * Get the public address of the account for the given app key origin.
   *
   * @param address - The address of the account.
   * @param origin - The origin of the app requesting the account.
   * @returns The public address of the account.
   */
  async getAppKeyAddress(address: string, origin: string): Promise<string> {
    if (!origin || typeof origin !== 'string') {
      throw new Error(`'origin' must be a non-empty string`);
    }
    const wallet = this.#getWalletForAccount(address, {
      withAppKeyOrigin: origin,
    });
    assert(wallet.publicKey, 'Expected public key to be set');
    const appKeyAddress = normalize(
      publicToAddress(wallet.publicKey).toString('hex'),
    );
    assert(appKeyAddress, 'Expected app key address to be set');
    return appKeyAddress;
  }

  /**
   * Export the private key for a specific account.
   *
   * @param address - The address of the account.
   * @param opts - The options for exporting the account.
   * @param opts.withAppKeyOrigin - An optional string to export the account
   * for a specific app origin.
   * @returns The private key of the account.
   */
  async exportAccount(
    address: string,
    opts?: { withAppKeyOrigin: string },
  ): Promise<string> {
    const wallet = opts
      ? this.#getWalletForAccount(address, opts)
      : this.#getWalletForAccount(address);
    const { privateKey } = wallet;
    assert(
      privateKey instanceof Uint8Array,
      'Expected private key to be of type Uint8Array',
    );
    return bytesToHex(privateKey);
  }

  /**
   * Sign a transaction using the private key of the specified account.
   *
   * @param address - The address of the account.
   * @param tx - The transaction to sign.
   * @param opts - The options for signing the transaction.
   * @returns The signed transaction.
   */
  async signTransaction(
    address: string,
    tx: TypedTransaction,
    opts = {},
  ): Promise<TypedTransaction> {
    const privKey = this.#getPrivateKeyFor(address, opts);
    const signedTx = tx.sign(Buffer.from(privKey));
    // Newer versions of Ethereumjs-tx are immutable and return a new tx object
    return signedTx ?? tx;
  }

  /**
   * Sign a message using the private key of the specified account.
   *
   * @param address - The address of the account.
   * @param data - The data to sign.
   * @param opts - The options for signing the message.
   * @returns The signature of the message.
   */
  async signMessage(
    address: string,
    data: string,
    opts: HDKeyringAccountSelectionOptions = {},
  ): Promise<string> {
    assertIsHexString(data);
    const message = remove0x(data);
    const privKey = this.#getPrivateKeyFor(address, opts);
    const msgSig = ecsign(Buffer.from(message, 'hex'), Buffer.from(privKey));
    const rawMsgSig = concatSig(
      // WARN: verify this cast to Buffer
      msgSig.v as unknown as Buffer,
      msgSig.r,
      msgSig.s,
    );
    return rawMsgSig;
  }

  /**
   * Sign a personal message using the private key of the specified account.
   * This method is compatible with the `personal_sign` RPC method.
   *
   * @param address - The address of the account.
   * @param msgHex - The message to sign.
   * @param opts - The options for signing the message.
   * @returns The signature of the message.
   */
  async signPersonalMessage(
    address: string,
    msgHex: string,
    opts: HDKeyringAccountSelectionOptions = {},
  ): Promise<string> {
    const privKey = this.#getPrivateKeyFor(address, opts);
    const privateKey = Buffer.from(privKey);
    return personalSign({ privateKey, data: msgHex });
  }

  /**
   * Decrypt an encrypted message using the private key of the specified account.
   * The message must be encrypted using the public key of the account.
   * This method is compatible with the `eth_decryptMessage` RPC method
   *
   * @param withAccount - The address of the account.
   * @param encryptedData - The encrypted data.
   * @returns The decrypted message.
   */
  async decryptMessage(
    withAccount: string,
    encryptedData: EthEncryptedData,
  ): Promise<string> {
    const wallet = this.#getWalletForAccount(withAccount);
    const { privateKey: privateKeyAsUint8Array } = wallet;
    assert(privateKeyAsUint8Array, 'Expected private key to be set');
    const privateKeyAsHex = Buffer.from(privateKeyAsUint8Array).toString('hex');
    return decrypt({ privateKey: privateKeyAsHex, encryptedData });
  }

  /**
   * Sign a typed message using the private key of the specified account.
   * This method is compatible with the `eth_signTypedData` RPC method.
   *
   * @param withAccount - The address of the account.
   * @param typedData - The typed data to sign.
   * @param opts - The options for signing the message.
   * @returns The signature of the message.
   */
  async signTypedData<Types extends MessageTypes>(
    withAccount: string,
    typedData: TypedDataV1 | TypedMessage<Types>,
    opts: HDKeyringAccountSelectionOptions & {
      version: SignTypedDataVersion;
    } = { version: SignTypedDataVersion.V1 },
  ): Promise<string> {
    // Treat invalid versions as "V1"
    const version = Object.keys(SignTypedDataVersion).includes(opts.version)
      ? opts.version
      : SignTypedDataVersion.V1;

    const privateKey = this.#getPrivateKeyFor(withAccount, opts);
    return signTypedData({
      privateKey: Buffer.from(privateKey),
      data: typedData,
      version,
    });
  }

  /**
   * Remove an account from the keyring.
   *
   * @param account - The address of the account to remove.
   */
  removeAccount(account: string): void {
    const address = normalize(account);
    assert(address, 'Must specify a valid address.');
    if (
      !this.#wallets
        .map(
          ({ publicKey }) => publicKey && this.#addressfromPublicKey(publicKey),
        )
        .includes(address)
    ) {
      throw new Error(`Address ${address} not found in this keyring`);
    }

    this.#wallets = this.#wallets.filter(
      ({ publicKey }) =>
        publicKey && this.#addressfromPublicKey(publicKey) !== address,
    );
  }

  /**
   * Get the public key of the account to be used for encryption.
   *
   * @param withAccount - The address of the account.
   * @param opts - The options for selecting the account.
   * @returns The public key of the account.
   */
  async getEncryptionPublicKey(
    withAccount: string,
    opts: HDKeyringAccountSelectionOptions = {},
  ): Promise<string> {
    const privKey = this.#getPrivateKeyFor(withAccount, opts);
    const publicKey = getEncryptionPublicKey(bytesToHex(privKey));
    return publicKey;
  }

  /**
   * Convert a Uint8Array mnemonic to a secret recovery phrase,
   * using the english wordlist.
   *
   * @param mnemonic - The Uint8Array mnemonic.
   * @returns The string mnemonic.
   */
  #uint8ArrayToString(mnemonic: Uint8Array): string {
    const recoveredIndices = Array.from(
      new Uint16Array(new Uint8Array(mnemonic).buffer),
    );
    return recoveredIndices.map((i) => wordlist[i]).join(' ');
  }

  /**
   * Convert a secret recovery phrase to a Uint8Array mnemonic,
   * using the english wordlist.
   *
   * @param mnemonic - The string mnemonic.
   * @returns The Uint8Array mnemonic.
   */
  #stringToUint8Array(mnemonic: string): Uint8Array {
    const indices = mnemonic.split(' ').map((word) => wordlist.indexOf(word));
    return new Uint8Array(new Uint16Array(indices).buffer);
  }

  /**
   * Convert a mnemonic to a Uint8Array mnemonic.
   *
   * @param mnemonic - The mnemonic seed phrase.
   * @returns The Uint8Array mnemonic.
   */
  #mnemonicToUint8Array(
    mnemonic: Buffer | JsCastedBuffer | string | Uint8Array | number[],
  ): Uint8Array {
    let mnemonicData: unknown = mnemonic;
    // when encrypted/decrypted, buffers get cast into js object with a property type set to buffer
    if (isJsCastedBuffer(mnemonic)) {
      mnemonicData = mnemonic.data;
    }

    if (
      // this block is for backwards compatibility with vaults that were previously stored as buffers, number arrays or plain text strings
      typeof mnemonicData === 'string' ||
      Buffer.isBuffer(mnemonicData) ||
      Array.isArray(mnemonicData)
    ) {
      let mnemonicAsString: string;
      if (Array.isArray(mnemonicData)) {
        mnemonicAsString = Buffer.from(mnemonicData).toString();
      } else if (Buffer.isBuffer(mnemonicData)) {
        mnemonicAsString = mnemonicData.toString();
      } else {
        mnemonicAsString = mnemonicData;
      }
      return this.#stringToUint8Array(mnemonicAsString);
    } else if (
      mnemonicData instanceof Object &&
      !(mnemonicData instanceof Uint8Array)
    ) {
      // when encrypted/decrypted the Uint8Array becomes a js object we need to cast back to a Uint8Array
      return Uint8Array.from(Object.values(mnemonicData));
    }

    assert(mnemonicData instanceof Uint8Array, 'Expected Uint8Array mnemonic');
    return mnemonicData;
  }

  /**
   * Get the private key for the specified account.
   *
   * @param address - The address of the account.
   * @param opts - The options for selecting the account.
   * @returns The private key of the account.
   */
  #getPrivateKeyFor(
    address: string,
    opts?: HDKeyringAccountSelectionOptions,
  ): Uint8Array | Buffer {
    if (!address) {
      throw new Error('Must specify address.');
    }
    const wallet = this.#getWalletForAccount(address, opts);
    assert(wallet.privateKey, 'Missing private key');
    return wallet.privateKey;
  }

  /**
   * Get the wallet for the specified account.
   *
   * @param account - The address of the account.
   * @returns The wallet for the account as HDKey.
   */
  #getWalletForAccount(account: string): HDKey;

  /**
   * Get the wallet for the specified account and app origin.
   *
   * @param account - The address of the account.
   * @param opts - The options for selecting the account.
   * @returns A key pair representing the wallet.
   */
  #getWalletForAccount(
    accounts: string,
    opts: { withAppKeyOrigin: string },
  ): { privateKey: Buffer; publicKey: Buffer };

  /**
   * Get the wallet for the specified account with optional
   * additional options.
   *
   * @param account - The address of the account.
   * @param opts - The options for selecting the account.
   * @returns A key pair representing the wallet.
   */
  #getWalletForAccount(
    account: string,
    opts?: HDKeyringAccountSelectionOptions,
  ): HDKey | { privateKey: Buffer; publicKey: Buffer };

  #getWalletForAccount(
    account: string,
    { withAppKeyOrigin }: HDKeyringAccountSelectionOptions = {},
  ): HDKey | { privateKey: Buffer; publicKey: Buffer } {
    const address = normalize(account);
    const wallet = this.#wallets.find(({ publicKey }) => {
      return publicKey && this.#addressfromPublicKey(publicKey) === address;
    });
    if (!wallet) {
      throw new Error('HD Keyring - Unable to find matching address.');
    }

    if (withAppKeyOrigin) {
      const { privateKey } = wallet;
      assert(privateKey, 'Expected private key to be set');
      const appKeyOriginBuffer = Buffer.from(withAppKeyOrigin, 'utf8');
      const appKeyBuffer = Buffer.concat([privateKey, appKeyOriginBuffer]);
      const appKeyPrivateKey = arrToBufArr(keccak256(appKeyBuffer));
      const appKeyPublicKey = privateToPublic(appKeyPrivateKey);
      return { privateKey: appKeyPrivateKey, publicKey: appKeyPublicKey };
    }

    return wallet;
  }

  /**
   * Sets appropriate properties for the keyring based on the given
   * BIP39-compliant mnemonic.
   *
   * @param mnemonic - A seed phrase represented
   * as a string, an array of UTF-8 bytes, or a Buffer. Mnemonic input
   * passed as type buffer or array of UTF-8 bytes must be NFKD normalized.
   */
  async #initFromMnemonic(
    mnemonic: string | number[] | Buffer | Uint8Array,
  ): Promise<void> {
    if (this.root) {
      throw new Error(
        'Eth-Hd-Keyring: Secret recovery phrase already provided',
      );
    }

    this.mnemonic = this.#mnemonicToUint8Array(mnemonic);

    const seed = await mnemonicToSeed(
      this.mnemonic,
      '', // No passphrase
      this.#cryptographicFunctions,
    );
    this.hdWallet = HDKey.fromMasterSeed(seed);
    this.root = this.hdWallet.derive(this.hdPath);
  }

  /**
   * Get the address of the account from the public key.
   *
   * @param publicKey - The public key of the account.
   * @returns The address of the account.
   */
  #addressfromPublicKey(publicKey: Uint8Array): string {
    return bufferToHex(
      publicToAddress(Buffer.from(publicKey), true),
    ).toLowerCase();
  }
}
