import type { AccountId, JsonRpcRequest } from '@metamask/keyring-utils';
import { UuidStruct, JsonRpcRequestStruct } from '@metamask/keyring-utils';
import type { Infer } from '@metamask/superstruct';
import {
  array,
  exactOptional,
  literal,
  nullable,
  number,
  object,
  record,
  string,
  union,
} from '@metamask/superstruct';
import { JsonStruct } from '@metamask/utils';

import { ResolvedAccountAddressStruct } from '../../api/address';
import type { ResolvedAccountAddress } from '../../api/address';
import { BalanceStruct } from '../../api/balance';
import type { Balance } from '../../api/balance';
import {
  CaipAssetTypeOrIdStruct,
  CaipAssetTypeStruct,
  CaipChainIdStruct,
} from '../../api/caip';
import type {
  CaipAssetType,
  CaipAssetTypeOrId,
  CaipChainId,
} from '../../api/caip';
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
  GetAccountsTransactions: 'keyring_getAccountsTransactions',
  GetAccountAssets: 'keyring_getAccountAssets',
  GetAccountBalances: 'keyring_getAccountBalances',
  ResolveAccountAddress: 'keyring_resolveAccountAddress',
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
// Account transactions pagination

/**
 * Struct for the account and pagination pair used by account transaction
 * requests.
 */
export const AccountTransactionsPaginationStruct = object({
  /**
   * ID of the account to retrieve transactions for.
   */
  id: UuidStruct,

  /**
   * Pagination options for this account.
   */
  pagination: PaginationStruct,
});

/**
 * Account and pagination pair used by account transaction requests.
 */
export type AccountTransactionsPagination = Infer<
  typeof AccountTransactionsPaginationStruct
>;

// ----------------------------------------------------------------------------
// Get account transactions

export const GetAccountTransactionsRequestStruct = object({
  ...CommonHeader,
  method: literal(`${KeyringSnapRpcMethod.GetAccountTransactions}`),
  params: AccountTransactionsPaginationStruct,
});

export type GetAccountTransactionsRequest = Infer<
  typeof GetAccountTransactionsRequestStruct
>;

export const GetAccountTransactionsResponseStruct = TransactionsPageStruct;

export type GetAccountTransactionsResponse = Infer<
  typeof GetAccountTransactionsResponseStruct
>;

// ----------------------------------------------------------------------------
// Get accounts transactions

/**
 * Struct for an account-specific transaction retrieval error.
 */
export const AccountTransactionsErrorStruct = object({
  /**
   * Stable error code.
   */
  code: string(),

  /**
   * Human-readable error message.
   */
  message: string(),

  /**
   * Optional structured error data.
   */
  data: exactOptional(JsonStruct),
});

/**
 * Account-specific transaction retrieval error.
 */
export type AccountTransactionsError = Infer<
  typeof AccountTransactionsErrorStruct
>;

/**
 * Struct for an account-specific transaction retrieval result.
 */
export const AccountTransactionsResultStruct = union([
  object({
    /**
     * ID of the account the transactions belong to.
     */
    id: UuidStruct,

    /**
     * Whether transactions were retrieved successfully for this account.
     */
    success: literal(true),

    /**
     * Transactions retrieved for this account.
     */
    transactions: TransactionsPageStruct,
  }),
  object({
    /**
     * ID of the account the error belongs to.
     */
    id: UuidStruct,

    /**
     * Whether transactions were retrieved successfully for this account.
     */
    success: literal(false),

    /**
     * Error returned for this account.
     */
    error: AccountTransactionsErrorStruct,
  }),
]);

/**
 * Account-specific transaction retrieval result.
 */
export type AccountTransactionsResult = Infer<
  typeof AccountTransactionsResultStruct
>;

export const GetAccountsTransactionsRequestStruct = object({
  ...CommonHeader,
  method: literal(`${KeyringSnapRpcMethod.GetAccountsTransactions}`),
  params: object({
    accounts: array(AccountTransactionsPaginationStruct),
  }),
});

export type GetAccountsTransactionsRequest = Infer<
  typeof GetAccountsTransactionsRequestStruct
>;

export const GetAccountsTransactionsResponseStruct = array(
  AccountTransactionsResultStruct,
);

export type GetAccountsTransactionsResponse = Infer<
  typeof GetAccountsTransactionsResponseStruct
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
// Resolve account address

export const ResolveAccountAddressRequestStruct = object({
  ...CommonHeader,
  method: literal(`${KeyringSnapRpcMethod.ResolveAccountAddress}`),
  params: object({
    scope: CaipChainIdStruct,
    request: JsonRpcRequestStruct,
  }),
});

export type ResolveAccountAddressRequest = Infer<
  typeof ResolveAccountAddressRequestStruct
>;

export const ResolveAccountAddressResponseStruct = nullable(
  ResolvedAccountAddressStruct,
);

export type ResolveAccountAddressResponse = Infer<
  typeof ResolveAccountAddressResponseStruct
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
  | GetAccountsTransactionsRequest
  | GetAccountAssetsRequest
  | GetAccountBalancesRequest
  | ResolveAccountAddressRequest;

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
   * Get transactions for multiple accounts with account-specific pagination.
   * Maps to `keyring_getAccountsTransactions`.
   */
  getAccountsTransactions?: (
    accounts: AccountTransactionsPagination[],
  ) => Promise<AccountTransactionsResult[]>;

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

  /**
   * Resolve the account address to use for routing a signing request.
   * Maps to `keyring_resolveAccountAddress`.
   */
  resolveAccountAddress?: (
    scope: CaipChainId,
    request: JsonRpcRequest,
  ) => Promise<ResolvedAccountAddress | null>;
};
