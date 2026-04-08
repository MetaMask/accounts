import type { TypedTransaction } from '@ethereumjs/tx';
import {
  MnemonicEntropy,
  toBip32KeyTreePath,
  type Bip32PathNode,
  type Eip155Signer,
} from '@metamask/entropy-controller';
import type {
  SignTypedDataVersion,
  EIP7702Authorization,
  EthEncryptedData,
  MessageTypes,
  TypedDataV1,
  TypedMessage,
} from '@metamask/eth-sig-util';
import { normalize } from '@metamask/eth-sig-util';
import {
  type CryptographicFunctions,
  createBip39KeyFromSeed,
  mnemonicToSeed,
  secp256k1,
} from '@metamask/key-tree';
import type { Keyring } from '@metamask/keyring-utils';
import { generateMnemonic, validateMnemonic } from '@metamask/scure-bip39';
import { wordlist } from '@metamask/scure-bip39/dist/wordlists/english';
import { add0x, assert, bytesToHex, type Hex, remove0x } from '@metamask/utils';

// Options:
const hdPathString = `m/44'/60'/0'/0`;
const type = 'HD Key Tree';

type Mnemonic = string | number[] | SerializedBuffer | Buffer | Uint8Array;

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
export type SerializedHDKeyringState = {
  mnemonic: number[];
  numberOfAccounts: number;
  hdPath: string;
};

/**
 * An object that can be passed to the Keyring.deserialize method to initialize
 * an `HDKeyring` instance.
 *
 * @property mnemonic - The mnemonic seed phrase as an array of numbers.
 * @property numberOfAccounts - The number of accounts in the keyring.
 * @property hdPath - The HD path used to derive accounts.
 */
export type DeserializableHDKeyringState = Omit<
  SerializedHDKeyringState,
  'mnemonic'
> & {
  mnemonic: number[] | SerializedBuffer | string;
};

/**
 * Options for selecting an account from an `HDKeyring` instance.
 *
 * @property withAppKeyOrigin - Deprecated. No longer has any effect.
 */
export type HDKeyringAccountSelectionOptions = {
  withAppKeyOrigin?: string;
};

type SerializedBuffer = ReturnType<Buffer['toJSON']>;

type WalletData = {
  signer: Eip155Signer;
  index: number;
};

/**
 * Checks if the given value is a valid serialized Buffer compatible with
 * the return type of `Buffer.toJSON`.
 *
 * @param value - The value to check.
 * @returns `true` if the value is a valid serialized buffer, `false` otherwise.
 */
function isSerializedBuffer(value: unknown): value is SerializedBuffer {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    value.type === 'Buffer' &&
    'data' in value &&
    Array.isArray(value.data)
  );
}

export class HdKeyring implements Keyring {
  static type: string = type;

  type: string = type;

  mnemonic?: Uint8Array | null;

  hdPath: string = hdPathString;

  readonly #walletMap = new Map<Hex, WalletData>();

  #mnemonicEntropy?: MnemonicEntropy;

  // Kept for backward compatibility with callers passing HDKeyringOptions.
  // eslint-disable-next-line @typescript-eslint/no-useless-constructor, no-empty-function
  constructor(_opts: HDKeyringOptions = {}) {}

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
  async serialize(): Promise<SerializedHDKeyringState> {
    let mnemonic: number[] = [];

    if (this.mnemonic) {
      const mnemonicAsString = this.#uint8ArrayToString(this.mnemonic);
      mnemonic = Array.from(new TextEncoder().encode(mnemonicAsString));
    }

    return {
      mnemonic,
      numberOfAccounts: this.#walletMap.size,
      hdPath: this.hdPath,
    };
  }

  /**
   * Initialize the keyring with the given serialized state.
   *
   * @param opts - The serialized state of the keyring.
   * @returns An empty array.
   */
  async deserialize(
    opts: Partial<DeserializableHDKeyringState>,
  ): Promise<void> {
    if (opts.numberOfAccounts && !opts.mnemonic) {
      throw new Error(
        'Eth-Hd-Keyring: Deserialize method cannot be called with an opts value for numberOfAccounts and no menmonic',
      );
    }

    if (this.#mnemonicEntropy) {
      throw new Error(
        'Eth-Hd-Keyring: Secret recovery phrase already provided',
      );
    }

    this.#walletMap.clear();
    this.mnemonic = null;
    this.hdPath = opts.hdPath ?? hdPathString;

    if (opts.mnemonic) {
      await this.#initFromMnemonic(opts.mnemonic);
    }

    if (opts.numberOfAccounts) {
      await this.addAccounts(opts.numberOfAccounts);
    }
  }

