import {
  object,
  UuidStruct,
  JsonRpcRequestStruct,
} from '@metamask/keyring-utils';
import type { Infer } from '@metamask/superstruct';
import {
  array,
  literal,
  nullable,
  number,
  record,
  string,
  union,
} from '@metamask/superstruct';
import {
  JsonStruct,
  CaipAssetTypeStruct,
  CaipAssetTypeOrIdStruct,
  CaipChainIdStruct,
} from '@metamask/utils';

import {
  BalanceStruct,
  KeyringAccountDataStruct,
  KeyringAccountStruct,
  KeyringRequestStruct,
  KeyringResponseStruct,
  TransactionsPageStruct,
  PaginationStruct,
} from './api';

/**
 * Keyring RPC methods used by the API.
 */
export enum KeyringRpcMethod {
  ListAccounts = 'keyring_listAccounts',
  GetAccount = 'keyring_getAccount',
  CreateAccount = 'keyring_createAccount',
  ListAccountAssets = 'keyring_listAccountAssets',
  ListAccountTransactions = 'keyring_listAccountTransactions',
  GetAccountBalances = 'keyring_getAccountBalances',
  ResolveAccountAddress = 'keyring_resolveAccountAddress',
  FilterAccountChains = 'keyring_filterAccountChains',
  UpdateAccount = 'keyring_updateAccount',
  DeleteAccount = 'keyring_deleteAccount',
  ExportAccount = 'keyring_exportAccount',
  ListRequests = 'keyring_listRequests',
  GetRequest = 'keyring_getRequest',
  SubmitRequest = 'keyring_submitRequest',
  ApproveRequest = 'keyring_approveRequest',
  RejectRequest = 'keyring_rejectRequest',
}

/**
 * Check if a method is a keyring RPC method.
 *
 * @param method - Method to check.
 * @returns Whether the method is a keyring RPC method.
 */
export function isKeyringRpcMethod(method: string): boolean {
  return Object.values(KeyringRpcMethod).includes(method as KeyringRpcMethod);
}

// ----------------------------------------------------------------------------

const CommonHeader = {
  jsonrpc: literal('2.0'),
  id: union([string(), number(), literal(null)]),
};

// ----------------------------------------------------------------------------
// List accounts

export const ListAccountsRequestStruct = object({
  ...CommonHeader,
  method: literal('keyring_listAccounts'),
});

export type ListAccountsRequest = Infer<typeof ListAccountsRequestStruct>;

export const ListAccountsResponseStruct = array(KeyringAccountStruct);

export type ListAccountsResponse = Infer<typeof ListAccountsResponseStruct>;

// ----------------------------------------------------------------------------
// Get account

export const GetAccountRequestStruct = object({
  ...CommonHeader,
  method: literal('keyring_getAccount'),
  params: object({
    id: UuidStruct,
  }),
});

export type GetAccountRequest = Infer<typeof GetAccountRequestStruct>;

export const GetAccountResponseStruct = KeyringAccountStruct;

export type GetAccountResponse = Infer<typeof GetAccountResponseStruct>;

// ----------------------------------------------------------------------------
// Create account

export const CreateAccountRequestStruct = object({
  ...CommonHeader,
  method: literal('keyring_createAccount'),
  params: object({
    options: record(string(), JsonStruct),
  }),
});

export type CreateAccountRequest = Infer<typeof CreateAccountRequestStruct>;

export const CreateAccountResponseStruct = KeyringAccountStruct;

export type CreateAccountResponse = Infer<typeof CreateAccountResponseStruct>;

// ----------------------------------------------------------------------------
// List account transactions

export const ListAccountTransactionsRequestStruct = object({
  ...CommonHeader,
  method: literal('keyring_listAccountTransactions'),
  params: object({
    id: UuidStruct,
    pagination: PaginationStruct,
  }),
});

export type ListAccountTransactionsRequest = Infer<
  typeof ListAccountTransactionsRequestStruct
>;

export const ListAccountTransactionsResponseStruct = TransactionsPageStruct;

export type ListAccountTransactionsResponse = Infer<
  typeof ListAccountTransactionsResponseStruct
>;

// ----------------------------------------------------------------------------
// List account assets

export const ListAccountAssetsRequestStruct = object({
  ...CommonHeader,
  method: literal('keyring_listAccountAssets'),
  params: object({
    id: UuidStruct,
  }),
});

export type ListAccountAssetsRequest = Infer<
  typeof ListAccountAssetsRequestStruct
>;

export const ListAccountAssetsResponseStruct = array(CaipAssetTypeOrIdStruct);

export type ListAccountAssetsResponse = Infer<
  typeof ListAccountAssetsResponseStruct
>;

// ----------------------------------------------------------------------------
// Get account balances

export const GetAccountBalancesRequestStruct = object({
  ...CommonHeader,
  method: literal(`${KeyringRpcMethod.GetAccountBalances}`),
  params: object({
    id: UuidStruct,
    assets: array(CaipAssetTypeStruct),
  }),
});

