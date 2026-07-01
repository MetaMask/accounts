import type { KeyringAccount, KeyringRequest } from '@metamask/keyring-api';
import {
  CreateAccountsResponseStruct,
  DeleteAccountResponseStruct,
  GetAccountResponseStruct,
  GetAccountsResponseStruct,
  SubmitRequestResponseStruct,
  KeyringRpcMethod,
  ExportAccountResponseStruct,
  SnapKeyringRpcMethod,
  SetSelectedAccountsResponseStruct,
  GetAccountTransactionsResponseStruct,
  GetAccountAssetsResponseStruct,
  GetAccountBalancesResponseStruct,
} from '@metamask/keyring-api/v2';
import type {
  CreateAccountOptions,
  ExportAccountOptions,
  ExportedAccount,
  SnapKeyringRpc,
  KeyringRpcRequest,
} from '@metamask/keyring-api/v2';
import type {
  Balance,
  CaipAssetType,
  CaipAssetTypeOrId,
  Pagination,
  TransactionsPage,
} from '@metamask/keyring-api';
import type { AccountId } from '@metamask/keyring-utils';
import { strictMask } from '@metamask/keyring-utils';
import { assert } from '@metamask/superstruct';
import type { Json } from '@metamask/utils';
import { v4 as uuid } from 'uuid';

import type { Sender } from '../KeyringClient';

export class SnapKeyringClient implements SnapKeyringRpc {
  readonly #sender: Sender;

  /**
   * Create a new instance of `SnapKeyringClient`.
   *
   * @param sender - The `Sender` instance to use to send requests to the snap.
   */
  constructor(sender: Sender) {
    this.#sender = sender;
  }

  /**
   * Send a request to the Snap and return the response.
   *
   * @param request - A partial JSON-RPC request (method and params).
   * @returns A promise that resolves to the response to the request.
   */
  protected async send<RequestMethod extends KeyringRpcMethod>(
    request: KeyringRpcRequest<RequestMethod>,
  ): Promise<Json> {
    return this.#sender.send({
      ...request,
    });
  }

  /**
   * Returns all accounts.
   *
   * @returns A promise that resolves to the list of accounts.
   */
  async getAccounts(): Promise<KeyringAccount[]> {
    return strictMask(
      await this.send({
        jsonrpc: '2.0',
        id: uuid(),
        method: KeyringRpcMethod.GetAccounts,
      }),
      GetAccountsResponseStruct,
    );
  }

  /**
   * Returns the account with the specified ID.
   *
   * @param id - ID of the account to retrieve.
   * @returns A promise that resolves to the account with the given ID.
   */
  async getAccount(id: string): Promise<KeyringAccount> {
    return strictMask(
      await this.send({
        jsonrpc: '2.0',
        id: uuid(),
        method: KeyringRpcMethod.GetAccount,
        params: { id },
      }),
      GetAccountResponseStruct,
    );
  }

  /**
   * Creates one or more new accounts according to the provided options.
   *
   * @param params - Options describing how to create the account(s).
   * @returns A promise that resolves to the list of created accounts.
   */
  async createAccounts(
    params: CreateAccountOptions,
  ): Promise<KeyringAccount[]> {
    return strictMask(
      await this.send({
        jsonrpc: '2.0',
        id: uuid(),
        method: KeyringRpcMethod.CreateAccounts,
        params,
      }),
      CreateAccountsResponseStruct,
    );
  }

  /**
   * Exports the private key or secret material for the specified account.
   *
   * @param id - ID of the account to export.
   * @param options - Optional export options.
   * @returns A promise that resolves to the exported account data.
   */
  async exportAccount(
    id: AccountId,
    options?: ExportAccountOptions,
  ): Promise<ExportedAccount> {
    return strictMask(
      await this.send({
        jsonrpc: '2.0',
        id: uuid(),
        method: KeyringRpcMethod.ExportAccount,
        params: { id, ...(options && { options }) },
      }),
      ExportAccountResponseStruct,
    );
  }

  /**
   * Deletes the account with the specified ID.
   *
   * @param id - ID of the account to delete.
   * @returns A promise that resolves when the account has been deleted.
   */
  async deleteAccount(id: AccountId): Promise<void> {
    assert(
      await this.send({
        jsonrpc: '2.0',
        id: uuid(),
        method: KeyringRpcMethod.DeleteAccount,
        params: { id },
      }),
      DeleteAccountResponseStruct,
    );
  }

  /**
   * Submits a request to the keyring.
   *
   * @param request - The `KeyringRequest` object to submit.
   * @returns A promise that resolves to the response for the request.
   */
  async submitRequest(request: KeyringRequest): Promise<Json> {
    return strictMask(
      await this.send({
        jsonrpc: '2.0',
        id: uuid(),
        method: KeyringRpcMethod.SubmitRequest,
        params: request,
      }),
      SubmitRequestResponseStruct,
    );
  }

  /**
   * Notifies the Snap of the currently selected accounts.
   *
   * @param accounts - List of selected account IDs.
   * @returns A promise that resolves when the notification has been sent.
   */
  async setSelectedAccounts(accounts: AccountId[]): Promise<void> {
    assert(
      await this.#sender.send({
        jsonrpc: '2.0',
        id: uuid(),
        method: SnapKeyringRpcMethod.SetSelectedAccounts,
        params: { accounts },
      }),
      SetSelectedAccountsResponseStruct,
    );
  }

  /**
   * Gets transactions for an account with pagination.
   *
   * @param id - ID of the account.
   * @param pagination - Pagination options.
   * @returns A promise that resolves to a page of transactions.
   */
  async getAccountTransactions(
    id: AccountId,
    pagination: Pagination,
  ): Promise<TransactionsPage> {
    return strictMask(
      await this.#sender.send({
        jsonrpc: '2.0',
        id: uuid(),
        method: SnapKeyringRpcMethod.GetAccountTransactions,
        params: { id, pagination },
      }),
      GetAccountTransactionsResponseStruct,
    );
  }

  /**
   * Gets the asset types supported by an account.
   *
   * @param id - ID of the account.
   * @returns A promise that resolves to the list of CAIP asset type IDs.
   */
  async getAccountAssets(id: AccountId): Promise<CaipAssetTypeOrId[]> {
    return strictMask(
      await this.#sender.send({
        jsonrpc: '2.0',
        id: uuid(),
        method: SnapKeyringRpcMethod.GetAccountAssets,
        params: { id },
      }),
      GetAccountAssetsResponseStruct,
    );
  }

  /**
   * Gets balances for an account for the requested asset types.
   *
   * @param id - ID of the account.
   * @param assets - List of CAIP asset types to fetch balances for.
   * @returns A promise that resolves to a map of asset type to balance.
   */
  async getAccountBalances(
    id: AccountId,
    assets: CaipAssetType[],
  ): Promise<Record<CaipAssetType, Balance>> {
    return strictMask(
      await this.#sender.send({
        jsonrpc: '2.0',
        id: uuid(),
        method: SnapKeyringRpcMethod.GetAccountBalances,
        params: { id, assets },
      }),
      GetAccountBalancesResponseStruct,
    );
  }
}
