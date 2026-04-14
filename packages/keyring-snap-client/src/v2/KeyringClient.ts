import type { KeyringAccount, KeyringRequest } from '@metamask/keyring-api';
import {
  CreateAccountsResponseStruct,
  DeleteAccountResponseStruct,
  GetAccountResponseStruct,
  GetAccountsResponseStruct,
  SubmitRequestResponseStruct,
  KeyringRpcMethod,
  ExportAccountResponseStruct,
} from '@metamask/keyring-api/v2';
import type {
  CreateAccountOptions,
  ExportAccountOptions,
  ExportedAccount,
  KeyringRpc,
  KeyringRpcRequest,
} from '@metamask/keyring-api/v2';
import type { AccountId } from '@metamask/keyring-utils';
import { strictMask } from '@metamask/keyring-utils';
import { assert } from '@metamask/superstruct';
import type { Json } from '@metamask/utils';
import { v4 as uuid } from 'uuid';

import type { Sender } from '../KeyringClient';

export class KeyringClient implements KeyringRpc {
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
  protected async send<RequestMethod extends KeyringRpcMethod>(
    request: KeyringRpcRequest<RequestMethod>,
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
        method: KeyringRpcMethod.GetAccounts,
      }),
      GetAccountsResponseStruct,
    );
  }

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
}
