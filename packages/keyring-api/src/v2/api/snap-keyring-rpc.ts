import { UuidStruct } from '@metamask/keyring-utils';
import type { Infer } from '@metamask/superstruct';
import {
  array,
  literal,
  number,
  object,
  record,
  string,
  union,
} from '@metamask/superstruct';

import { CaipAssetTypeOrIdStruct, CaipAssetTypeStruct } from '../../api/caip';
import { BalanceStruct } from '../../api/balance';
import { PaginationStruct } from '../../api/pagination';
import { TransactionsPageStruct } from '../../api/transaction';
import { KeyringRpcMethod } from './keyring-rpc';
import type { KeyringRpc, KeyringRpcRequests } from './keyring-rpc';

/**
 * All keyring RPC methods available to a Snap - includes the base
 * {@link KeyringRpcMethod} set plus snap-specific extensions.
 */
export const SnapKeyringRpcMethod = {
  ...KeyringRpcMethod,
  SetSelectedAccounts: 'keyring_setSelectedAccounts',
  GetAccountTransactions: 'keyring_getAccountTransactions',
  GetAccountAssets: 'keyring_getAccountAssets',
  GetAccountBalances: 'keyring_getAccountBalances',
} as const;

/**
 * All keyring RPC methods available to a Snap.
 */
export type SnapKeyringRpcMethod =
  (typeof SnapKeyringRpcMethod)[keyof typeof SnapKeyringRpcMethod];

/**
 * Check if a method is a snap keyring RPC method (v2).
 *
 * @param method - Method to check.
 * @returns Whether the method is a snap keyring RPC method (v2).
 */
export function isSnapKeyringRpcMethod(
  method: string,
): method is SnapKeyringRpcMethod {
  return Object.values(SnapKeyringRpcMethod).includes(
    method as SnapKeyringRpcMethod,
  );
}

// ----------------------------------------------------------------------------

const CommonHeader = {
  jsonrpc: literal('2.0'),
  id: union([string(), number(), literal(null)]),
};

// ----------------------------------------------------------------------------
// Set selected accounts

export const SetSelectedAccountsRequestStruct = object({
  ...CommonHeader,
  method: literal(`${SnapKeyringRpcMethod.SetSelectedAccounts}`),
  params: object({
    accounts: array(string()),
  }),
});

export type SetSelectedAccountsRequest = Infer<
  typeof SetSelectedAccountsRequestStruct
>;

export const SetSelectedAccountsResponseStruct = literal(null);

export type SetSelectedAccountsResponse = Infer<
  typeof SetSelectedAccountsResponseStruct
>;

// ----------------------------------------------------------------------------
// Get account transactions

export const GetAccountTransactionsRequestStruct = object({
  ...CommonHeader,
  method: literal(`${SnapKeyringRpcMethod.GetAccountTransactions}`),
  params: object({
    id: UuidStruct,
    pagination: PaginationStruct,
  }),
});

export type GetAccountTransactionsRequest = Infer<
  typeof GetAccountTransactionsRequestStruct
>;

export const GetAccountTransactionsResponseStruct = TransactionsPageStruct;

export type GetAccountTransactionsResponse = Infer<
  typeof GetAccountTransactionsResponseStruct
>;

// ----------------------------------------------------------------------------
// Get account assets

export const GetAccountAssetsRequestStruct = object({
  ...CommonHeader,
  method: literal(`${SnapKeyringRpcMethod.GetAccountAssets}`),
  params: object({
    id: UuidStruct,
  }),
});

export type GetAccountAssetsRequest = Infer<
  typeof GetAccountAssetsRequestStruct
>;

export const GetAccountAssetsResponseStruct = array(CaipAssetTypeOrIdStruct);

export type GetAccountAssetsResponse = Infer<
  typeof GetAccountAssetsResponseStruct
>;

// ----------------------------------------------------------------------------
// Get account balances

export const GetAccountBalancesRequestStruct = object({
  ...CommonHeader,
  method: literal(`${SnapKeyringRpcMethod.GetAccountBalances}`),
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

/**
 * All keyring RPC requests available to a Snap - includes base
 * {@link KeyringRpcRequests} plus snap-specific request types.
 */
export type SnapKeyringRpcRequests =
  | KeyringRpcRequests
  | SetSelectedAccountsRequest
  | GetAccountTransactionsRequest
  | GetAccountAssetsRequest
  | GetAccountBalancesRequest;

/**
 * Extract the proper request type for a given `SnapKeyringRpcMethod`.
 */
export type SnapKeyringRpcRequest<RpcMethod extends SnapKeyringRpcMethod> =
  Extract<SnapKeyringRpcRequests, { method: `${RpcMethod}` }>;

// ----------------------------------------------------------------------------

/**
 * @deprecated Use {@link KeyringRpc} instead.
 */
export type SnapKeyringRpc = KeyringRpc;
