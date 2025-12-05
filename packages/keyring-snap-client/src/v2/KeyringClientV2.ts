import {
  CreateAccountsV2ResponseStruct,
  DeleteAccountV2ResponseStruct,
  GetAccountV2ResponseStruct,
  GetAccountsV2ResponseStruct,
  SubmitRequestV2ResponseStruct,
  KeyringRpcV2Method,
  ExportAccountV2ResponseStruct,
} from '@metamask/keyring-api';
import type {
  CreateAccountOptions,
  ExportAccountOptions,
  ExportedAccount,
  KeyringAccount,
  KeyringRequest,
  KeyringRpcV2,
  KeyringRpcV2Request,
} from '@metamask/keyring-api';
import type { AccountId } from '@metamask/keyring-utils';
import { strictMask } from '@metamask/keyring-utils';
import { assert } from '@metamask/superstruct';
import type { Json } from '@metamask/utils';
import { v4 as uuid } from 'uuid';

import type { Sender } from '../KeyringClient';

export class KeyringClientV2 implements KeyringRpcV2 {
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
   * Send a request to the Snap and return the response.
   *
   * @param request - A partial JSON-RPC request (method and params).
   * @returns A promise that resolves to the response to the request.
   */
  protected async send<RequestMethod extends KeyringRpcV2Method>(
    request: KeyringRpcV2Request<RequestMethod>,
  ): Promise<Json> {
    return this.#sender.send({
      ...request,
    });
  }

  async getAccounts(): Promise<KeyringAccount[]> {
    return strictMask(
      await this.send({
        jsonrpc: '2.0',
        id: uuid(),
        method: KeyringRpcV2Method.GetAccounts,
      }),
      GetAccountsV2ResponseStruct,
    );
  }

  async getAccount(id: string): Promise<KeyringAccount> {
    return strictMask(
      await this.send({
        jsonrpc: '2.0',
        id: uuid(),
        method: KeyringRpcV2Method.GetAccount,
        params: { id },
      }),
      GetAccountV2ResponseStruct,
    );
  }

  async createAccounts(
    params: CreateAccountOptions,
  ): Promise<KeyringAccount[]> {
    return strictMask(
      await this.send({
        jsonrpc: '2.0',
        id: uuid(),
        method: KeyringRpcV2Method.CreateAccounts,
        params,
      }),
      CreateAccountsV2ResponseStruct,
    );
  }

  async exportAccount(
    id: AccountId,
    options?: ExportAccountOptions,
  ): Promise<ExportedAccount> {
    return strictMask(
      await this.send({
        jsonrpc: '2.0',
        id: uuid(),
        method: KeyringRpcV2Method.ExportAccount,
        params: { id, ...(options ? { options } : {}) },
      }),
      ExportAccountV2ResponseStruct,
    );
  }

  async deleteAccount(id: AccountId): Promise<void> {
    assert(
      await this.send({
        jsonrpc: '2.0',
        id: uuid(),
        method: KeyringRpcV2Method.DeleteAccount,
        params: { id },
      }),
      DeleteAccountV2ResponseStruct,
    );
  }

  async submitRequest(request: KeyringRequest): Promise<Json> {
    return strictMask(
      await this.send({
        jsonrpc: '2.0',
        id: uuid(),
        method: KeyringRpcV2Method.SubmitRequest,
        params: request,
      }),
      SubmitRequestV2ResponseStruct,
    );
  }
}
