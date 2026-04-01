import type { TypedTransaction } from '@ethereumjs/tx';
import type {
  EIP7702Authorization,
  EthEncryptedData,
  MessageTypes,
  SignTypedDataVersion,
  TypedDataV1,
  TypedMessage,
} from '@metamask/eth-sig-util';

import type { Signer } from './signer';

/**
 * CAIP-2 chain ID for EVM networks (e.g. `"eip155:1"` for Ethereum mainnet).
 */
export type Eip155Scope = `eip155:${string}`;

/**
 * Checks if a CAIP-2 chain ID is an EIP-155 scope.
 *
 * @param scope - The chain ID to check.
 * @returns True if the scope starts with `"eip155:"`.
 */
export function isEip155Scope(scope: string): scope is Eip155Scope {
  return scope.startsWith('eip155:');
}

/**
 * Response from {@link Eip155Signer.getAddress}.
 */
export type GetEthAddressResponse = {
  /**
   * The checksummed Ethereum address.
   */
  address: string;
};

/**
 * Arguments for {@link Eip155Signer.signPersonalMessage}.
 */
export type SignPersonalMessageArguments = {
  /**
   * The hex-encoded message to sign (compatible with `personal_sign`).
   */
  msgHex: string;
};

/**
 * Arguments for {@link Eip155Signer.signTypedData}.
 */
export type SignTypedDataArguments<
  Version extends SignTypedDataVersion,
  Types extends MessageTypes,
> = {
  /**
   * The typed data to sign.
   */
  data: TypedDataV1 | TypedMessage<Types>;

  /**
   * The version of the typed data signing scheme to use.
   */
  version?: Version;
};

/**
 * Arguments for {@link Eip155Signer.signEip7702Authorization}.
 */
export type SignEip7702AuthorizationArguments = {
  /**
   * The EIP-7702 authorization tuple to sign.
   */
  authorization: EIP7702Authorization;
};

/**
 * Arguments for {@link Eip155Signer.decryptMessage}.
 */
export type DecryptMessageArguments = {
  /**
   * The encrypted data to decrypt.
   */
  encryptedData: EthEncryptedData;
};

/**
 * EVM (EIP-155) signer interface.
 *
 * Defines the signing operations needed for Ethereum, independent of the entropy source
 * (mnemonic, Ledger, Trezor, etc.).
 *
 * The derivation path and private key are bound at construction time, so each signer
 * instance corresponds to a single account (e.g. `m/44'/60'/0'/0/0`).
 */
export type Eip155Signer = Signer & {
  /**
   * Gets the Ethereum address for this signer.
   *
   * @returns The checksummed Ethereum address.
   */
  getAddress(): Promise<GetEthAddressResponse>;

  /**
   * Signs a transaction.
   *
   * @param tx - The transaction to sign.
   * @returns The signed transaction.
   */
  signTransaction(tx: TypedTransaction): Promise<TypedTransaction>;

  /**
   * Signs a message using the `personal_sign` prefix.
   *
   * @param args - The signing arguments.
   * @returns The signature as a hex string.
   */
  signPersonalMessage(args: SignPersonalMessageArguments): Promise<string>;

  /**
   * Signs EIP-712 typed data.
   *
   * @param args - The signing arguments, including data and version.
   * @returns The signature as a hex string.
   */
  signTypedData<
    Version extends SignTypedDataVersion,
    Types extends MessageTypes,
  >(
    args: SignTypedDataArguments<Version, Types>,
  ): Promise<string>;

  /**
   * Signs an EIP-7702 authorization.
   *
   * @param args - The signing arguments.
   * @returns The signature as a hex string.
   */
  signEip7702Authorization(
    args: SignEip7702AuthorizationArguments,
  ): Promise<string>;

  /**
   * Returns the public key used for NaCl encryption.
   *
   * @returns The base64-encoded public key.
   */
  getEncryptionPublicKey(): Promise<string>;

  /**
   * Decrypts a message encrypted with this account's public key.
   *
   * @param args - The decryption arguments.
   * @returns The decrypted message as a UTF-8 string.
   */
  decryptMessage(args: DecryptMessageArguments): Promise<string>;
};

/**
 * Checks if a signer is an {@link Eip155Signer}.
 *
 * @param signer - The signer to check.
 * @returns True if the signer's scope starts with `"eip155:"`.
 */
export function isEip155Signer(signer: Signer): signer is Eip155Signer {
  return isEip155Scope(signer.scope);
}
