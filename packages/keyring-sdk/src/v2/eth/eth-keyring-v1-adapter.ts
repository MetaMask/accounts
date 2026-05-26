import type { TypedTransaction, TypedTxData } from '@ethereumjs/tx';
import { TransactionFactory } from '@ethereumjs/tx';
import type { SignTypedDataVersion } from '@metamask/eth-sig-util';
import { normalize as ethNormalize } from '@metamask/eth-sig-util';
import { EthMethod, EthScope } from '@metamask/keyring-api';
import type {
  EthBaseTransaction,
  EthBaseUserOperation,
  EthUserOperation,
  EthUserOperationPatch,
  KeyringAccount,
  KeyringExecutionContext,
  KeyringRequest,
} from '@metamask/keyring-api';
import type { Keyring as KeyringV2 } from '@metamask/keyring-api/v2';
import {
  AccountExportType,
  PrivateKeyEncoding,
} from '@metamask/keyring-api/v2';
import type { EthKeyring } from '@metamask/keyring-utils';
import { mask, object, string } from '@metamask/superstruct';
import type { Hex, Json } from '@metamask/utils';
import {
  bigIntToHex,
  KnownCaipNamespace,
  remove0x,
  toCaipChainId,
} from '@metamask/utils';
import { v4 as uuid } from 'uuid';

import type { Eth4337Keyring } from '../../eth';
import { EthKeyringMethod } from './eth-keyring-wrapper';

const DEFAULT_ORIGIN = 'metamask';

type RequestParams = NonNullable<KeyringRequest['request']['params']>;

type ResolvedAccount = {
  account: KeyringAccount;
  normalizedAddress: Hex;
};

function toJson<Type extends Json = Json>(value: unknown): Type {
  return JSON.parse(JSON.stringify(value)) as Type;
}

/**
 * Legacy ETH keyring API surface exposed by {@link EthKeyringV1Adapter}.
 */
export type BaseEthKeyring = Pick<
  EthKeyring,
  | 'exportAccount'
  | 'signMessage'
  | 'signEip7702Authorization'
  | 'signPersonalMessage'
  | 'signTypedData'
  | 'signTransaction'
> & Eth4337Keyring;

/**
 * Error thrown when an account cannot be resolved from the requested address.
 */
export class EthKeyringV1AccountNotFoundError extends Error {
  readonly address: string;

  constructor(address: string) {
    super(`Account not found for address: ${address}`);
    this.name = 'EthKeyringV1AccountNotFoundError';
    this.address = address;
    Object.setPrototypeOf(this, EthKeyringV1AccountNotFoundError.prototype);
  }
}

/**
 * Error thrown when a resolved account does not support a requested method.
 */
export class EthKeyringV1MethodNotSupportedError extends Error {
  readonly address: string;

  readonly method: string;

  constructor(method: string, address: string) {
    super(`Account ${address} does not support method: ${method}`);
    this.name = 'EthKeyringV1MethodNotSupportedError';
    this.address = address;
    this.method = method;
    Object.setPrototypeOf(this, EthKeyringV1MethodNotSupportedError.prototype);
  }
}

/**
 * Adapts a `KeyringV2` instance to the subset of the legacy ETH keyring API
 * used by existing ETH export and signing flows.
 *
 * The adapter is account-agnostic: each method resolves the requested address
 * against the wrapped v2 keyring's accounts, verifies that the resolved account
 * supports the requested method, then forwards the request through the v2
 * `submitRequest` or `exportAccount` APIs.
 */
export class EthKeyringV1Adapter implements BaseEthKeyring {
  readonly #keyring: KeyringV2;

  readonly #origin: string;

  /**
   * Create a new ETH v1 adapter for a v2 keyring.
   *
   * @param options - Adapter options.
   * @param options.keyring - The v2 keyring to adapt.
   * @param options.origin - Origin to use for submitted requests.
   */
  constructor({
    keyring,
    origin = DEFAULT_ORIGIN,
  }: {
    keyring: KeyringV2;
    origin?: string;
  }) {
    this.#keyring = keyring;
    this.#origin = origin;
  }

