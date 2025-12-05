import type { KeyringV2 } from '@metamask/keyring-api';
import {
  KeyringRpcV2Method,
  GetAccountsV2RequestStruct,
  GetAccountV2RequestStruct,
  CreateAccountsV2RequestStruct,
  DeleteAccountV2RequestStruct,
  ExportAccountV2RequestStruct,
  SubmitRequestV2RequestStruct,
} from '@metamask/keyring-api';
import type { JsonRpcRequest } from '@metamask/keyring-utils';
import { JsonRpcRequestStruct } from '@metamask/keyring-utils';
import { assert } from '@metamask/superstruct';
import type { Json } from '@metamask/utils';

/**
 * Error thrown when a keyring JSON-RPC method is not supported.
 */
export class MethodNotSupportedError extends Error {
  constructor(method: string) {
    super(`Method not supported: ${method}`);
  }
}

/**
 * Inner function that dispatches JSON-RPC request to the associated Keyring
 * methods.
 *
 * @param keyring - Keyring instance.
 * @param request - Keyring JSON-RPC request.
 * @returns A promise that resolves to the keyring response.
 */
async function dispatchKeyringRequestV2(
  keyring: KeyringV2,
  request: JsonRpcRequest,
): Promise<Json | void> {
  // We first have to make sure that the request is a valid JSON-RPC request so
  // we can check its method name.
  assert(request, JsonRpcRequestStruct);

  switch (request.method) {
    case `${KeyringRpcV2Method.GetAccounts}`: {
      assert(request, GetAccountsV2RequestStruct);
      return keyring.getAccounts();
    }

    case `${KeyringRpcV2Method.GetAccount}`: {
      assert(request, GetAccountV2RequestStruct);
      return keyring.getAccount(request.params.id);
    }

    case `${KeyringRpcV2Method.CreateAccounts}`: {
      assert(request, CreateAccountsV2RequestStruct);
      return keyring.createAccounts(request.params);
    }

    case `${KeyringRpcV2Method.DeleteAccount}`: {
      assert(request, DeleteAccountV2RequestStruct);
      return keyring.deleteAccount(request.params.id);
    }

    case `${KeyringRpcV2Method.ExportAccount}`: {
      if (keyring.exportAccount === undefined) {
        throw new MethodNotSupportedError(request.method);
      }
      assert(request, ExportAccountV2RequestStruct);
      return keyring.exportAccount(request.params.id);
    }

    case `${KeyringRpcV2Method.SubmitRequest}`: {
      assert(request, SubmitRequestV2RequestStruct);
      return keyring.submitRequest(request.params);
    }

    default: {
      throw new MethodNotSupportedError(request.method);
    }
  }
}

/**
 * Handles a keyring JSON-RPC request.
 *
 * This function is meant to be used as a handler for Keyring JSON-RPC requests
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
export async function handleKeyringRequestV2(
  keyring: KeyringV2,
  request: JsonRpcRequest,
): Promise<Json | void> {
  try {
    return await dispatchKeyringRequestV2(keyring, request);
  } catch (error) {
    const message =
      error instanceof Error && typeof error.message === 'string'
        ? error.message
        : 'An unknown error occurred while handling the keyring request (v2)';

    throw new Error(message);
  }
}
