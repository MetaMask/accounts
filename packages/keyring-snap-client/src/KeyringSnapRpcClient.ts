import type {
  KeyringAccount,
  KeyringAccountData,
  KeyringRequest,
} from '@metamask/keyring-api';
import type { JsonRpcRequest } from '@metamask/keyring-utils';
import type { MetaMaskInpageProvider } from '@metamask/providers';
import type { Json } from '@metamask/utils';

import type { Sender } from './KeyringClient';
import { KeyringClient } from './KeyringClient';
import type { KeyringPublicClient } from './KeyringPublicClient';

/**
 * Implementation of the `Sender` interface that can be used to send requests
 * to a snap through the snap JSON-RPC API.
 */
export class SnapRpcSender implements Sender {
  readonly #origin: string;

  readonly #provider: MetaMaskInpageProvider;

  /**
   * Create a new instance of `SnapRpcSender`.
   *
   * @param origin - The caller's origin.
   * @param provider - The `MetaMaskInpageProvider` instance to use.
   */
  constructor(origin: string, provider: MetaMaskInpageProvider) {
    this.#origin = origin;
    this.#provider = provider;
  }

  /**
   * Send a request to the snap and return the response.
   *
   * @param request - The JSON-RPC request to send to the snap.
   * @returns A promise that resolves to the response of the request.
   */
  async send(request: JsonRpcRequest): Promise<Json> {
    return this.#provider.request({
      method: 'wallet_invokeKeyring',
      params: {
        snapId: this.#origin,
        request,
      },
    }) as Promise<Json>;
  }
}

/**
 * A client that allows the communication with a snap through the snap
 * JSON-RPC API to call keyring methods.
 */
export class KeyringSnapRpcClient implements KeyringPublicClient {
  readonly #client: KeyringClient;

  /**
   * Create a new instance of `KeyringSnapRpcClient`.
   *
   * @param origin - Caller's origin.
   * @param provider - The `MetaMaskInpageProvider` instance to use.
   */
  constructor(origin: string, provider: MetaMaskInpageProvider) {
    this.#client = new KeyringClient(new SnapRpcSender(origin, provider));
  }

  async createAccount(options?: Record<string, Json>): Promise<KeyringAccount> {
    return this.#client.createAccount(options);
  }

  async deleteAccount(id: string): Promise<void> {
    return this.#client.deleteAccount(id);
  }

  async listAccounts(): Promise<KeyringAccount[]> {
    return this.#client.listAccounts();
  }

  async getAccount(id: string): Promise<KeyringAccount> {
    return this.#client.getAccount(id);
  }

  async getRequest(id: string): Promise<KeyringRequest> {
    return this.#client.getRequest(id);
  }

  async listRequests(): Promise<KeyringRequest[]> {
    return this.#client.listRequests();
  }

  async updateAccount(account: KeyringAccount): Promise<void> {
    return this.#client.updateAccount(account);
  }

  async approveRequest(id: string, data?: Record<string, Json>): Promise<void> {
    return this.#client.approveRequest(id, data);
  }

  async rejectRequest(id: string): Promise<void> {
    return this.#client.rejectRequest(id);
  }

  async filterAccountChains(id: string, chains: string[]): Promise<string[]> {
    return this.#client.filterAccountChains(id, chains);
  }

  async exportAccount(id: string): Promise<KeyringAccountData> {
    return this.#client.exportAccount(id);
  }
}
