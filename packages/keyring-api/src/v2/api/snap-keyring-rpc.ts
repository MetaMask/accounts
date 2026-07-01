import { UuidStruct } from '@metamask/keyring-utils';
import type { AccountId } from '@metamask/keyring-utils';
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
import type { CaipAssetType, CaipAssetTypeOrId } from '../../api/caip';
import { BalanceStruct } from '../../api/balance';
import type { Balance } from '../../api/balance';
import { PaginationStruct } from '../../api/pagination';
import type { Pagination } from '../../api/pagination';
import { TransactionsPageStruct } from '../../api/transaction';
import type { TransactionsPage } from '../../api/transaction';
import { KeyringRpcMethod } from './keyring-rpc';
import type { KeyringRpc, KeyringRpcRequests } from './keyring-rpc';

/**
 * All keyring RPC methods available to a Snap - includes the base
 * {@link KeyringRpcMethod} set plus snap-specific extensions.
 */
export const SnapKeyringRpcMethod = {
  ...KeyringRpcMethod,
  SetSelectedAccounts: 'keyring_setSelectedAccounts',
  ListAccountTransactions: 'keyring_listAccountTransactions',
  ListAccountAssets: 'keyring_listAccountAssets',
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
// List account transactions

export const ListAccountTransactionsRequestStruct = object({
  ...CommonHeader,
  method: literal(`${SnapKeyringRpcMethod.ListAccountTransactions}`),
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
  method: literal(`${SnapKeyringRpcMethod.ListAccountAssets}`),
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
  | ListAccountTransactionsRequest
  | ListAccountAssetsRequest
  | GetAccountBalancesRequest;

/**
 * Extract the proper request type for a given `SnapKeyringRpcMethod`.
 */
export type SnapKeyringRpcRequest<RpcMethod extends SnapKeyringRpcMethod> =
  Extract<SnapKeyringRpcRequests, { method: `${RpcMethod}` }>;

// ----------------------------------------------------------------------------

/**
 * Snap keyring RPC interface - extends the base {@link KeyringRpc} with
 * optional snap-specific methods that a Snap may expose.
 */
export type SnapKeyringRpc = KeyringRpc & {
  /**
   * Notify the Snap of the currently selected accounts.
   * Maps to `keyring_setSelectedAccounts`.
   */
  setSelectedAccounts?: (accounts: AccountId[]) => Promise<void>;

  /**
   * List transactions for an account with pagination.
   * Maps to `keyring_listAccountTransactions`.
   */
  listAccountTransactions?: (
    id: AccountId,
    pagination: Pagination,
  ) => Promise<TransactionsPage>;

  /**
   * List the asset types supported by an account.
   * Maps to `keyring_listAccountAssets`.
   */
  listAccountAssets?: (id: AccountId) => Promise<CaipAssetTypeOrId[]>;

  /**
   * Get balances for an account for the requested asset types.
   * Maps to `keyring_getAccountBalances`.
   */
  getAccountBalances?: (
    id: AccountId,
    assets: CaipAssetType[],
  ) => Promise<Record<CaipAssetType, Balance>>;
};