  /**
   * Add new accounts to the keyring. The accounts will be derived
   * sequentially from the root HD wallet, using increasing indices.
   *
   * @param numberOfAccounts - The number of accounts to add.
   * @returns The addresses of the new accounts.
   */
  async addAccounts(numberOfAccounts = 1): Promise<Hex[]> {
    if (!this.#mnemonicEntropy) {
      throw new Error('Eth-Hd-Keyring: No secret recovery phrase provided');
    }

    const oldLen = this.#walletMap.size;
    const newAddresses: Hex[] = [];
    const baseNodes = this.#hdPathToNodes();

    for (let i = oldLen; i < numberOfAccounts + oldLen; i++) {
      const derivationPath: Bip32PathNode[] = [
        ...baseNodes,
        `${i}` as Bip32PathNode,
      ];
      const signer = await this.#mnemonicEntropy.getSigner('eip155:1', {
        derivationPath,
      });
      const { address } = await signer.getAddress();
      this.#walletMap.set(address as Hex, { signer, index: i });
      newAddresses.push(address as Hex);
    }

    return newAddresses;
  }

  /**
   * Get the addresses of all accounts in the keyring.
   *
   * @returns The addresses of all accounts in the keyring.
   */
  async getAccounts(): Promise<Hex[]> {
    return Array.from(this.#walletMap.keys());
  }

  /**
   * Export the private key for a specific account.
   *
   * @param address - The address of the account.
   * @returns The private key of the account as a hex string without 0x prefix.
   */
  async exportAccount(address: Hex): Promise<string> {
    const { index } = this.#getWalletData(address);
    const derivationPath = [
      ...this.#hdPathToNodes(),
      `${index}` as Bip32PathNode,
    ];
    assert(this.mnemonic, 'Eth-Hd-Keyring: No secret recovery phrase provided');
    const mnemonicString = this.#uint8ArrayToString(this.mnemonic);
    const seed = await mnemonicToSeed(mnemonicString);
    const root = await createBip39KeyFromSeed(seed, secp256k1);
    const node = await root.derive(toBip32KeyTreePath(derivationPath));
    assert(node.privateKeyBytes, 'Private key not available');
    return remove0x(bytesToHex(node.privateKeyBytes));
  }

  /**
   * Sign a transaction using the private key of the specified account.
   *
   * @param address - The address of the account.
   * @param tx - The transaction to sign.
   * @param _opts - Unused. Kept for interface compatibility.
   * @returns The signed transaction.
   */
  async signTransaction(
    address: Hex,
    tx: TypedTransaction,
    _opts = {},
  ): Promise<TypedTransaction> {
    const { signer } = this.#getWalletData(address);
    return signer.signTransaction(tx);
  }

  /**
   * Sign a personal message using the private key of the specified account.
   * This method is compatible with the `personal_sign` RPC method.
   *
   * @param address - The address of the account.
   * @param msgHex - The message to sign.
   * @param _opts - Unused. Kept for interface compatibility.
   * @returns The signature of the message.
   */
  async signPersonalMessage(
    address: Hex,
    msgHex: string,
    _opts: HDKeyringAccountSelectionOptions = {},
  ): Promise<string> {
    const { signer } = this.#getWalletData(address);
    return signer.signPersonalMessage({ msgHex });
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
    withAccount: Hex,
    encryptedData: EthEncryptedData,
  ): Promise<string> {
    const { signer } = this.#getWalletData(withAccount);
    return signer.decryptMessage({ encryptedData });
  }

  /**
   * Sign a typed message using the private key of the specified account.
   * This method is compatible with the `eth_signTypedData` RPC method.
   *
   * @param address - The address of the account.
   * @param data - The typed data to sign.
   * @param options - The options for signing the message.
   * @returns The signature of the message.
   */
  async signTypedData<
    Version extends SignTypedDataVersion,
    Types extends MessageTypes,
    Options extends { version?: Version },
  >(
    address: Hex,
    data: Version extends 'V1' ? TypedDataV1 : TypedMessage<Types>,
    options?: HDKeyringAccountSelectionOptions & Options,
  ): Promise<string> {
    const { signer } = this.#getWalletData(address);
    return signer.signTypedData({
      data,
      version: options?.version,
    });
  }

  /**
   * Sign an EIP-7702 authorization using the private key of the specified account.
   *
   * @param withAccount - The address of the account.
   * @param authorization - The EIP-7702 authorization to sign.
   * @param _opts - Unused. Kept for interface compatibility.
   * @returns The signature of the authorization.
   */
  async signEip7702Authorization(
    withAccount: Hex,
    authorization: EIP7702Authorization,
    _opts?: HDKeyringAccountSelectionOptions,
  ): Promise<string> {
    const { signer } = this.#getWalletData(withAccount);
    return signer.signEip7702Authorization({ authorization });
  }

  /**
   * Remove an account from the keyring.
   *
   * @param account - The address of the account to remove.
   */
  removeAccount(account: Hex): void {
    const address = this.#normalizeAddress(account);

    if (!this.#walletMap.has(address)) {
      throw new Error(`Address ${address} not found in this keyring`);
    }

    this.#walletMap.delete(address);
  }

  /**
   * Get the public key of the account to be used for encryption.
   *
   * @param withAccount - The address of the account.
   * @param _opts - Unused. Kept for interface compatibility.
   * @returns The public key of the account.
   */
  async getEncryptionPublicKey(
    withAccount: Hex,
    _opts: HDKeyringAccountSelectionOptions = {},
  ): Promise<string> {
    const { signer } = this.#getWalletData(withAccount);
    return signer.getEncryptionPublicKey();
  }

  /**
   * Get the wallet data for the specified account.
   *
   * @param account - The address of the account.
   * @returns The wallet data for the account.
   */
  #getWalletData(account: Hex): WalletData {
    const address = this.#normalizeAddress(account);
    const walletData = this.#walletMap.get(address);
    if (!walletData) {
      throw new Error('HD Keyring - Unable to find matching address.');
    }
    return walletData;
  }

  /**
   * Parse the HD path string into an array of BIP-32 path nodes.
   *
   * @returns The HD path as an array of path nodes.
   */
  #hdPathToNodes(): Bip32PathNode[] {
    return this.hdPath.replace(/^m\//u, '').split('/') as Bip32PathNode[];
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
  #mnemonicToUint8Array(mnemonic: Mnemonic): Uint8Array {
    let mnemonicData: unknown = mnemonic;
    // When using `Buffer.toJSON()`, the Buffer is serialized into an object
    // with the structure `{ type: 'Buffer', data: [...] }`
    if (isSerializedBuffer(mnemonic)) {
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
   * Normalize an address to a lower-cased '0x'-prefixed hex string.
   *
   * @param address - The address to normalize.
   * @returns The normalized address.
   */
  #normalizeAddress(address: string): Hex {
    const normalized = normalize(address);
    assert(normalized, 'Expected address to be set');
    return add0x(normalized);
  }

  /**
   * Sets appropriate properties for the keyring based on the given
   * BIP39-compliant mnemonic.
   *
   * @param mnemonic - A seed phrase represented
   * as a string, an array of UTF-8 bytes, or a Buffer. Mnemonic input
   * passed as type buffer or array of UTF-8 bytes must be NFKD normalized.
   */
  async #initFromMnemonic(mnemonic: Mnemonic): Promise<void> {
    if (this.#mnemonicEntropy) {
      throw new Error(
        'Eth-Hd-Keyring: Secret recovery phrase already provided',
      );
    }

    // Convert and validate before assigning to instance property
    // to avoid inconsistent state if validation fails
    const mnemonicAsUint8Array = this.#mnemonicToUint8Array(mnemonic);
    this.#assertValidMnemonic(mnemonicAsUint8Array);
    this.mnemonic = mnemonicAsUint8Array;

    const mnemonicString = this.#uint8ArrayToString(mnemonicAsUint8Array);
    this.#mnemonicEntropy = new MnemonicEntropy('hd', mnemonicString);
  }

  /**
   * Assert that the mnemonic seed phrase is valid.
   * Throws an error if the mnemonic is not a valid BIP39 phrase.
   *
   * @param mnemonic - The mnemonic seed phrase to validate (as Uint8Array).
   * @throws If the mnemonic is not a valid BIP39 secret recovery phrase.
   */
  #assertValidMnemonic(mnemonic: Uint8Array): void {
    const mnemonicString = this.#uint8ArrayToString(mnemonic);
    if (!validateMnemonic(mnemonicString, wordlist)) {
      throw new Error(
        'Eth-Hd-Keyring: Invalid secret recovery phrase provided',
      );
    }
  }
}
