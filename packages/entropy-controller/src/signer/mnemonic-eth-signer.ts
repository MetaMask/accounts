import type { TypedTransaction } from '@ethereumjs/tx';
import { publicToAddress } from '@ethereumjs/util';
import {
  decrypt,
  getEncryptionPublicKey,
  personalSign,
  signEIP7702Authorization,
  signTypedData,
  SignTypedDataVersion,
} from '@metamask/eth-sig-util';
import type {
  MessageTypes,
  TypedDataV1,
  TypedMessage,
} from '@metamask/eth-sig-util';
import type { SLIP10NodeInterface } from '@metamask/key-tree';
import { add0x, bytesToHex, remove0x } from '@metamask/utils';

import type {
  DecryptMessageArguments,
  Eip155Scope,
  Eip155Signer,
  GetEthAddressResponse,
  SignEip7702AuthorizationArguments,
  SignPersonalMessageArguments,
  SignTypedDataArguments,
} from './eip155-signer';

/**
 * {@link Eip155Signer} implementation backed by a BIP-32 node derived from a mnemonic.
 *
 * The derivation path and private key are bound at construction time.
 * Each instance corresponds to a single account (e.g. `m/44'/60'/0'/0/0`).
 */
export class MnemonicEip155Signer implements Eip155Signer {
  readonly scope: Eip155Scope;

  readonly #node: SLIP10NodeInterface;

  /**
   * Creates a new MnemonicEthSigner.
   *
   * @param scope - The CAIP-2 chain ID (e.g. `"eip155:1"` for Ethereum mainnet).
   * @param node - The address-level SLIP10 node (e.g. at m/44'/60'/0'/0/0).
   */
  constructor(scope: Eip155Scope, node: SLIP10NodeInterface) {
    this.scope = scope;
    this.#node = node;
  }

  async getAddress(): Promise<GetEthAddressResponse> {
    const pubKeyBytes = new Uint8Array(this.#node.publicKeyBytes);
    const address = add0x(
      bytesToHex(publicToAddress(pubKeyBytes, true)).toLowerCase(),
    );
    return { address };
  }

  async signTransaction(tx: TypedTransaction): Promise<TypedTransaction> {
    const { privateKeyBytes } = this.#node;
    if (!privateKeyBytes) {
      throw new Error('Private key is not available on the node');
    }
    return tx.sign(new Uint8Array(privateKeyBytes));
  }

  async signPersonalMessage(
    args: SignPersonalMessageArguments,
  ): Promise<string> {
    const { privateKeyBytes } = this.#node;
    if (!privateKeyBytes) {
      throw new Error('Private key is not available on the node');
    }
    return personalSign({
      privateKey: Buffer.from(privateKeyBytes),
      data: args.msgHex,
    });
  }

  async signTypedData<
    Version extends SignTypedDataVersion,
    Types extends MessageTypes,
  >(args: SignTypedDataArguments<Version, Types>): Promise<string> {
    const { privateKeyBytes } = this.#node;
    if (!privateKeyBytes) {
      throw new Error('Private key is not available on the node');
    }

    const version =
      args.version && Object.keys(SignTypedDataVersion).includes(args.version)
        ? args.version
        : SignTypedDataVersion.V1;

    return signTypedData({
      privateKey: Buffer.from(privateKeyBytes),
      data: args.data as unknown as Version extends 'V1'
        ? TypedDataV1
        : TypedMessage<Types>,
      version,
    });
  }

  async signEip7702Authorization(
    args: SignEip7702AuthorizationArguments,
  ): Promise<string> {
    const { privateKeyBytes } = this.#node;
    if (!privateKeyBytes) {
      throw new Error('Private key is not available on the node');
    }
    return signEIP7702Authorization({
      privateKey: Buffer.from(privateKeyBytes),
      authorization: args.authorization,
    });
  }

  async getEncryptionPublicKey(): Promise<string> {
    const { privateKeyBytes } = this.#node;
    if (!privateKeyBytes) {
      throw new Error('Private key is not available on the node');
    }
    return getEncryptionPublicKey(remove0x(bytesToHex(privateKeyBytes)));
  }

  async decryptMessage(args: DecryptMessageArguments): Promise<string> {
    const { privateKeyBytes } = this.#node;
    if (!privateKeyBytes) {
      throw new Error('Private key is not available on the node');
    }
    return decrypt({
      privateKey: remove0x(bytesToHex(privateKeyBytes)),
      encryptedData: args.encryptedData,
    });
  }
}
