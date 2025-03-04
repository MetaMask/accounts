import { TypedTransaction } from '@ethereumjs/tx';
import {
  ecsign,
  isValidPrivate,
  privateToPublic,
  publicToAddress,
  stripHexPrefix,
} from '@ethereumjs/util';
import {
  type TypedDataV1,
  type MessageTypes,
  type TypedMessage,
  concatSig,
  decrypt,
  EIP7702Authorization,
  getEncryptionPublicKey,
  normalize,
  personalSign,
  signEIP7702Authorization,
  signTypedData,
  SignTypedDataVersion,
} from '@metamask/eth-sig-util';
import { Keyring } from '@metamask/keyring-utils';
import {
  add0x,
  bigIntToBytes,
  bytesToHex,
  Eip1024EncryptedData,
  Hex,
} from '@metamask/utils';
import { keccak256 } from 'ethereum-cryptography/keccak';
import randombytes from 'randombytes';

type KeyringOpt = {
  withAppKeyOrigin?: string;
  version?: SignTypedDataVersion | string;
};

type Wallet = {
  privateKey: Buffer;
  publicKey: Buffer;
};

const TYPE = 'Simple Key Pair';

// FIXME: This should not be exported as default.
export default class SimpleKeyring implements Keyring {
  #wallets: { privateKey: Buffer; publicKey: Buffer }[];

  readonly type: string = TYPE;

  static type: string = TYPE;

  constructor(privateKeys: string[] = []) {
    this.#wallets = [];

    /* istanbul ignore next: It's not possible to write a unit test for this, because a constructor isn't allowed
     * to be async. Jest can't await the constructor, and when the error gets thrown, Jest can't catch it. */
    this.deserialize(privateKeys).catch((error: Error) => {
      throw new Error(`Problem deserializing SimpleKeyring ${error.message}`);
    });
  }

  async serialize(): Promise<string[]> {
    return this.#wallets.map((a) => a.privateKey.toString('hex'));
  }

