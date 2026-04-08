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
  createBip39KeyFromSeed,
  mnemonicToSeed,
  secp256k1,
} from '@metamask/key-tree';
import type { Keyring } from '@metamask/keyring-utils';
import { generateMnemonic, validateMnemonic } from '@metamask/scure-bip39';
import { wordlist } from '@metamask/scure-bip39/dist/wordlists/english';
import { add0x, assert, bytesToHex, type Hex, remove0x } from '@metamask/utils';

const hdPathString = `m/44'/60'/0'/0`;
const type = 'HD Key Tree';

/**
 * The serialized state of an `HDKeyring` instance.
 */
export type SerializedHDKeyringState = {
  mnemonic: string;
  numberOfAccounts: number;
  hdPath: string;
};

/**
 * State accepted by {@link HdKeyring.deserialize}. Supports legacy formats
 * (UTF-8 byte arrays, serialized Buffers) for backwards compatibility.
 */
export type DeserializableHDKeyringState = Omit<
  SerializedHDKeyringState,
  'mnemonic'
> & {
  mnemonic: string | number[] | SerializedBuffer;
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

/**
 * Decodes a Uint8Array of Uint16 wordlist indices into a mnemonic string.
 * This is the format returned by `@metamask/scure-bip39`'s `generateMnemonic`.
 *
 * @param encoded - The Uint8Array containing Uint16 wordlist indices.
 * @returns The mnemonic as a space-separated string of words.
 */
function decodeMnemonicIndices(encoded: Uint8Array): string {
  const indices = Array.from(new Uint16Array(new Uint8Array(encoded).buffer));
  return indices.map((i) => wordlist[i]).join(' ');
}

/**
 * Converts a legacy mnemonic representation to a plain string.
 *
 * @param mnemonic - The mnemonic in any accepted format.
 * @returns The mnemonic as a plain string.
 */
function parseMnemonic(mnemonic: string | number[] | SerializedBuffer): string {
  if (typeof mnemonic === 'string') {
    return mnemonic;
  }
  // Both number[] and SerializedBuffer.data are UTF-8 byte arrays
  const bytes = isSerializedBuffer(mnemonic) ? mnemonic.data : mnemonic;
  return Buffer.from(bytes).toString('utf-8');
}

export class HdKeyring implements Keyring {
  static type: string = type;

  type: string = type;

  mnemonic: string | null = null;

  hdPath: string = hdPathString;

  readonly #walletMap = new Map<Hex, WalletData>();

  #mnemonicEntropy?: MnemonicEntropy;

  /**
   * Initialize the keyring with a random mnemonic.
   *
   * @returns A promise that resolves when the process is complete.
   */
  async generateRandomMnemonic(): Promise<void> {
    await this.#initFromMnemonic(
      decodeMnemonicIndices(generateMnemonic(wordlist)),
    );
  }

  /**
   * Return the serialized state of the keyring.
   *
   * @returns The serialized state of the keyring.
   */
  async serialize(): Promise<SerializedHDKeyringState> {
    return {
      mnemonic: this.mnemonic ?? '',
      numberOfAccounts: this.#walletMap.size,
      hdPath: this.hdPath,
    };
  }

  /**
   * Initialize the keyring with the given serialized state.
   *
   * @param opts - The serialized state of the keyring.
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
      await this.#initFromMnemonic(parseMnemonic(opts.mnemonic));
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
    const seed = await mnemonicToSeed(this.mnemonic);
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
   * @returns The signed transaction.
   */
  async signTransaction(
    address: Hex,
    tx: TypedTransaction,
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
   * @returns The signature of the message.
   */
  async signPersonalMessage(address: Hex, msgHex: string): Promise<string> {
    const { signer } = this.#getWalletData(address);
    return signer.signPersonalMessage({ msgHex });
  }

  /**
   * Decrypt an encrypted message using the private key of the specified account.
   *
   * @param address - The address of the account.
   * @param encryptedData - The encrypted data.
   * @returns The decrypted message.
   */
  async decryptMessage(
    address: Hex,
    encryptedData: EthEncryptedData,
  ): Promise<string> {
    const { signer } = this.#getWalletData(address);
    return signer.decryptMessage({ encryptedData });
  }

  /**
   * Sign a typed message using the private key of the specified account.
   * This method is compatible with the `eth_signTypedData` RPC method.
   *
   * @param address - The address of the account.
   * @param data - The typed data to sign.
   * @param options - The options for signing the message.
   * @param options.version - The version of the typed data signing scheme.
   * @returns The signature of the message.
   */
  async signTypedData<
    Version extends SignTypedDataVersion,
    Types extends MessageTypes,
  >(
    address: Hex,
    data: Version extends 'V1' ? TypedDataV1 : TypedMessage<Types>,
    options?: { version?: Version },
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
   * @param address - The address of the account.
   * @param authorization - The EIP-7702 authorization to sign.
   * @returns The signature of the authorization.
   */
  async signEip7702Authorization(
    address: Hex,
    authorization: EIP7702Authorization,
  ): Promise<string> {
    const { signer } = this.#getWalletData(address);
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
   * @param address - The address of the account.
   * @returns The public key of the account.
   */
  async getEncryptionPublicKey(address: Hex): Promise<string> {
    const { signer } = this.#getWalletData(address);
    return signer.getEncryptionPublicKey();
  }

  #getWalletData(account: Hex): WalletData {
    const address = this.#normalizeAddress(account);
    const walletData = this.#walletMap.get(address);
    if (!walletData) {
      throw new Error('HD Keyring - Unable to find matching address.');
    }
    return walletData;
  }

  #hdPathToNodes(): Bip32PathNode[] {
    return this.hdPath.replace(/^m\//u, '').split('/') as Bip32PathNode[];
  }

  #normalizeAddress(address: string): Hex {
    const normalized = normalize(address);
    assert(normalized, 'Expected address to be set');
    return add0x(normalized);
  }

  async #initFromMnemonic(mnemonic: string): Promise<void> {
    if (this.#mnemonicEntropy) {
      throw new Error(
        'Eth-Hd-Keyring: Secret recovery phrase already provided',
      );
    }

    if (!validateMnemonic(mnemonic, wordlist)) {
      throw new Error(
        'Eth-Hd-Keyring: Invalid secret recovery phrase provided',
      );
    }

    this.mnemonic = mnemonic;
    this.#mnemonicEntropy = new MnemonicEntropy('hd', mnemonic);
  }
}
