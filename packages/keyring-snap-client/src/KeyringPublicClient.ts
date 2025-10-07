import type {
  BatchRequestRequest,
  BatchResponse,
  KeyringAccount,
  KeyringAccountData,
  KeyringRequest,
} from '@metamask/keyring-api';
import { KeyringRpcMethod } from '@metamask/keyring-api';
import type { Json } from '@metamask/utils';

import type { Sender } from './KeyringClient';
import { KeyringClient } from './KeyringClient';

/**
 * Convert a tuple to a union.
 */
type TupleToUnion<Tuple extends readonly unknown[]> = Tuple[number];

/**
 * Extract the method name from a RPC method name.
 */
type KeyringRpcMethodToMethodName<RpcMethod extends string> =
  RpcMethod extends `keyring_${infer Method}` ? Method : never;

/**
 * Public methods list.
 */
export const KeyringPublicRpcMethod = [
  KeyringRpcMethod.CreateAccount,
  KeyringRpcMethod.GetAccount,
  KeyringRpcMethod.UpdateAccount,
  KeyringRpcMethod.DeleteAccount,
  KeyringRpcMethod.ExportAccount,
  KeyringRpcMethod.ListAccounts,
  KeyringRpcMethod.FilterAccountChains,
  KeyringRpcMethod.GetRequest,
  KeyringRpcMethod.ApproveRequest,
  KeyringRpcMethod.RejectRequest,
  KeyringRpcMethod.ListRequests,
  KeyringRpcMethod.Batch,
] as const;

/**
 * Union of all public methods.
 */
type KeyringPublicMethod = KeyringRpcMethodToMethodName<
  TupleToUnion<typeof KeyringPublicRpcMethod>
>;

/**
 * A client that can be used by companion dapp. Only some keyring methods are
 * available with this client.
 */
export class KeyringPublicClient
  implements Pick<KeyringClient, KeyringPublicMethod>
{
  readonly #client: KeyringClient;

  /**
   * Create a new instance of `KeyringPublicClient`.
   *
   * @param sender - The `Sender` instance to use to send requests to the snap.
   */
  constructor(sender: Sender) {
    this.#client = new KeyringClient(sender);
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

  async batch(requests: BatchRequestRequest[]): Promise<BatchResponse> {
    return this.#client.batch(requests);
  }
}