  async deserialize(privateKeys: string[]): Promise<void> {
    this.#wallets = privateKeys.map((hexPrivateKey) => {
      const strippedHexPrivateKey = stripHexPrefix(hexPrivateKey);
      const privateKey = Buffer.from(strippedHexPrivateKey, 'hex');
      const publicKey = Buffer.from(privateToPublic(privateKey));
      return { privateKey, publicKey };
    });
  }

  async addAccounts(numAccounts = 1): Promise<Hex[]> {
    const newWallets = [];
    for (let i = 0; i < numAccounts; i++) {
      const privateKey = generateKey();
      const publicKey = Buffer.from(privateToPublic(privateKey));
      newWallets.push({ privateKey, publicKey });
    }
    this.#wallets = this.#wallets.concat(newWallets);
    const hexWallets = newWallets.map(({ publicKey }) =>
      add0x(bytesToHex(publicToAddress(publicKey))),
    );
    return hexWallets;
  }

  async getAccounts(): Promise<Hex[]> {
    return this.#wallets.map(({ publicKey }) =>
      add0x(bytesToHex(publicToAddress(publicKey))),
    );
  }

  async signTransaction(
    address: Hex,
    transaction: TypedTransaction,
    opts: KeyringOpt = {},
  ): Promise<TypedTransaction> {
    const privKey = this.#getPrivateKeyFor(address, opts);
    const signedTx = transaction.sign(privKey);
    // Newer versions of Ethereumjs-tx are immutable and return a new tx object
    return signedTx ?? transaction;
  }

  async signEip7702Authorization(
    address: Hex,
    authorization: EIP7702Authorization,
    opts: KeyringOpt = {},
  ): Promise<string> {
    const privateKey = this.#getPrivateKeyFor(address, opts);
    return signEIP7702Authorization({ privateKey, authorization });
  }

  // For eth_sign, we need to sign arbitrary data:
  async signMessage(
    address: Hex,
    data: string,
    opts = { withAppKeyOrigin: '', validateMessage: true },
  ): Promise<string> {
    const message = stripHexPrefix(data);
    if (
      opts.validateMessage &&
      (message.length === 0 || !message.match(/^[a-fA-F0-9]*$/u))
    ) {
      throw new Error('Cannot sign invalid message');
    }
    const privKey = this.#getPrivateKeyFor(address, opts);
    const msgSig = ecsign(Buffer.from(message, 'hex'), privKey);
    const rawMsgSig = concatSig(
      Buffer.from(bigIntToBytes(msgSig.v)),
      Buffer.from(msgSig.r),
      Buffer.from(msgSig.s),
    );
    return rawMsgSig;
  }

  // For personal_sign, we need to prefix the message:
  async signPersonalMessage(
    address: Hex,
    msgHex: Hex,
    opts = { withAppKeyOrigin: '' },
  ): Promise<string> {
    const privKey = this.#getPrivateKeyFor(address, opts);
    return personalSign({ privateKey: privKey, data: msgHex });
  }

  // For eth_decryptMessage:
  async decryptMessage(
    withAccount: Hex,
    encryptedData: Eip1024EncryptedData,
  ): Promise<string> {
    const wallet = this.#getWalletForAccount(withAccount);
    const privateKey = wallet.privateKey.toString('hex');
    return decrypt({ privateKey, encryptedData });
  }

  async signTypedData<
    Version extends SignTypedDataVersion,
    Types extends MessageTypes,
    Options extends { version: Version } & KeyringOpt,
  >(
    address: Hex,
    data: Version extends 'V1' ? TypedDataV1 : TypedMessage<Types>,
    options?: Options,
  ): Promise<string> {
    let { version } = options ?? { version: SignTypedDataVersion.V1 };

    // Treat invalid versions as "V1"
    if (!isSignTypedDataVersion(version)) {
      version = SignTypedDataVersion.V1;
    }

    const privateKey = this.#getPrivateKeyFor(address, options);
    return signTypedData({ privateKey, data, version });
  }

  // get public key for nacl
  async getEncryptionPublicKey(
    withAccount: Hex,
    opts?: KeyringOpt,
  ): Promise<string> {
    const privKey = this.#getPrivateKeyFor(withAccount, opts);
    const publicKey = getEncryptionPublicKey(privKey.toString('hex'));
    return publicKey;
  }

  #getPrivateKeyFor(
    address: Hex,
    opts: KeyringOpt = { withAppKeyOrigin: '' },
  ): Buffer {
    if (!address) {
      throw new Error('Must specify address.');
    }
    const wallet = this.#getWalletForAccount(address, opts);
    return wallet.privateKey;
  }

  // returns an address specific to an app
  async getAppKeyAddress(address: Hex, origin: string): Promise<Hex> {
    if (!origin || typeof origin !== 'string') {
      throw new Error(`'origin' must be a non-empty string`);
    }
    const wallet = this.#getWalletForAccount(address, {
      withAppKeyOrigin: origin,
    });
    const appKeyAddress = add0x(bytesToHex(publicToAddress(wallet.publicKey)));
    return appKeyAddress;
  }

  // exportAccount should return a hex-encoded private key:
  async exportAccount(
    address: Hex,
    opts = { withAppKeyOrigin: '' },
  ): Promise<string> {
    const wallet = this.#getWalletForAccount(address, opts);
    return wallet.privateKey.toString('hex');
  }

  removeAccount(address: string): void {
    if (
      !this.#wallets
        .map(({ publicKey }) =>
          bytesToHex(publicToAddress(publicKey)).toLowerCase(),
        )
        .includes(address.toLowerCase())
    ) {
      throw new Error(`Address ${address} not found in this keyring`);
    }

    this.#wallets = this.#wallets.filter(
      ({ publicKey }) =>
        bytesToHex(publicToAddress(publicKey)).toLowerCase() !==
        address.toLowerCase(),
    );
  }

  #getWalletForAccount(
    account: string | number,
    opts: KeyringOpt = {},
  ): Wallet {
    const address = normalize(account);
    let wallet = this.#wallets.find(
      ({ publicKey }) => bytesToHex(publicToAddress(publicKey)) === address,
    );
    if (!wallet) {
      throw new Error('Simple Keyring - Unable to find matching address.');
    }

    if (opts.withAppKeyOrigin) {
      const { privateKey } = wallet;
      const appKeyOriginBuffer = Buffer.from(opts.withAppKeyOrigin, 'utf8');
      const appKeyBuffer = Buffer.concat([privateKey, appKeyOriginBuffer]);
      const appKeyPrivateKey = keccak256(appKeyBuffer);
      const appKeyPublicKey = privateToPublic(appKeyPrivateKey);
      wallet = {
        privateKey: Buffer.from(appKeyPrivateKey),
        publicKey: Buffer.from(appKeyPublicKey),
      };
    }

    return wallet;
  }
}

/**
 * Generate and validate a new random key of 32 bytes.
 *
 * @returns Buffer The generated key.
 */
function generateKey(): Buffer {
  const privateKey = randombytes(32);

  if (!isValidPrivate(privateKey)) {
    throw new Error(
      'Private key does not satisfy the curve requirements (ie. it is invalid)',
    );
  }
  return privateKey;
}

/**
 * Type predicate type guard to check if a string is in the enum SignTypedDataVersion.
 *
 * @param version - The string to check.
 * @returns Whether it's in the enum.
 */
// TODO: Put this in @metamask/eth-sig-util
function isSignTypedDataVersion(
  version: SignTypedDataVersion | string,
): version is SignTypedDataVersion {
  return version in SignTypedDataVersion;
}
