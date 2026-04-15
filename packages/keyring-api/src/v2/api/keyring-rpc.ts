import { object, exactOptional, UuidStruct } from '@metamask/keyring-utils';
import type { Infer } from '@metamask/superstruct';
import { array, literal, number, string, union } from '@metamask/superstruct';
import { JsonStruct } from '@metamask/utils';

import { KeyringAccountStruct } from '../../api/account';
import { KeyringRequestStruct } from '../../api/request';
import { CreateAccountOptionsStruct } from './create-account';
import {
  ExportAccountOptionsStruct,
  PrivateKeyExportedAccountStruct,
} from './export-account';
import type { Keyring } from './keyring';

/**
 * Keyring interface for keyring methods that can be invoked through
 * RPC calls.
 */
export type KeyringRpc = {
  getAccount: Keyring['getAccount'];
  getAccounts: Keyring['getAccounts'];
  createAccounts: Keyring['createAccounts'];
  deleteAccount: Keyring['deleteAccount'];
  submitRequest: Keyring['submitRequest'];
  exportAccount?: Keyring['exportAccount'];
};

/**
 * Keyring RPC methods used by the API.
 */
export const KeyringRpcMethod = {
  GetAccounts: 'keyring_getAccounts',
  CreateAccounts: 'keyring_createAccounts',
  // Inherited from v1 (but method signatures may differ...):
  // NOTE: We use literals here to avoid circular dependencies.
  GetAccount: 'keyring_getAccount',
  DeleteAccount: 'keyring_deleteAccount',
  ExportAccount: 'keyring_exportAccount',
  SubmitRequest: 'keyring_submitRequest',
} as const;

/**
 * Keyring RPC methods used by the API.
 */
export type KeyringRpcMethod =
  (typeof KeyringRpcMethod)[keyof typeof KeyringRpcMethod];

/**
 * Check if a method is a keyring RPC method (v2).
 *
 * @param method - Method to check.
 * @returns Whether the method is a keyring RPC method (v2).
 */
export function isKeyringRpcMethod(method: string): method is KeyringRpcMethod {
  return Object.values(KeyringRpcMethod).includes(method as KeyringRpcMethod);
}

// ----------------------------------------------------------------------------

const CommonHeader = {
  jsonrpc: literal('2.0'),
  id: union([string(), number(), literal(null)]),
};

// ----------------------------------------------------------------------------
// Get accounts

export const GetAccountsRequestStruct = object({
  ...CommonHeader,
  method: literal(`${KeyringRpcMethod.GetAccounts}`),
});

export type GetAccountsRequest = Infer<typeof GetAccountsRequestStruct>;

export const GetAccountsResponseStruct = array(KeyringAccountStruct);

export type GetAccountsResponse = Infer<typeof GetAccountsResponseStruct>;

// ----------------------------------------------------------------------------
// Get account

export const GetAccountRequestStruct = object({
  ...CommonHeader,
  method: literal(`${KeyringRpcMethod.GetAccount}`),
  params: object({
    id: UuidStruct,
  }),
});

export type GetAccountRequest = Infer<typeof GetAccountRequestStruct>;

export const GetAccountResponseStruct = KeyringAccountStruct;

export type GetAccountResponse = Infer<typeof GetAccountResponseStruct>;

// ----------------------------------------------------------------------------
// Create accounts

export const CreateAccountsRequestStruct = object({
  ...CommonHeader,
  method: literal(`${KeyringRpcMethod.CreateAccounts}`),
  params: CreateAccountOptionsStruct,
});

export type CreateAccountsRequest = Infer<typeof CreateAccountsRequestStruct>;

export const CreateAccountsResponseStruct = array(KeyringAccountStruct);

export type CreateAccountsResponse = Infer<typeof CreateAccountsResponseStruct>;

// ----------------------------------------------------------------------------
// Delete account

export const DeleteAccountRequestStruct = object({
  ...CommonHeader,
  method: literal(`${KeyringRpcMethod.DeleteAccount}`),
  params: object({
    id: UuidStruct,
  }),
});

export type DeleteAccountRequest = Infer<typeof DeleteAccountRequestStruct>;

export const DeleteAccountResponseStruct = literal(null);

export type DeleteAccountResponse = Infer<typeof DeleteAccountResponseStruct>;

// ----------------------------------------------------------------------------
// Export account

export const ExportAccountRequestStruct = object({
  ...CommonHeader,
  method: literal(`${KeyringRpcMethod.ExportAccount}`),
  params: object({
    id: UuidStruct,
    options: exactOptional(ExportAccountOptionsStruct),
  }),
});

export type ExportAccountRequest = Infer<typeof ExportAccountRequestStruct>;

export const ExportAccountResponseStruct = PrivateKeyExportedAccountStruct;

export type ExportAccountResponse = Infer<typeof ExportAccountResponseStruct>;

// ----------------------------------------------------------------------------
// Submit request

export const SubmitRequestRequestStruct = object({
  ...CommonHeader,
  method: literal(`${KeyringRpcMethod.SubmitRequest}`),
  params: KeyringRequestStruct,
});

export type SubmitRequestRequest = Infer<typeof SubmitRequestRequestStruct>;

export const SubmitRequestResponseStruct = JsonStruct;

export type SubmitRequestResponse = Infer<typeof SubmitRequestResponseStruct>;

// ----------------------------------------------------------------------------

/**
 * Keyring RPC requests.
 */
export type KeyringRpcRequests =
  | GetAccountsRequest
  | GetAccountRequest
  | CreateAccountsRequest
  | DeleteAccountRequest
  | ExportAccountRequest
  | SubmitRequestRequest;

/**
 * Extract the proper request type for a given `KeyringRpcMethod`.
 */
export type KeyringRpcRequest<RpcMethod extends KeyringRpcMethod> = Extract<
  KeyringRpcRequests,
  { method: `${RpcMethod}` }
>;
