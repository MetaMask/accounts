import { TransactionFactory, type TypedTxData } from '@ethereumjs/tx';
import type { MessageTypes, TypedMessage } from '@metamask/eth-sig-util';
import { SignTypedDataVersion } from '@metamask/eth-sig-util';
import type { EthKeyring } from '@metamask/keyring-utils';
import { assert } from '@metamask/superstruct';
import { add0x, type Hex, type Json } from '@metamask/utils';

import type { KeyringAccount } from '../../api/account';
import type { KeyringRequest } from '../../api/request';
import {
  KeyringWrapper,
  type KeyringWrapperOptions,
} from '../../api/v2/wrapper/keyring-wrapper';
import {
  EthDecryptParamsStruct,
  EthGetAppKeyAddressParamsStruct,
  EthGetEncryptionPublicKeyParamsStruct,
  EthPersonalSignParamsStruct,
  EthSignEip7702AuthorizationParamsStruct,
  EthSignParamsStruct,
  EthSignTransactionParamsStruct,
  EthSignTypedDataParamsStruct,
  EthSignTypedDataV1ParamsStruct,
} from '../rpc';
import { EthMethod } from '../types';

/**
 * Additional Ethereum methods supported by Eth keyrings that are not in the standard EthMethod enum.
 * These are primarily encryption and utility methods.
 */
export enum EthKeyringMethod {
  Decrypt = 'eth_decrypt',
  GetEncryptionPublicKey = 'eth_getEncryptionPublicKey',
  GetAppKeyAddress = 'eth_getAppKeyAddress',
  SignEip7702Authorization = 'eth_signEip7702Authorization',
}

/**
 * Options for constructing an EthKeyringWrapper.
 */
export type EthKeyringWrapperOptions<InnerKeyring extends EthKeyring> =
  KeyringWrapperOptions<InnerKeyring>;

/**
 * Abstract wrapper for Ethereum-based keyrings that extends KeyringWrapper, that itself implements KeyringV2.
 *
 * This class provides common functionality for all Ethereum keyrings including:
 * - Request handling for standard Ethereum signing methods
 * - Helper methods for Hex address conversion
 *
 * Subclasses must implement:
 * - `getAccounts()`: Return all managed accounts
 * - `createAccounts()`: Create new accounts based on options
 * - `deleteAccount()`: Remove an account from the keyring
 * - `exportAccount()` (optional): Export private key in specified format
 */
export abstract class EthKeyringWrapper<
  InnerKeyring extends EthKeyring,
  KeyringAccountType extends KeyringAccount = KeyringAccount,