export type GetAccountBalancesRequest = Infer<
  typeof GetAccountBalancesRequestStruct
>;

export const GetAccountBalancesResponseStruct = record(
  CaipAssetTypeStruct,
  BalanceStruct,
);

export type GetAccountBalancesResponse = Infer<
  typeof GetAccountBalancesResponseStruct
>;

// ----------------------------------------------------------------------------
// Resolve account address

export const ResolveAccountAddressRequestStruct = object({
  ...CommonHeader,
  method: literal('keyring_resolveAccountAddress'),
  params: object({
    scope: CaipChainIdStruct,
    request: JsonRpcRequestStruct,
  }),
});

export type ResolveAccountAddressRequest = Infer<
  typeof ResolveAccountAddressRequestStruct
>;

export const ResolveAccountAddressResponseStruct = nullable(
  object({
    address: string(),
  }),
);

export type ResolveAccountAddressResponse = Infer<
  typeof ResolveAccountAddressResponseStruct
>;

// ----------------------------------------------------------------------------
// Filter account chains

export const FilterAccountChainsStruct = object({
  ...CommonHeader,
  method: literal('keyring_filterAccountChains'),
  params: object({
    id: UuidStruct,
    chains: array(string()),
  }),
});

export type FilterAccountChainsRequest = Infer<
  typeof FilterAccountChainsStruct
>;

export const FilterAccountChainsResponseStruct = array(string());

export type FilterAccountChainsResponse = Infer<
  typeof FilterAccountChainsResponseStruct
>;

// ----------------------------------------------------------------------------
// Update account

export const UpdateAccountRequestStruct = object({
  ...CommonHeader,
  method: literal('keyring_updateAccount'),
  params: object({
    account: KeyringAccountStruct,
  }),
});

export type UpdateAccountRequest = Infer<typeof UpdateAccountRequestStruct>;

export const UpdateAccountResponseStruct = literal(null);

export type UpdateAccountResponse = Infer<typeof UpdateAccountResponseStruct>;

// ----------------------------------------------------------------------------
// Delete account

export const DeleteAccountRequestStruct = object({
  ...CommonHeader,
  method: literal('keyring_deleteAccount'),
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
  method: literal('keyring_exportAccount'),
  params: object({
    id: UuidStruct,
  }),
});

export type ExportAccountRequest = Infer<typeof ExportAccountRequestStruct>;

export const ExportAccountResponseStruct = KeyringAccountDataStruct;

export type ExportAccountResponse = Infer<typeof ExportAccountResponseStruct>;

// ----------------------------------------------------------------------------
// List requests

export const ListRequestsRequestStruct = object({
  ...CommonHeader,
  method: literal('keyring_listRequests'),
});

export type ListRequestsRequest = Infer<typeof ListRequestsRequestStruct>;

export const ListRequestsResponseStruct = array(KeyringRequestStruct);

export type ListRequestsResponse = Infer<typeof ListRequestsResponseStruct>;

// ----------------------------------------------------------------------------
// Get request

export const GetRequestRequestStruct = object({
  ...CommonHeader,
  method: literal('keyring_getRequest'),
  params: object({
    id: UuidStruct,
  }),
});

export type GetRequestRequest = Infer<typeof GetRequestRequestStruct>;

export const GetRequestResponseStruct = KeyringRequestStruct;

export type GetRequestResponse = Infer<typeof GetRequestResponseStruct>;

// ----------------------------------------------------------------------------
// Submit request

export const SubmitRequestRequestStruct = object({
  ...CommonHeader,
  method: literal('keyring_submitRequest'),
  params: KeyringRequestStruct,
});

export type SubmitRequestRequest = Infer<typeof SubmitRequestRequestStruct>;

export const SubmitRequestResponseStruct = KeyringResponseStruct;

export type SubmitRequestResponse = Infer<typeof SubmitRequestResponseStruct>;

// ----------------------------------------------------------------------------
// Approve request

export const ApproveRequestRequestStruct = object({
  ...CommonHeader,
  method: literal('keyring_approveRequest'),
  params: object({
    id: UuidStruct,
    data: record(string(), JsonStruct),
  }),
});

export type ApproveRequestRequest = Infer<typeof ApproveRequestRequestStruct>;

export const ApproveRequestResponseStruct = literal(null);

export type ApproveRequestResponse = Infer<typeof ApproveRequestResponseStruct>;

// ----------------------------------------------------------------------------
// Reject request

export const RejectRequestRequestStruct = object({
  ...CommonHeader,
  method: literal('keyring_rejectRequest'),
  params: object({
    id: UuidStruct,
  }),
});

export type RejectRequestRequest = Infer<typeof RejectRequestRequestStruct>;

export const RejectRequestResponseStruct = literal(null);

export type RejectRequestResponse = Infer<typeof RejectRequestResponseStruct>;
