import {
  ApproveRequestResponseStruct,
  CreateAccountResponseStruct,
  DeleteAccountResponseStruct,
  ExportAccountResponseStruct,
  FilterAccountChainsResponseStruct,
  GetAccountBalancesResponseStruct,
  GetAccountResponseStruct,
  GetRequestResponseStruct,
  ListAccountsResponseStruct,
  ListAccountTransactionsResponseStruct,
  ListAccountAssetsResponseStruct,
  ListRequestsResponseStruct,
  RejectRequestResponseStruct,
  SubmitRequestResponseStruct,
  UpdateAccountResponseStruct,
  KeyringRpcMethod,
  ResolveAccountAddressResponseStruct,
  DiscoverAccountsResponseStruct,
} from '@metamask/keyring-api';
import type {
  Keyring,
  KeyringAccount,
  KeyringRequest,
  KeyringAccountData,
  KeyringResponse,
  Balance,
  TransactionsPage,
  Pagination,
  ResolvedAccountAddress,
  CaipChainId,
  CaipAssetType,
  CaipAssetTypeOrId,
  EntropySourceId,
  DiscoveredAccount,
} from '@metamask/keyring-api';
import type { JsonRpcRequest } from '@metamask/keyring-utils';
import { strictMask } from '@metamask/keyring-utils';
import { assert } from '@metamask/superstruct';
import type { Json } from '@metamask/utils';
import { v4 as uuid } from 'uuid';

export type Sender = {
  send(request: JsonRpcRequest): Promise<Json>;
};

export class KeyringClient implements Keyring {
  readonly #sender: Sender;

  /**
   * Create a new instance of `KeyringClient`.
   *
   * @param sender - The `Sender` instance to use to send requests to the snap.
   */
  constructor(sender: Sender) {
    this.#sender = sender;
  }

  /**
   * Send a request to the snap and return the response.
   *
   * @param partial - A partial JSON-RPC request (method and params).
   * @returns A promise that resolves to the response to the request.
   */
  protected async send(
    partial: Omit<JsonRpcRequest, 'jsonrpc' | 'id'>,
  ): Promise<Json> {
    return this.#sender.send({
      jsonrpc: '2.0',
      id: uuid(),
      ...partial,
    });
  }

  async listAccounts(): Promise<KeyringAccount[]> {
    return strictMask(
      await this.send({
        method: KeyringRpcMethod.ListAccounts,
      }),
      ListAccountsResponseStruct,
    );
  }

  async getAccount(id: string): Promise<KeyringAccount> {
    return strictMask(
      await this.send({
        method: KeyringRpcMethod.GetAccount,
        params: { id },
      }),
      GetAccountResponseStruct,
    );
  }

  async getAccountBalances(
    id: string,
    assets: CaipAssetType[],
  ): Promise<Record<CaipAssetType, Balance>> {
    return strictMask(
      await this.send({
        method: KeyringRpcMethod.GetAccountBalances,
        params: { id, assets },
      }),
      GetAccountBalancesResponseStruct,
    );
  }

  async createAccount(
    options: Record<string, Json> = {},
  ): Promise<KeyringAccount> {
    return strictMask(
      await this.send({
        method: KeyringRpcMethod.CreateAccount,
        params: { options },
      }),
      CreateAccountResponseStruct,
    );
  }

  async discoverAccounts(
    scopes: CaipChainId[],
    entropySource: EntropySourceId,
    groupIndex: number,
  ): Promise<DiscoveredAccount[]> {
    return strictMask(
      await this.send({
        method: KeyringRpcMethod.DiscoverAccounts,
        params: { scopes, entropySource, groupIndex },
      }),
      DiscoverAccountsResponseStruct,
    );
  }

  async listAccountTransactions(
    id: string,
    pagination: Pagination,
  ): Promise<TransactionsPage> {
    return strictMask(
      await this.send({
        method: KeyringRpcMethod.ListAccountTransactions,
        params: { id, pagination },
      }),
      ListAccountTransactionsResponseStruct,
    );
  }

  async listAccountAssets(id: string): Promise<CaipAssetTypeOrId[]> {
    return strictMask(
      await this.send({
        method: KeyringRpcMethod.ListAccountAssets,
        params: { id },
      }),
      ListAccountAssetsResponseStruct,
    );
  }

  async resolveAccountAddress(
    scope: CaipChainId,
    request: JsonRpcRequest,
    // FIXME: eslint is complaning about `ResolvedAccountAddress` being `any`, so disable this for now:
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  ): Promise<ResolvedAccountAddress | null> {
    return strictMask(
      await this.send({
        method: KeyringRpcMethod.ResolveAccountAddress,
        params: { scope, request },
      }),
      ResolveAccountAddressResponseStruct,
    );
  }

  async filterAccountChains(id: string, chains: string[]): Promise<string[]> {
    return strictMask(
      await this.send({
        method: KeyringRpcMethod.FilterAccountChains,
        params: { id, chains },
      }),
      FilterAccountChainsResponseStruct,
    );
  }

  async updateAccount(account: KeyringAccount): Promise<void> {
    assert(
      await this.send({
        method: KeyringRpcMethod.UpdateAccount,
        params: { account },
      }),
      UpdateAccountResponseStruct,
    );
  }

  async deleteAccount(id: string): Promise<void> {
    assert(
      await this.send({
        method: KeyringRpcMethod.DeleteAccount,
        params: { id },
      }),
      DeleteAccountResponseStruct,
    );
  }

  async exportAccount(id: string): Promise<KeyringAccountData> {
    return strictMask(
      await this.send({
        method: KeyringRpcMethod.ExportAccount,
        params: { id },
      }),
      ExportAccountResponseStruct,
    );
  }

  async listRequests(): Promise<KeyringRequest[]> {
    return strictMask(
      await this.send({
        method: KeyringRpcMethod.ListRequests,
      }),
      ListRequestsResponseStruct,
    );
  }

  async getRequest(id: string): Promise<KeyringRequest> {
    return strictMask(
      await this.send({
        method: KeyringRpcMethod.GetRequest,
        params: { id },
      }),
      GetRequestResponseStruct,
    );
  }

  async submitRequest(request: KeyringRequest): Promise<KeyringResponse> {
    return strictMask(
      await this.send({
        method: KeyringRpcMethod.SubmitRequest,
        params: request,
      }),
      SubmitRequestResponseStruct,
    );
  }

  async approveRequest(
    id: string,
    data: Record<string, Json> = {},
  ): Promise<void> {
    assert(
      await this.send({
        method: KeyringRpcMethod.ApproveRequest,
        params: { id, data },
      }),
      ApproveRequestResponseStruct,
    );
  }

  async rejectRequest(id: string): Promise<void> {
    assert(
      await this.send({
        method: KeyringRpcMethod.RejectRequest,
        params: { id },
      }),
      RejectRequestResponseStruct,
    );
  }
}