  /**
   * Gets the private data associated with the given address so
   * that it may be exported.
   *
   * Used by the UI to export an account.
   *
   * @param address - Address of the account to export.
   * @returns A promise that resolves to the exported private key.
   * @throws {@link EthKeyringV1AccountNotFoundError} if no account matches the
   * address.
   */
  async exportAccount(address: Hex): Promise<string> {
    const { account } = await this.#getAccount(address);

    if (!this.#keyring.exportAccount) {
      throw new Error('Keyring does not support exportAccount');
    }

    const exportedAccount = await this.#keyring.exportAccount(account.id, {
      type: AccountExportType.PrivateKey,
      encoding: PrivateKeyEncoding.Hexadecimal,
    });

    return remove0x(exportedAccount.privateKey);
  }

  /**
   * Sign a transaction.
   *
   * @param address - Sender's address.
   * @param transaction - Transaction.
   * @returns A promise that resolves to the signed transaction.
   * @throws {@link EthKeyringV1AccountNotFoundError} if no account matches the
   * address.
   * @throws {@link EthKeyringV1MethodNotSupportedError} if the account does
   * not support transaction signing.
   */
  async signTransaction(
    address: Hex,
    transaction: TypedTransaction,
  ): Promise<TypedTransaction> {
    const { account, normalizedAddress } = await this.#getAccountForMethod(
      address,
      EthMethod.SignTransaction,
    );

    const chainId = transaction.common.chainId();
    const tx = toJson({
      ...transaction.toJSON(),
      from: normalizedAddress,
      type: `0x${transaction.type.toString(16)}`,
      chainId: bigIntToHex(chainId),
    });

    const signedTx = await this.#submitRequest(
      account,
      EthMethod.SignTransaction,
      [tx],
      toCaipChainId(KnownCaipNamespace.Eip155, `${chainId}`),
    );

    // Only take the signature fields from the keyring response. This prevents
    // the keyring from overwriting the transaction payload we submitted.
    const signature = mask(
      signedTx,
      object({
        r: string(),
        s: string(),
        v: string(),
      }),
    );

    return TransactionFactory.fromTxData({
      ...(tx as Record<string, Json>),
      r: signature.r as Hex,
      s: signature.s as Hex,
      v: signature.v as Hex,
    });
  }

  /**
   * Sign a message.
   *
   * @param address - Signer's address.
   * @param data - Data to sign.
   * @returns A promise that resolves to the signature.
   * @throws {@link EthKeyringV1AccountNotFoundError} if no account matches the
   * address.
   * @throws {@link EthKeyringV1MethodNotSupportedError} if the account does
   * not support message signing.
   */
  async signMessage(address: Hex, data: string): Promise<string> {
    const { account, normalizedAddress } = await this.#getAccountForMethod(
      address,
      EthMethod.Sign,
    );

    return await this.#submitRequest<string>(account, EthMethod.Sign, [
      normalizedAddress,
      data,
    ]);
  }

  /**
   * Sign an EIP-7702 authorization.
   *
   * @param address - Signer's address.
   * @param authorization - Authorization tuple to sign.
   * @returns A promise that resolves to the signature.
   * @throws {@link EthKeyringV1AccountNotFoundError} if no account matches the
   * address.
   * @throws {@link EthKeyringV1MethodNotSupportedError} if the account does
   * not support EIP-7702 authorization signing.
   */
  async signEip7702Authorization(
    address: Hex,
    authorization: [chainId: number, contractAddress: Hex, nonce: number],
  ): Promise<string> {
    const { account } = await this.#getAccountForMethod(
      address,
      EthKeyringMethod.SignEip7702Authorization,
    );

    return await this.#submitRequest<string>(
      account,
      EthKeyringMethod.SignEip7702Authorization,
      [authorization],
    );
  }

  /**
   * Sign a personal message.
   *
   * Note: KeyringController says this should return a Buffer but it actually
   * expects a string.
   *
   * @param address - Signer's address.
   * @param message - Data to sign.
   * @returns A promise that resolves to the signature.
   * @throws {@link EthKeyringV1AccountNotFoundError} if no account matches the
   * address.
   * @throws {@link EthKeyringV1MethodNotSupportedError} if the account does
   * not support personal message signing.
   */
  async signPersonalMessage(address: Hex, message: Hex): Promise<string> {
    const { account, normalizedAddress } = await this.#getAccountForMethod(
      address,
      EthMethod.PersonalSign,
    );

    return await this.#submitRequest<string>(account, EthMethod.PersonalSign, [
      message,
      normalizedAddress,
    ]);
  }

  /**
   * Sign a typed data message.
   *
   * @param address - Signer's address.
   * @param typedData - Typed data to sign.
   * @param options - Signing options.
   * @param options.version - The typed data version to use.
   * @returns A promise that resolves to the signature.
   * @throws {@link EthKeyringV1AccountNotFoundError} if no account matches the
   * address.
   * @throws {@link EthKeyringV1MethodNotSupportedError} if the account does
   * not support the requested typed data signing method.
   */
  async signTypedData(
    address: Hex,
    typedData: unknown[] | Record<string, unknown>,
    options?: Record<string, unknown>,
  ): Promise<string> {
    const version = options?.version as SignTypedDataVersion | undefined;
    const method = this.#getSignTypedDataMethod(version);
    const { account, normalizedAddress } = await this.#getAccountForMethod(
      address,
      method,
    );

    return await this.#submitRequest<string>(account, method, [
      normalizedAddress,
      typedData as Json,
    ]);
  }

  /**
   * Convert base transactions to a base UserOperation.
   *
   * @param address - Address of the sender.
   * @param transactions - Base transactions to include in the UserOperation.
   * @param context - Keyring execution context.
   * @returns A pseudo-UserOperation that can be used to construct a real one.
   * @throws {@link EthKeyringV1AccountNotFoundError} if no account matches the
   * address.
   * @throws {@link EthKeyringV1MethodNotSupportedError} if the account does
   * not support UserOperation preparation.
   */
  async prepareUserOperation(
    address: string,
    transactions: EthBaseTransaction[],
    context: KeyringExecutionContext,
  ): Promise<EthBaseUserOperation> {
    const { account } = await this.#getAccountForMethod(
      address,
      EthMethod.PrepareUserOperation,
    );

    return await this.#submitRequest<EthBaseUserOperation>(
      account,
      EthMethod.PrepareUserOperation,
      transactions as Json[],
      this.#getUserOperationScope(context),
    );
  }

  /**
   * Patches properties of a UserOperation. Currently, only the
   * `paymasterAndData` can be patched.
   *
   * @param address - Address of the sender.
   * @param userOperation - UserOperation to patch.
   * @param context - Keyring execution context.
   * @returns A patch to apply to the UserOperation.
   * @throws {@link EthKeyringV1AccountNotFoundError} if no account matches the
   * address.
   * @throws {@link EthKeyringV1MethodNotSupportedError} if the account does
   * not support UserOperation patching.
   */
  async patchUserOperation(
    address: string,
    userOperation: EthUserOperation,
    context: KeyringExecutionContext,
  ): Promise<EthUserOperationPatch> {
    const { account } = await this.#getAccountForMethod(
      address,
      EthMethod.PatchUserOperation,
    );

    return await this.#submitRequest<EthUserOperationPatch>(
      account,
      EthMethod.PatchUserOperation,
      [userOperation as Json],
      this.#getUserOperationScope(context),
    );
  }

  /**
   * Signs a UserOperation.
   *
   * @param address - Address of the sender.
   * @param userOperation - UserOperation to sign.
   * @param context - Keyring execution context.
   * @returns The signature of the UserOperation.
   * @throws {@link EthKeyringV1AccountNotFoundError} if no account matches the
   * address.
   * @throws {@link EthKeyringV1MethodNotSupportedError} if the account does
   * not support UserOperation signing.
   */
  async signUserOperation(
    address: string,
    userOperation: EthUserOperation,
    context: KeyringExecutionContext,
  ): Promise<string> {
    const { account } = await this.#getAccountForMethod(
      address,
      EthMethod.SignUserOperation,
    );

    return await this.#submitRequest<string>(
      account,
      EthMethod.SignUserOperation,
      [userOperation as Json],
      this.#getUserOperationScope(context),
    );
  }

  async #getAccount(address: string): Promise<ResolvedAccount> {
    const normalizedAddress = ethNormalize(address);
    const normalizedAddressLowerCase = normalizedAddress?.toLowerCase();

    if (!normalizedAddress || !normalizedAddressLowerCase) {
      throw new EthKeyringV1AccountNotFoundError(address);
    }

    const accounts = await this.#keyring.getAccounts();
    const account = accounts.find((keyringAccount) => {
      const accountAddress = ethNormalize(keyringAccount.address);
      return accountAddress?.toLowerCase() === normalizedAddressLowerCase;
    });

    if (!account) {
      throw new EthKeyringV1AccountNotFoundError(address);
    }

    return {
      account,
      normalizedAddress: normalizedAddress as Hex,
    };
  }

  async #getAccountForMethod(
    address: string,
    method: string,
  ): Promise<ResolvedAccount> {
    const resolvedAccount = await this.#getAccount(address);

    if (!resolvedAccount.account.methods.includes(method)) {
      throw new EthKeyringV1MethodNotSupportedError(method, address);
    }

    return resolvedAccount;
  }

  #getSignTypedDataMethod(
    version: SignTypedDataVersion | undefined,
  ): EthMethod {
    switch (version) {
      case 'V3':
        return EthMethod.SignTypedDataV3;
      case 'V4':
        return EthMethod.SignTypedDataV4;
      case 'V1':
      default:
        return EthMethod.SignTypedDataV1;
    }
  }

  #getUserOperationScope(context: KeyringExecutionContext): string {
    return toCaipChainId(KnownCaipNamespace.Eip155, context.chainId);
  }

  async #submitRequest<Result extends Json = Json>(
    account: KeyringAccount,
    method: string,
    params: RequestParams,
    scope: string = EthScope.Eoa,
  ): Promise<Result> {
    return (await this.#keyring.submitRequest({
      id: uuid(),
      origin: this.#origin,
      scope,
      account: account.id,
      request: {
        method,
        params,
      },
    })) as Result;
  }
}
