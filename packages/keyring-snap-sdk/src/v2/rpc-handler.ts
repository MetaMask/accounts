import { KeyringRpcMethod as KeyringRpcMethodV1 } from '@metamask/keyring-api';
import {
  KeyringRpcMethod,
  KeyringSnapRpcMethod,
  GetAccountsRequestStruct,
  GetAccountRequestStruct,
  CreateAccountsRequestStruct,
  DeleteAccountRequestStruct,
  ExportAccountRequestStruct,
  SubmitRequestRequestStruct,
  SetSelectedAccountsRequestStruct,
  GetAccountTransactionsRequestStruct,
  GetAccountAssetsRequestStruct,
  GetAccountBalancesRequestStruct,
} from '@metamask/keyring-api/v2';
import type { KeyringSnapRpc } from '@metamask/keyring-api/v2';
import type { JsonRpcRequest } from '@metamask/keyring-utils';
import { JsonRpcRequestStruct } from '@metamask/keyring-utils';
import { assert } from '@metamask/superstruct';
import type { Json } from '@metamask/utils';

import { isSnapError } from '../errors';
import { MethodNotSupportedError } from '../rpc-handler';

// ESLint does not like our custom error classes in this repo for some reason, they do extend Error, so unsure why.
/* eslint-disable @typescript-eslint/only-throw-error */

/**
 * Inner function that dispatches JSON-RPC request to the associated Keyring
 * methods.
 *
 * @param keyring - Keyring instance.
 * @param request - Keyring JSON-RPC request.
 * @returns A promise that resolves to the keyring response.
 */
async function dispatchKeyringRequest(
  keyring: KeyringSnapRpc,
  request: JsonRpcRequest,
): Promise<Json | void> {
  // We first have to make sure that the request is a valid JSON-RPC request so
  // we can check its method name.
  assert(request, JsonRpcRequestStruct);

  switch (request.method) {
    case `${KeyringRpcMethod.GetAccounts}`: {
      assert(request, GetAccountsRequestStruct);
      return keyring.getAccounts();
    }

    case `${KeyringRpcMethod.GetAccount}`: {
      assert(request, GetAccountRequestStruct);
      return keyring.getAccount(request.params.id);
    }

    case `${KeyringRpcMethod.CreateAccounts}`: {
      assert(request, CreateAccountsRequestStruct);
      return keyring.createAccounts(request.params);
    }

    case `${KeyringRpcMethod.DeleteAccount}`: {
      assert(request, DeleteAccountRequestStruct);
      return keyring.deleteAccount(request.params.id);
    }

    case `${KeyringRpcMethod.ExportAccount}`: {
      if (keyring.exportAccount === undefined) {
        throw new MethodNotSupportedError(request.method);
      }
      assert(request, ExportAccountRequestStruct);
      return keyring.exportAccount(request.params.id, request.params.options);
    }

    case `${KeyringRpcMethod.SubmitRequest}`: {
      assert(request, SubmitRequestRequestStruct);
      return keyring.submitRequest(request.params);
    }

    case `${KeyringSnapRpcMethod.SetSelectedAccounts}`: {
      if (keyring.setSelectedAccounts === undefined) {
        throw new MethodNotSupportedError(request.method);
      }
      assert(request, SetSelectedAccountsRequestStruct);
      return keyring.setSelectedAccounts(request.params.accounts);
    }

    case `${KeyringRpcMethodV1.ListAccountTransactions}`: // v1 fallback
    case `${KeyringSnapRpcMethod.GetAccountTransactions}`: {
      if (keyring.getAccountTransactions === undefined) {
        throw new MethodNotSupportedError(request.method);
      }
      assert(request, GetAccountTransactionsRequestStruct);
      return keyring.getAccountTransactions(
        request.params.id,
        request.params.pagination,
      );
    }

    case `${KeyringRpcMethodV1.ListAccountAssets}`: // v1 fallback
    case `${KeyringSnapRpcMethod.GetAccountAssets}`: {
      if (keyring.getAccountAssets === undefined) {
        throw new MethodNotSupportedError(request.method);
      }
      assert(request, GetAccountAssetsRequestStruct);
      return keyring.getAccountAssets(request.params.id);
    }

    case `${KeyringSnapRpcMethod.GetAccountBalances}`: {
      if (keyring.getAccountBalances === undefined) {
        throw new MethodNotSupportedError(request.method);
      }
      assert(request, GetAccountBalancesRequestStruct);
      return keyring.getAccountBalances(
        request.params.id,
        request.params.assets,
      );
    }

    default: {
      throw new MethodNotSupportedError(request.method);
    }
  }
}

/**
 * Handles a keyring (v2) JSON-RPC request.
 *
 * This function is meant to be used as a handler for Keyring (v2) JSON-RPC requests
 * in an Accounts Snap.
 *
 * @param keyring - Keyring instance.
 * @param request - Keyring JSON-RPC request.
 * @returns A promise that resolves to the keyring response.
 * @example
 * ```ts
 * export const onKeyringRequest: OnKeyringRequestHandler = async ({
 *   origin,
 *   request,
 * }) => {
 *   return await handleKeyringRequest(keyring, request);
 * };
 * ```
 */
export async function handleKeyringRequest(
  keyring: KeyringSnapRpc,
  request: JsonRpcRequest,
): Promise<Json | void> {
  try {
    return await dispatchKeyringRequest(keyring, request);
  } catch (error) {
    if (isSnapError(error)) {
      throw error;
    }

    const message =
      error instanceof Error && typeof error.message === 'string'
        ? error.message
        : 'An unknown error occurred while handling the keyring (v2) request';

    throw new Error(message);
  }
}
