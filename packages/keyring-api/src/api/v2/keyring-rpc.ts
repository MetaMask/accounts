import { object, exactOptional, UuidStruct } from '@metamask/keyring-utils';
import type { Infer } from '@metamask/superstruct';
import { array, literal, number, string, union } from '@metamask/superstruct';
import { JsonStruct } from '@metamask/utils';

import { CreateAccountOptionsStruct } from './create-account';
import {
  ExportAccountOptionsStruct,
  PrivateKeyExportedAccountStruct,
} from './export-account';
import type { KeyringV2 } from './keyring';
import { KeyringAccountStruct } from '../account';
import { KeyringRequestStruct } from '../request';

/**
 * Keyring interface for keyring methods that can be invoked through
 * RPC calls.
 */
export type KeyringRpcV2 = {
  getAccounts: KeyringV2['getAccounts'];
  getAccount: KeyringV2['getAccount'];
  createAccounts: KeyringV2['createAccounts'];
  deleteAccount: KeyringV2['deleteAccount'];
  submitRequest: KeyringV2['submitRequest'];
  exportAccount?: KeyringV2['exportAccount'];
};

/**
 * Keyring RPC methods used by the API.
 */
export enum KeyringRpcV2Method {
  GetAccounts = 'keyring_v2_getAccounts',
  GetAccount = 'keyring_v2_getAccount',
  CreateAccounts = 'keyring_v2_createAccounts',
  DeleteAccount = 'keyring_v2_deleteAccount',
  ExportAccount = 'keyring_v2_exportAccount',
  SubmitRequest = 'keyring_v2_submitRequest',
}

/**
 * Check if a method is a keyring RPC method (v2).
 *
 * @param method - Method to check.
 * @returns Whether the method is a keyring RPC method (v2).
 */
export function isKeyringRpcV2Method(
  method: string,
): method is KeyringRpcV2Method {
  return Object.values(KeyringRpcV2Method).includes(
    method as KeyringRpcV2Method,
  );
}

// ----------------------------------------------------------------------------

const CommonHeader = {
  jsonrpc: literal('2.0'),
  id: union([string(), number(), literal(null)]),
};

// ----------------------------------------------------------------------------
// Get accounts

export const GetAccountsV2RequestStruct = object({
  ...CommonHeader,
  method: literal(`${KeyringRpcV2Method.GetAccounts}`),
});

export type GetAccountsV2Request = Infer<typeof GetAccountsV2RequestStruct>;

export const GetAccountsV2ResponseStruct = array(KeyringAccountStruct);

export type GetAccountsV2Response = Infer<typeof GetAccountsV2ResponseStruct>;

// ----------------------------------------------------------------------------
// Get account

export const GetAccountV2RequestStruct = object({
  ...CommonHeader,
  method: literal(`${KeyringRpcV2Method.GetAccount}`),
  params: object({
    id: UuidStruct,
  }),
});

export type GetAccountV2Request = Infer<typeof GetAccountV2RequestStruct>;

export const GetAccountV2ResponseStruct = KeyringAccountStruct;

export type GetAccountV2Response = Infer<typeof GetAccountV2ResponseStruct>;

// ----------------------------------------------------------------------------
// Create accounts

export const CreateAccountsV2RequestStruct = object({
  ...CommonHeader,
  method: literal(`${KeyringRpcV2Method.CreateAccounts}`),
  params: CreateAccountOptionsStruct,
});

export type CreateAccountsV2Request = Infer<
  typeof CreateAccountsV2RequestStruct
>;

export const CreateAccountsV2ResponseStruct = array(KeyringAccountStruct);

export type CreateAccountsV2Response = Infer<
  typeof CreateAccountsV2ResponseStruct
>;

// ----------------------------------------------------------------------------
// Delete account

export const DeleteAccountV2RequestStruct = object({
  ...CommonHeader,
  method: literal(`${KeyringRpcV2Method.DeleteAccount}`),
  params: object({
    id: UuidStruct,
  }),
});

export type DeleteAccountV2Request = Infer<typeof DeleteAccountV2RequestStruct>;

export const DeleteAccountV2ResponseStruct = literal(null);

export type DeleteAccountV2Response = Infer<
  typeof DeleteAccountV2ResponseStruct
>;

// ----------------------------------------------------------------------------
// Export account

export const ExportAccountV2RequestStruct = object({
  ...CommonHeader,
  method: literal(`${KeyringRpcV2Method.ExportAccount}`),
  params: object({
    id: UuidStruct,
    options: exactOptional(ExportAccountOptionsStruct),
  }),
});

export type ExportAccountV2Request = Infer<typeof ExportAccountV2RequestStruct>;

export const ExportAccountV2ResponseStruct = PrivateKeyExportedAccountStruct;

export type ExportAccountV2Response = Infer<
  typeof ExportAccountV2ResponseStruct
>;

// ----------------------------------------------------------------------------
// Submit request

export const SubmitRequestV2RequestStruct = object({
  ...CommonHeader,
  method: literal(`${KeyringRpcV2Method.SubmitRequest}`),
  params: KeyringRequestStruct,
});

export type SubmitRequestV2Request = Infer<typeof SubmitRequestV2RequestStruct>;

export const SubmitRequestV2ResponseStruct = JsonStruct;

export type SubmitRequestV2Response = Infer<
  typeof SubmitRequestV2ResponseStruct
>;

// ----------------------------------------------------------------------------

/**
 * Keyring RPC requests.
 */
export type KeyringRpcV2Requests =
  | GetAccountsV2Request
  | GetAccountV2Request
  | CreateAccountsV2Request
  | DeleteAccountV2Request
  | ExportAccountV2Request
  | SubmitRequestV2Request;

/**
 * Extract the proper request type for a given `KeyringRpcV2Method`.
 */
export type KeyringRpcV2Request<RpcMethod extends KeyringRpcV2Method> = Extract<
  KeyringRpcV2Requests,
  { method: `${RpcMethod}` }
>;
