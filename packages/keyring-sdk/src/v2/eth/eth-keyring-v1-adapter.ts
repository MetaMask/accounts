import type { TypedTransaction } from '@ethereumjs/tx';
import { TransactionFactory } from '@ethereumjs/tx';
import type { SignTypedDataVersion } from '@metamask/eth-sig-util';
import { normalize as ethNormalize } from '@metamask/eth-sig-util';
import {
  EthBaseUserOperationStruct,
  EthBytesStruct,
  EthMethod,
  EthUserOperationPatchStruct,
} from '@metamask/keyring-api';
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
import type { BaseKeyring, EthKeyring } from '@metamask/keyring-utils';
import { strictMask } from '@metamask/keyring-utils';
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
import { KeyringV1Adapter } from '../keyring-v1-adapter';
import { EthKeyringMethod } from './eth-keyring-wrapper';

const METAMASK_ORIGIN = 'metamask';

type RequestParams = NonNullable<KeyringRequest['request']['params']>;

type ResolvedAccount = {
  account: KeyringAccount;
  normalizedAddress: Hex;
};

type TypedDataWithDomain = {
  domain?: {
    chainId?: string | number;
  };
};

/**
 * Convert a value to a valid JSON object.
 *
 * The function chains JSON.stringify and JSON.parse to ensure that the result
 * is a valid JSON object.
 *
 * We assume that the input value is JSON-serializable.
 *
 * However, some transformations can occur like: in objects, undefined values
 * are removed, and in arrays, they are replaced with null.
 *
 * @param value - Value to convert to JSON - Assumed to be JSON-serializable.
 * @returns JSON representation of the value.
 */
function toJson<Type extends Json = Json>(value: unknown): Type {
  return JSON.parse(JSON.stringify(value)) as Type;
}

/**
 * Convert a chain ID (number or hex) to an EIP-155 CAIP chain ID string for keyring request scoping.
 *
 * @param chainId - The chain ID to convert.
 * @returns The EIP-155 CAIP chain ID string.
 */
function toEip155Scope(chainId: string | number | bigint): string {
  return toCaipChainId(KnownCaipNamespace.Eip155, BigInt(chainId).toString());
}

/**
 * Legacy ETH keyring API surface exposed by {@link EthKeyringV1Adapter}.
 */
export type BaseEthKeyring = BaseKeyring &
  // Only pick account-related methods (signing and exporting).
  Pick<
    EthKeyring,
    | 'exportAccount'
    | 'signMessage'
    | 'signEip7702Authorization'
    | 'signPersonalMessage'
    | 'signTypedData'
    | 'signTransaction'
  > &
  Eth4337Keyring;

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
export class EthKeyringV1Adapter<InnerKeyring extends KeyringV2 = KeyringV2>
  extends KeyringV1Adapter<InnerKeyring>
  implements BaseEthKeyring
{
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

    if (!this.inner.exportAccount) {
      throw new Error('Keyring does not support exportAccount');
    }

    const exportedAccount = await this.inner.exportAccount(account.id, {
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
      toJson<Json[]>([tx]),
      toEip155Scope(chainId),
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

    return strictMask(
      await this.#submitRequest(
        account,
        EthMethod.Sign,
        toJson<Json[]>([normalizedAddress, data]),
        '',
      ),
      EthBytesStruct,
    );
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

    const [chainId] = authorization;

    return strictMask(
      await this.#submitRequest(
        account,
        EthKeyringMethod.SignEip7702Authorization,
        [authorization],
        toEip155Scope(chainId),
      ),
      EthBytesStruct,
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

    return strictMask(
      await this.#submitRequest(
        account,
        EthMethod.PersonalSign,
        toJson<Json[]>([message, normalizedAddress]),
        '',
      ),
      EthBytesStruct,
    );
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

    // Extract chain ID as if it was a typed message (as defined by EIP-712), if
    // input is not a typed message, then chain ID will be undefined!
    const chainId = (typedData as TypedDataWithDomain).domain?.chainId;

    return strictMask(
      await this.#submitRequest(
        account,
        method,
        toJson<Json[]>([normalizedAddress, typedData]),
        chainId === undefined ? '' : toEip155Scope(chainId),
      ),
      EthBytesStruct,
    );
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

    return strictMask(
      await this.#submitRequest(
        account,
        EthMethod.PrepareUserOperation,
        // NOTE: This is inconsistent with the other methods. We are not wrapping `transactions` in an array.
        // Which means the receiver of the `submitRequest` call would see individual transactions spread as
        // separate params rather than a single transactions array as the first param, which doesn't match
        // the method signature of `prepareUserOperation(address, transactions, context)`.
        // This was already implemented like this in the legacy Snap keyring, so we keep the same logic here
        // too!
        toJson<Json[]>(transactions),
        toEip155Scope(context.chainId),
      ),
      EthBaseUserOperationStruct,
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

    return strictMask(
      await this.#submitRequest(
        account,
        EthMethod.PatchUserOperation,
        toJson<Json[]>([userOperation]),
        toEip155Scope(context.chainId),
      ),
      EthUserOperationPatchStruct,
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

    return strictMask(
      await this.#submitRequest(
        account,
        EthMethod.SignUserOperation,
        toJson<Json[]>([userOperation]),
        toEip155Scope(context.chainId),
      ),
      EthBytesStruct,
    );
  }

  async #getAccount(address: string): Promise<ResolvedAccount> {
    const normalizedAddress = ethNormalize(address);
    const normalizedAddressLowerCase = normalizedAddress?.toLowerCase();

    if (!normalizedAddress || !normalizedAddressLowerCase) {
      throw new EthKeyringV1AccountNotFoundError(address);
    }

    const accounts = await this.inner.getAccounts();
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
        // Use 'V1' by default to match other keyring implementations. V1 will be
        // used if the version is not specified or not supported.
        return EthMethod.SignTypedDataV1;
    }
  }

  async #submitRequest<Result extends Json = Json>(
    account: KeyringAccount,
    method: string,
    params: RequestParams,
    scope: string,
  ): Promise<Result> {
    return (await this.inner.submitRequest({
      id: uuid(),
      origin: METAMASK_ORIGIN,
      scope,
      account: account.id,
      request: {
        method,
        params,
      },
    })) as Result;
  }
}
