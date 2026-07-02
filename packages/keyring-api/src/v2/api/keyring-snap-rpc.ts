import type { AccountId } from '@metamask/keyring-utils';
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

import { BalanceStruct } from '../../api/balance';
import type { Balance } from '../../api/balance';
import { CaipAssetTypeOrIdStruct, CaipAssetTypeStruct } from '../../api/caip';
import type { CaipAssetType, CaipAssetTypeOrId } from '../../api/caip';
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
export const KeyringSnapRpcMethod = {
  ...KeyringRpcMethod,
  SetSelectedAccounts: 'keyring_setSelectedAccounts',
  GetAccountTransactions: 'keyring_getAccountTransactions',
  GetAccountAssets: 'keyring_getAccountAssets',
  GetAccountBalances: 'keyring_getAccountBalances',
} as const;

/**
 * All keyring RPC methods available to a Snap.
 */
export type KeyringSnapRpcMethod =
  (typeof KeyringSnapRpcMethod)[keyof typeof KeyringSnapRpcMethod];

/**
 * Check if a method is a Snap keyring RPC method (v2).
 *
 * @param method - Method to check.
 * @returns Whether the method is a Snap keyring RPC method (v2).
 */
export function isKeyringSnapRpcMethod(
  method: string,
): method is KeyringSnapRpcMethod {
  return Object.values(KeyringSnapRpcMethod).includes(
    method as KeyringSnapRpcMethod,
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
  method: literal(`${KeyringSnapRpcMethod.SetSelectedAccounts}`),
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
  method: literal(`${KeyringSnapRpcMethod.GetAccountTransactions}`),
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
  method: literal(`${KeyringSnapRpcMethod.GetAccountAssets}`),
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
  method: literal(`${KeyringSnapRpcMethod.GetAccountBalances}`),
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
export type KeyringSnapRpcRequests =
  | KeyringRpcRequests
  | SetSelectedAccountsRequest
  | GetAccountTransactionsRequest
  | GetAccountAssetsRequest
  | GetAccountBalancesRequest;

/**
 * Extract the proper request type for a given {@link KeyringSnapRpcMethod}.
 */
export type KeyringSnapRpcRequest<RpcMethod extends KeyringSnapRpcMethod> =
  Extract<KeyringSnapRpcRequests, { method: `${RpcMethod}` }>;

// ----------------------------------------------------------------------------

/**
 * Snap keyring RPC interface - extends the base {@link KeyringRpc} with
 * optional snap-specific methods that a Snap may expose.
 */
export type KeyringSnapRpc = KeyringRpc & {
  /**
   * Notify the Snap of the currently selected accounts.
   * Maps to `keyring_setSelectedAccounts`.
   */
  setSelectedAccounts?: (accounts: AccountId[]) => Promise<void>;

  /**
   * Get transactions for an account with pagination.
   * Maps to `keyring_getAccountTransactions`.
   */
  getAccountTransactions?: (
    id: AccountId,
    pagination: Pagination,
  ) => Promise<TransactionsPage>;

  /**
   * Get the asset types supported by an account.
   * Maps to `keyring_getAccountAssets`.
   */
  getAccountAssets?: (id: AccountId) => Promise<CaipAssetTypeOrId[]>;

  /**
   * Get balances for an account for the requested asset types.
   * Maps to `keyring_getAccountBalances`.
   */
  getAccountBalances?: (
    id: AccountId,
    assets: CaipAssetType[],
  ) => Promise<Record<CaipAssetType, Balance>>;
};
