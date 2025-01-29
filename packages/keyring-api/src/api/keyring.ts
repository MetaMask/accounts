/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
// This rule seems to be triggering a false positive on the `KeyringAccount`.

import type { JsonRpcRequest } from '@metamask/keyring-utils';
import type { Json, CaipAssetType, CaipAssetTypeOrId } from '@metamask/utils';

import type { KeyringAccount } from './account';
import type { ResolvedAccountAddress } from './address';
import type { Balance } from './balance';
import type { KeyringAccountData } from './export';
import type { Paginated, Pagination } from './pagination';
import type { KeyringRequest } from './request';
import type { KeyringResponse } from './response';
import type { Transaction } from './transaction';

/**
 * Keyring interface.
 *
 * Represents the functionality and operations related to managing accounts and
 * handling requests.
 */
export type Keyring = {
  /**
   * List accounts.
   *
   * Retrieves an array of KeyringAccount objects representing the available
   * accounts.
   *
   * @returns A promise that resolves to an array of KeyringAccount objects.
   */
  listAccounts(): Promise<KeyringAccount[]>;

  /**
   * Get an account.
   *
   * Retrieves the KeyringAccount object for the given account ID.
   *
   * @param id - The ID of the account to retrieve.
   * @returns A promise that resolves to the KeyringAccount object if found, or
   * undefined otherwise.
   */
  getAccount(id: string): Promise<KeyringAccount | undefined>;

  /**
   * Create an account.
   *
   * Creates a new account with optional, keyring-defined, account options.
   *
   * @param options - Keyring-defined options for the account (optional).
   * @returns A promise that resolves to the newly created KeyringAccount
   * object without any private information.
   */
  createAccount(options?: Record<string, Json>): Promise<KeyringAccount>;

  /**
   * Lists the assets of an account (fungibles and non-fungibles) represented
   * by their respective CAIP-19:
   * - Asset types for fungibles assets.
   * - Asset IDs for non-fungible ones.
   *
   * @param id - The ID of the account to list the assets for.
   * @returns A promise that resolves to list of assets for that account.
   */
  listAccountAssets?(id: string): Promise<CaipAssetTypeOrId[]>;

  /**
   * Lists the transactions of an account, paginated and ordered by the most
   * recent first.
   *
   * The pagination options are used to limit the number of transactions in the
   * response and to iterate over the results.
   *
   * @param id - The ID of the account to list the transactions for.
   * @param pagination - The pagination options.
   * @returns A promise that resolves to the next page of transactions.
   */
  listAccountTransactions?(
    id: string,
    pagination: Pagination,
  ): Promise<Paginated<Transaction>>;

  /**
   * Retrieve the balances of a given account.
   *
   * This method fetches the balances of specified assets for a given account
   * ID. It returns a promise that resolves to an object where the keys are
   * asset types and the values are balance objects containing the amount and
   * unit.
   *
   * @example
   * ```ts
   * await keyring.getAccountBalances(
   *   '43550276-c7d6-4fac-87c7-00390ad0ce90',
   *   ['bip122:000000000019d6689c085ae165831e93/slip44:0']
   * );
   * // Returns something similar to:
   * // {
   * //   'bip122:000000000019d6689c085ae165831e93/slip44:0': {
   * //     amount: '0.0001',
   * //     unit: 'BTC',
   * //   }
   * // }
   * ```
   * @param id - ID of the account to retrieve the balances for.
   * @param assets - Array of asset types (CAIP-19) to retrieve balances for.
   * @returns A promise that resolves to an object mapping asset types to their
   * respective balances.
   */
  getAccountBalances?(
    id: string,
    assets: CaipAssetType[],
  ): Promise<Record<CaipAssetType, Balance>>;

  /**
   * Resolves the address of an account from a signing request.
   *
   * This is required by the routing system of MetaMask to dispatch
   * incoming non-EVM dapp signing requests.
   *
   * @param scope - Request's scope (CAIP-2).
   * @param request - Signing request object.
   * @returns A Promise that resolves to the account address that must
   * be used to process this signing request, or null if none candidates
   * could be found.
   */
  resolveAccountAddress(
    id: string,
    request: JsonRpcRequest,
  ): Promise<ResolvedAccountAddress | null>;

  /**
   * Filter supported chains for a given account.
   *
   * @param id - ID of the account to be checked.
   * @param chains - List of chains (CAIP-2) to be checked.
   * @returns A Promise that resolves to a filtered list of CAIP-2 IDs
   * representing the supported chains.
   */
  filterAccountChains(id: string, chains: string[]): Promise<string[]>;

  /**
   * Update an account.
   *
   * Updates the account with the given account object. Does nothing if the
   * account does not exist.
   *
   * @param account - The updated account object.
   * @returns A promise that resolves when the account is successfully updated.
   */
  updateAccount(account: KeyringAccount): Promise<void>;

  /**
   * Delete an account from the keyring.
   *
   * Deletes the account with the given ID from the keyring.
   *
   * @param id - The ID of the account to delete.
   * @returns A promise that resolves when the account is successfully deleted.
   */
  deleteAccount(id: string): Promise<void>;

  /**
   * Exports an account's private key.
   *
   * If the keyring cannot export a private key, this function should throw an
   * error.
   *
   * @param id - The ID of the account to export.
   * @returns A promise that resolves to the exported account.
   */
  exportAccount?(id: string): Promise<KeyringAccountData>;

  /**
   * List all submitted requests.
   *
   * Retrieves an array of KeyringRequest objects representing the submitted
   * requests.
   *
   * @returns A promise that resolves to an array of KeyringRequest objects.
   */
  listRequests?(): Promise<KeyringRequest[]>;

  /**
   * Get a request.
   *
   * Retrieves the KeyringRequest object for the given request ID.
   *
   * @param id - The ID of the request to retrieve.
   * @returns A promise that resolves to the KeyringRequest object if found, or
   * undefined otherwise.
   */
  getRequest?(id: string): Promise<KeyringRequest | undefined>;

  /**
   * Submit a request.
   *
   * Submits the given KeyringRequest object.
   *
   * @param request - The KeyringRequest object to submit.
   * @returns A promise that resolves to the request response.
   */
  submitRequest(request: KeyringRequest): Promise<KeyringResponse>;

  /**
   * Approve a request.
   *
   * Approves the request with the given ID and sets the response if provided.
   *
   * @param id - The ID of the request to approve.
   * @param data - The response to the request (optional).
   * @returns A promise that resolves when the request is successfully
   * approved.
   */
  approveRequest?(id: string, data?: Record<string, Json>): Promise<void>;

  /**
   * Reject a request.
   *
   * Rejects the request with the given ID.
   *
   * @param id - The ID of the request to reject.
   * @returns A promise that resolves when the request is successfully
   * rejected.
   */
  rejectRequest?(id: string): Promise<void>;
};