> extends KeyringWrapper<InnerKeyring, KeyringAccountType> {
  /**
   * Helper method to safely cast a KeyringAccount address to Hex type.
   * The KeyringAccount.address is typed as string, but for Ethereum accounts
   * it should always be a valid Hex address.
   *
   * @param address - The address from a KeyringAccount.
   * @returns The address as Hex type.
   */
  protected toHexAddress(address: string): Hex {
    return add0x(address);
  }

  /**
   * Handle an Ethereum signing request.
   *
   * Routes the request to the appropriate legacy keyring method based on
   * the RPC method name.
   *
   * @param request - The keyring request containing method and params.
   * @returns The result of the signing operation.
   */
  async submitRequest(request: KeyringRequest): Promise<Json> {
    const { method, params = [] } = request.request;

    const { address, methods } = await this.getAccount(request.account);
    const hexAddress = this.toHexAddress(address);

    // Validate account can handle the method
    if (!methods.includes(method)) {
      throw new Error(
        `Account ${request.account} cannot handle method: ${method}`,
      );
    }

    switch (method) {
      case `${EthMethod.SignTransaction}`: {
        if (!this.inner.signTransaction) {
          throw new Error('Keyring does not support signTransaction');
        }
        assert(params, EthSignTransactionParamsStruct);
        const [txData] = params;
        // Convert validated transaction data to TypedTransaction
        // TODO: Improve typing to ensure txData matches TypedTxData
        const tx = TransactionFactory.fromTxData(txData as TypedTxData);
        // Note: Bigints are not directly representable in JSON
        return (await this.inner.signTransaction(
          hexAddress,
          tx,
        )) as unknown as Json; // FIXME: Should return type be unknown?
      }

      case `${EthMethod.Sign}`: {
        if (!this.inner.signMessage) {
          throw new Error('Keyring does not support signMessage');
        }
        assert(params, EthSignParamsStruct);
        const [, data] = params;
        return this.inner.signMessage(hexAddress, data);
      }

      case `${EthMethod.PersonalSign}`: {
        if (!this.inner.signPersonalMessage) {
          throw new Error('Keyring does not support signPersonalMessage');
        }
        assert(params, EthPersonalSignParamsStruct);
        const [data] = params;
        return this.inner.signPersonalMessage(hexAddress, data as Hex);
      }

      case `${EthMethod.SignTypedDataV1}`: {
        if (!this.inner.signTypedData) {
          throw new Error('Keyring does not support signTypedData');
        }
        assert(params, EthSignTypedDataV1ParamsStruct);
        const [, data] = params;
        return this.inner.signTypedData(hexAddress, data, {
          version: SignTypedDataVersion.V1,
        });
      }

      case `${EthMethod.SignTypedDataV3}`: {
        if (!this.inner.signTypedData) {
          throw new Error('Keyring does not support signTypedData');
        }
        assert(params, EthSignTypedDataParamsStruct);
        const [, data] = params;
        return this.inner.signTypedData(
          hexAddress,
          // TODO: Improve typing to ensure data matches MessageTypes
          data as TypedMessage<MessageTypes>,
          {
            version: SignTypedDataVersion.V3,
          },
        );
      }

      case `${EthMethod.SignTypedDataV4}`: {
        if (!this.inner.signTypedData) {
          throw new Error('Keyring does not support signTypedData');
        }
        assert(params, EthSignTypedDataParamsStruct);
        const [, data] = params;
        return this.inner.signTypedData(
          hexAddress,
          // TODO: Improve typing to ensure data matches MessageTypes
          data as TypedMessage<MessageTypes>,
          {
            version: SignTypedDataVersion.V4,
          },
        );
      }

      case `${EthKeyringMethod.Decrypt}`: {
        if (!this.inner.decryptMessage) {
          throw new Error('Keyring does not support decryptMessage');
        }
        assert(params, EthDecryptParamsStruct);
        const [encryptedData] = params;
        return this.inner.decryptMessage(hexAddress, encryptedData);
      }

      case `${EthKeyringMethod.GetEncryptionPublicKey}`: {
        if (!this.inner.getEncryptionPublicKey) {
          throw new Error('Keyring does not support getEncryptionPublicKey');
        }
        assert(params, EthGetEncryptionPublicKeyParamsStruct);
        const [, options] = params;
        return this.inner.getEncryptionPublicKey(hexAddress, options);
      }

      case `${EthKeyringMethod.GetAppKeyAddress}`: {
        if (!this.inner.getAppKeyAddress) {
          throw new Error('Keyring does not support getAppKeyAddress');
        }
        assert(params, EthGetAppKeyAddressParamsStruct);
        const [origin] = params;
        return this.inner.getAppKeyAddress(hexAddress, origin);
      }

      case `${EthKeyringMethod.SignEip7702Authorization}`: {
        if (!this.inner.signEip7702Authorization) {
          throw new Error('Keyring does not support signEip7702Authorization');
        }
        assert(params, EthSignEip7702AuthorizationParamsStruct);
        const [authorization] = params;
        return this.inner.signEip7702Authorization(hexAddress, authorization);
      }

      default:
        throw new Error(`Unsupported method for EthKeyringWrapper: ${method}`);
    }
  }
}
