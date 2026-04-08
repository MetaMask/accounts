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
   * Creates a new MnemonicEip155Signer.
   *
   * @param scope - The CAIP-2 chain ID (e.g. `"eip155:1"` for Ethereum mainnet).
   * @param node - The address-level SLIP10 node (e.g. at m/44'/60'/0'/0/0).
   */
  constructor(scope: Eip155Scope, node: SLIP10NodeInterface) {
    this.scope = scope;
    this.#node = node;
  }

  #requirePrivateKey(): Uint8Array {
    const { privateKeyBytes } = this.#node;
    if (!privateKeyBytes) {
      throw new Error('Private key is not available on the node');
    }
    return privateKeyBytes;
  }

  async getAddress(): Promise<GetEthAddressResponse> {
    const address = add0x(
      bytesToHex(
        publicToAddress(this.#node.publicKeyBytes, true),
      ).toLowerCase(),
    );
    return { address };
  }

  async signTransaction(tx: TypedTransaction): Promise<TypedTransaction> {
    return tx.sign(this.#requirePrivateKey());
  }

  async signPersonalMessage(
    args: SignPersonalMessageArguments,
  ): Promise<string> {
    return personalSign({
      privateKey: Buffer.from(this.#requirePrivateKey()),
      data: args.msgHex,
    });
  }

  async signTypedData<
    Version extends SignTypedDataVersion,
    Types extends MessageTypes,
  >(args: SignTypedDataArguments<Version, Types>): Promise<string> {
    const version =
      args.version && Object.values(SignTypedDataVersion).includes(args.version)
        ? args.version
        : SignTypedDataVersion.V1;

    return signTypedData({
      privateKey: Buffer.from(this.#requirePrivateKey()),
      data: args.data as unknown as Version extends 'V1'
        ? TypedDataV1
        : TypedMessage<Types>,
      version,
    });
  }

  async signEip7702Authorization(
    args: SignEip7702AuthorizationArguments,
  ): Promise<string> {
    return signEIP7702Authorization({
      privateKey: Buffer.from(this.#requirePrivateKey()),
      authorization: args.authorization,
    });
  }

  async getEncryptionPublicKey(): Promise<string> {
    return getEncryptionPublicKey(
      remove0x(bytesToHex(this.#requirePrivateKey())),
    );
  }

  async decryptMessage(args: DecryptMessageArguments): Promise<string> {
    return decrypt({
      privateKey: remove0x(bytesToHex(this.#requirePrivateKey())),
      encryptedData: args.encryptedData,
    });
  }
}
