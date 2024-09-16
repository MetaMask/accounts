import type { TypedTransaction } from '@ethereumjs/tx';
import { TransactionFactory } from '@ethereumjs/tx';
import type { TypedDataV1, TypedMessage } from '@metamask/eth-sig-util';
import { SignTypedDataVersion } from '@metamask/eth-sig-util';
import type {
  BtcMethod,
  EthBaseTransaction,
  EthBaseUserOperation,
  EthUserOperation,
  EthUserOperationPatch,
  InternalAccount,
  KeyringAccount,
  KeyringExecutionContext,
  KeyringResponse,
} from '@metamask/keyring-api';
import {
  AccountCreatedEventStruct,
  AccountDeletedEventStruct,
  AccountUpdatedEventStruct,
  EthBaseUserOperationStruct,
  EthBytesStruct,
  EthMethod,
  EthUserOperationPatchStruct,
  KeyringEvent,
  RequestApprovedEventStruct,
  RequestRejectedEventStruct,
} from '@metamask/keyring-api';
import type { SnapController } from '@metamask/snaps-controllers';
import type { SnapId } from '@metamask/snaps-sdk';
import type { Snap } from '@metamask/snaps-utils';
import { assert, mask, object, string } from '@metamask/superstruct';
import type { Json } from '@metamask/utils';
import {
  bigIntToHex,
  KnownCaipNamespace,
  toCaipChainId,
} from '@metamask/utils';
import { EventEmitter } from 'events';
import { v4 as uuid } from 'uuid';

import { DeferredPromise } from './DeferredPromise';
import { KeyringSnapControllerClient } from './KeyringSnapControllerClient';
import { projectLogger as log } from './logger';
import { SnapIdMap } from './SnapIdMap';
import type { SnapMessage } from './types';
import { SnapMessageStruct } from './types';
import {
  equalsIgnoreCase,
  strictMask,
  throwError,
  toJson,
  unique,
} from './util';

export const SNAP_KEYRING_TYPE = 'Snap Keyring';

// TODO: to be removed when this is added to the keyring-api

type AccountMethod = EthMethod | BtcMethod;

/**
 * Snap keyring state.
 *
 * This state is persisted by the keyring controller and passed to the Snap
 * keyring when it's created.
 */
export type KeyringState = {
  accounts: Record<string, { account: KeyringAccount; snapId: SnapId }>;
};

/**
 * Snap keyring callbacks.
 *
 * These callbacks are used to interact with other components.
 */
export type SnapKeyringCallbacks = {
  saveState: () => Promise<void>;

  addressExists(address: string): Promise<boolean>;

  addAccount(
    address: string,
    snapId: SnapId,
    handleUserInput: (accepted: boolean) => Promise<void>,
    accountNameSuggestion?: string,
    displayConfirmation?: boolean,
  ): Promise<void>;

  removeAccount(
    address: string,
    snapId: SnapId,
    handleUserInput: (accepted: boolean) => Promise<void>,
  ): Promise<void>;

  redirectUser(snapId: SnapId, url: string, message: string): Promise<void>;
};

/**
 * Keyring bridge implementation to support Snaps.
 */
export class SnapKeyring extends EventEmitter {
  static type: string = SNAP_KEYRING_TYPE;

  type: string;

  /**
   * Client used to call the Snap keyring.
   */
  #snapClient: KeyringSnapControllerClient;

  /**
   * Mapping between account IDs and an object that contains the associated
   * account object and Snap ID.
   */
  #accounts: SnapIdMap<{
    account: KeyringAccount;
    snapId: SnapId;
  }>;

  /**
   * Mapping between request IDs and their deferred promises.
   */
  #requests: SnapIdMap<{
    promise: DeferredPromise<any>;
    snapId: SnapId;
  }>;

  /**
   * Callbacks used to interact with other components.
   */
  #callbacks: SnapKeyringCallbacks;

  /**
   * Create a new Snap keyring.
   *
   * @param controller - Snaps controller.
   * @param callbacks - Callbacks used to interact with other components.
   * @returns A new Snap keyring.
   */
  constructor(controller: SnapController, callbacks: SnapKeyringCallbacks) {
    super();
    this.type = SnapKeyring.type;
    this.#snapClient = new KeyringSnapControllerClient({ controller });
    this.#requests = new SnapIdMap();
    this.#accounts = new SnapIdMap();
    this.#callbacks = callbacks;
  }

  /**
   * Handle an Account Created event from a Snap.
   *
   * @param snapId - Snap ID.
   * @param message - Event message.
   * @returns `null`.
   */
  async #handleAccountCreated(
    snapId: SnapId,
    message: SnapMessage,
  ): Promise<null> {
    assert(message, AccountCreatedEventStruct);
    const { account, accountNameSuggestion, displayConfirmation } =
      message.params;

    // The UI still uses the account address to identify accounts, so we need
    // to block the creation of duplicate accounts for now to prevent accounts
    // from being overwritten.
    if (await this.#callbacks.addressExists(account.address.toLowerCase())) {
      throw new Error(`Account address '${account.address}' already exists`);
    }

    // A Snap could try to create an account with a different address but with
    // an existing ID, so the above test only is not enough.
    if (this.#accounts.has(snapId, account.id)) {
      throw new Error(`Account '${account.id}' already exists`);
    }

    await this.#callbacks.addAccount(
      account.address.toLowerCase(),
      snapId,
      async (accepted: boolean) => {
        if (accepted) {
          this.#accounts.set(account.id, { account, snapId });
          await this.#callbacks.saveState();
        }
      },
      accountNameSuggestion,
      displayConfirmation,
    );
    return null;
  }

  /**
   * Handle an Account Updated event from a Snap.
   *
   * @param snapId - Snap ID.
   * @param message - Event message.
   * @returns `null`.
   */
  async #handleAccountUpdated(
    snapId: SnapId,
    message: SnapMessage,
  ): Promise<null> {
    assert(message, AccountUpdatedEventStruct);
    const { account: newAccount } = message.params;
    const { account: oldAccount } =
      this.#accounts.get(snapId, newAccount.id) ??
      throwError(`Account '${newAccount.id}' not found`);

    // The address of the account cannot be changed. In the future, we will
    // support changing the address of an account since it will be required to
    // support UTXO-based chains.
    if (!equalsIgnoreCase(oldAccount.address, newAccount.address)) {
      throw new Error(`Cannot change address of account '${newAccount.id}'`);
    }

    this.#accounts.set(newAccount.id, { account: newAccount, snapId });
    await this.#callbacks.saveState();
    return null;
  }

  /**
   * Handle an Account Deleted event from a Snap.
   *
   * @param snapId - Snap ID.
   * @param message - Event message.
   * @returns `null`.
   */
  async #handleAccountDeleted(
    snapId: SnapId,
    message: SnapMessage,
  ): Promise<null> {
    assert(message, AccountDeletedEventStruct);
    const { id } = message.params;
    const entry = this.#accounts.get(snapId, id);

    // We can ignore the case where the account was already removed from the
    // keyring, making the deletion idempotent.
    //
    // This happens when the keyring calls the Snap to delete an account, and
    // the Snap calls the keyring back with an `AccountDeleted` event.
    if (entry === undefined) {
      return null;
    }

    // At this point we know that the account exists, so we can safely
    // destructure it.
    const {
      account: { address },
    } = entry;

    await this.#callbacks.removeAccount(
      address.toLowerCase(),
      snapId,
      async (accepted) => {
        if (accepted) {
          await this.#callbacks.saveState();
        }
      },
    );
    return null;
  }

  /**
   * Handle an Request Approved event from a Snap.
   *
   * @param snapId - Snap ID.
   * @param message - Event message.
   * @returns `null`.
   */
  async #handleRequestApproved(
    snapId: SnapId,
    message: SnapMessage,
  ): Promise<null> {
    assert(message, RequestApprovedEventStruct);
    const { id, result } = message.params;
    const { promise } =
      this.#requests.get(snapId, id) ?? throwError(`Request '${id}' not found`);

    this.#requests.delete(snapId, id);
    promise.resolve(result);
    return null;
  }

  /**
   * Handle an Request Rejected event from a Snap.
   *
   * @param snapId - Snap ID.
   * @param message - Event message.
   * @returns `null`.
   */
  async #handleRequestRejected(
    snapId: SnapId,
    message: SnapMessage,
  ): Promise<null> {
    assert(message, RequestRejectedEventStruct);
    const { id } = message.params;
    const { promise } =
      this.#requests.get(snapId, id) ?? throwError(`Request '${id}' not found`);

    this.#requests.delete(snapId, id);
    promise.reject(new Error(`Request rejected by user or snap.`));
    return null;
  }

  /**
   * Handle a message from a Snap.
   *
   * @param snapId - ID of the Snap.
   * @param message - Message sent by the Snap.
   * @returns The execution result.
   */
  async handleKeyringSnapMessage(
    snapId: SnapId,
    message: SnapMessage,
  ): Promise<Json> {
    assert(message, SnapMessageStruct);
    switch (message.method) {
      case KeyringEvent.AccountCreated: {
        return this.#handleAccountCreated(snapId, message);
      }

      case KeyringEvent.AccountUpdated: {
        return this.#handleAccountUpdated(snapId, message);
      }

      case KeyringEvent.AccountDeleted: {
        return this.#handleAccountDeleted(snapId, message);
      }

      case KeyringEvent.RequestApproved: {
        return this.#handleRequestApproved(snapId, message);
      }

      case KeyringEvent.RequestRejected: {
        return this.#handleRequestRejected(snapId, message);
      }

      default:
        throw new Error(`Method not supported: ${message.method}`);
    }
  }

  /**
   * Serialize the keyring state.
   *
   * @returns Serialized keyring state.
   */
  async serialize(): Promise<KeyringState> {
    return {
      accounts: this.#accounts.toObject(),
    };
  }

  /**
   * Deserialize the keyring state into this keyring.
   *
   * @param state - Serialized keyring state.
   */
  async deserialize(state: KeyringState | undefined): Promise<void> {
    // If the state is undefined, it means that this is a new keyring, so we
    // don't need to do anything.
    if (state === undefined) {
      return;
    }
    this.#accounts = SnapIdMap.fromObject(state.accounts);
  }

  /**
   * Get the addresses of the accounts in this keyring.
   *
   * @returns The addresses of the accounts in this keyring.
   */
  async getAccounts(): Promise<string[]> {
    return unique(
      [...this.#accounts.values()].map(({ account }) =>
        account.address.toLowerCase(),
      ),
    );
  }

  /**
   * Get the addresses of the accounts associated with a given Snap.
   *
   * @param snapId - Snap ID to filter by.
   * @returns The addresses of the accounts associated with the given Snap.
   */
  async getAccountsBySnapId(snapId: SnapId): Promise<string[]> {
    return unique(
      [...this.#accounts.values()]
        .filter(({ snapId: accountSnapId }) => accountSnapId === snapId)
        .map(({ account }) => account.address.toLowerCase()),
    );
  }

  /**
   * Submit a request to a Snap.
   *
   * @param opts - Request options.
   * @param opts.address - Account address.
   * @param opts.method - Method to call.
   * @param opts.params - Method parameters.
   * @param opts.chainId - Selected chain ID (CAIP-2).
   * @param opts.expectSync - Whether the request should be synchronous.
   * @returns Promise that resolves to the result of the method call.
   */
  async #submitRequest<Response extends Json>({
    address,
    method,
    params,
    chainId = '',
    expectSync = false,
  }: {
    address: string;
    method: string;
    params?: Json[] | Record<string, Json>;
    chainId?: string;
    expectSync?: boolean;
  }): Promise<Json> {
    const { account, snapId } = this.#resolveAddress(address);
    if (!this.#hasMethod(account, method as AccountMethod)) {
      throw new Error(
        `Method '${method}' not supported for account ${account.address}`,
      );
    }

    const requestId = uuid();

    // Create the promise before calling the Snap to prevent a race condition
    // where the Snap responds before we have a chance to create it.
    const promise = this.#createRequestPromise<Response>(requestId, snapId);

    const response = await this.#submitSnapRequest({
      snapId,
      requestId,
      account,
      method: method as AccountMethod,
      params,
      chainId,
    });

    // Some methods, like the ones used to prepare and patch user operations,
    // require the Snap to answer synchronously in order to work with the
    // confirmation flow. This check lets the caller enforce this behavior.
    if (expectSync && response.pending) {
      throw new Error(
        `Request '${requestId}' to snap '${snapId}' is pending and expectSync is true.`,
      );
    }

    // If the Snap answers synchronously, the promise must be removed from the
    // map to prevent a leak.
    if (!response.pending) {
      return this.#handleSyncResponse(response, requestId, snapId);
    }

    // If the Snap answers asynchronously, we will inform the user with a redirect
    if (response.redirect?.message || response.redirect?.url) {
      await this.#handleAsyncResponse(response.redirect, snapId);
    }

    return promise.promise;
  }

  /**
   * Check if an account supports the given method.
   *
   * @param account - The account object to check for method support.
   * @param method - The Ethereum method to validate.
   * @returns `true` if the method is supported, `false` otherwise.
   */
  #hasMethod(account: KeyringAccount, method: AccountMethod): boolean {
    return (account.methods as AccountMethod[]).includes(method);
  }

  /**
   * Creates a promise for a request and adds it to the map of requests.
   *
   * @param requestId - The unique identifier for the request.
   * @param snapId - The Snap ID associated with the request.
   * @returns A DeferredPromise instance.
   */
  #createRequestPromise<Response>(
    requestId: string,
    snapId: SnapId,
  ): DeferredPromise<Response> {
    const promise = new DeferredPromise<Response>();
    this.#requests.set(requestId, { promise, snapId });
    return promise;
  }

  /**
   * Submits a request to a Snap.
   *
   * @param options - The options for the Snap request.
   * @param options.snapId - The Snap ID to submit the request to.
   * @param options.requestId - The unique identifier for the request.
   * @param options.account - The account to use for the request.
   * @param options.method - The Ethereum method to call.
   * @param options.params - The parameters to pass to the method, can be undefined.
   * @param options.chainId - The chain ID to use for the request, can be an empty string.
   * @returns A promise that resolves to the keyring response from the Snap.
   * @throws An error if the Snap fails to respond or if there's an issue with the request submission.
   */
  async #submitSnapRequest({
    snapId,
    requestId,
    account,
    method,
    params,
    chainId,
  }: {
    snapId: SnapId;
    requestId: string;
    account: KeyringAccount;
    method: AccountMethod;
    params?: Json[] | Record<string, Json> | undefined;
    chainId: string;
  }): Promise<KeyringResponse> {
    try {
      const request = {
        id: requestId,
        scope: chainId,
        account: account.id,
        request: {
          method,
          ...(params !== undefined && { params }),
        },
      };

      log('Submit Snap request: ', request);

      return await this.#snapClient.withSnapId(snapId).submitRequest(request);
    } catch (error) {
      log('Snap Request failed: ', { requestId });

      // If the Snap failed to respond, delete the promise to prevent a leak.
      this.#requests.delete(snapId, requestId);
      throw error;
    }
  }

  /**
   * Handles the synchronous response from a Snap. If the response indicates the request is not pending, it removes the request from the map.
   *
   * @param response - The response from the Snap.
   * @param response.pending - A boolean indicating if the request is pending should always be false in this context.
   * @param response.result - The result data from the Snap response.
   * @param requestId - The unique identifier for the request.
   * @param snapId - The Snap ID associated with the request.
   * @returns The result from the Snap response.
   */
  #handleSyncResponse(
    response: { pending: false; result: Json },
    requestId: string,
    snapId: SnapId,
  ): Json {
    this.#requests.delete(snapId, requestId);
    return response.result;
  }

  /**
   * Handles the async redirect and response from a Snap. Validates the redirect URL and informs the user with a message and URL if provided.
   *
   * @param redirect - The redirect information including message and URL.
   * @param redirect.message - The message to show to the user if provided.
   * @param redirect.url - The URL to redirect the user to if provided.
   * @param snapId - The Snap ID associated with the request.
   * @throws An error if the redirect URL is not an allowed origin for the Snap.
   */
  async #handleAsyncResponse(
    redirect: { message?: string; url?: string },
    snapId: SnapId,
  ) {
    const { message = '', url = '' } = redirect;
    if (url) {
      this.#validateRedirectUrl(url, snapId);
    }
    await this.#callbacks.redirectUser(snapId, url, message);
  }

  /**
   * Validates if the redirect URL is in the Snap's allowed origins.
   *
   * @param url - The URL to validate.
   * @param snapId - The Snap ID to check allowed origins for.
   * @throws An error if the URL's origin is not in the Snap's allowed origins.
   */
  #validateRedirectUrl(url: string, snapId: SnapId) {
    const { origin } = new URL(url);
    const snap = this.#snapClient.getController().get(snapId);
    if (!snap) {
      throw new Error(`Snap '${snapId}' not found.`);
    }
    const allowedOrigins = this.#getSnapAllowedOrigins(snap);
    if (!allowedOrigins.includes(origin)) {
      throw new Error(
        `Redirect URL domain '${origin}' is not an allowed origin by snap '${snapId}'`,
      );
    }
  }

  /**
   * Sign a transaction.
   *
   * @param address - Sender's address.
   * @param transaction - Transaction.
   * @param _opts - Transaction options (not used).
   */
  async signTransaction(
    address: string,
    transaction: TypedTransaction,
    _opts = {},
  ): Promise<Json | TypedTransaction> {
    const chainId = transaction.common.chainId();
    const tx = toJson({
      ...transaction.toJSON(),
      from: address,
      type: `0x${transaction.type.toString(16)}`,
      chainId: bigIntToHex(chainId),
    });

    const signedTx = await this.#submitRequest({
      address,
      method: EthMethod.SignTransaction,
      params: [tx],
      chainId: toCaipChainId(KnownCaipNamespace.Eip155, `${chainId}`),
    });

    // ! It's *** CRITICAL *** that we mask the signature here, otherwise the
    // ! Snap could overwrite the transaction.
    const signature = mask(
      signedTx,
      object({
        r: string(),
        s: string(),
        v: string(),
      }),
    );

    return TransactionFactory.fromTxData({
      ...(tx as Record<string, Json>),
      r: signature.r,
      s: signature.s,
      v: signature.v,
    });
  }

  /**
   * Sign a typed data message.
   *
   * @param address - Signer's address.
   * @param data - Data to sign.
   * @param opts - Signing options.
   * @returns The signature.
   */
  async signTypedData(
    address: string,
    data: Record<string, unknown>[] | TypedDataV1 | TypedMessage<any>,
    opts = { version: SignTypedDataVersion.V1 },
  ): Promise<string> {
    const methods = {
      [SignTypedDataVersion.V1]: EthMethod.SignTypedDataV1,
      [SignTypedDataVersion.V3]: EthMethod.SignTypedDataV3,
      [SignTypedDataVersion.V4]: EthMethod.SignTypedDataV4,
    };

    // Use 'V1' by default to match other keyring implementations. V1 will be
    // used if the version is not specified or not supported.
    const method = methods[opts.version] || EthMethod.SignTypedDataV1;

    // Extract chain ID as if it was a typed message (as defined by EIP-712), if
    // input is not a typed message, then chain ID will be undefined!
    const chainId = (data as TypedMessage<any>).domain?.chainId;

    return strictMask(
      await this.#submitRequest({
        address,
        method,
        params: toJson<Json[]>([address, data]),
        ...(chainId === undefined
          ? {}
          : {
              chainId: toCaipChainId(KnownCaipNamespace.Eip155, `${chainId}`),
            }),
      }),
      EthBytesStruct,
    );
  }

  /**
   * Sign a message.
   *
   * @param address - Signer's address.
   * @param hash - Data to sign.
   * @returns The signature.
   */
  async signMessage(address: string, hash: any): Promise<string> {
    return strictMask(
      await this.#submitRequest({
        address,
        method: EthMethod.Sign,
        params: toJson<Json[]>([address, hash]),
      }),
      EthBytesStruct,
    );
  }

  /**
   * Sign a personal message.
   *
   * Note: KeyringController says this should return a Buffer but it actually
   * expects a string.
   *
   * @param address - Signer's address.
   * @param data - Data to sign.
   * @returns Promise of the signature.
   */
  async signPersonalMessage(address: string, data: any): Promise<string> {
    return strictMask(
      await this.#submitRequest({
        address,
        method: EthMethod.PersonalSign,
        params: toJson<Json[]>([data, address]),
      }),
      EthBytesStruct,
    );
  }

  /**
   * Convert a base transaction to a base UserOperation.
   *
   * @param address - Address of the sender.
   * @param transactions - Base transactions to include in the UserOperation.
   * @param context - Keyring execution context.
   * @returns A pseudo-UserOperation that can be used to construct a real.
   */
  async prepareUserOperation(
    address: string,
    transactions: EthBaseTransaction[],
    context: KeyringExecutionContext,
  ): Promise<EthBaseUserOperation> {
    return strictMask(
      await this.#submitRequest({
        address,
        method: EthMethod.PrepareUserOperation,
        params: toJson<Json[]>(transactions),
        expectSync: true,
        // We assume the chain ID is already well formatted
        chainId: toCaipChainId(KnownCaipNamespace.Eip155, context.chainId),
      }),
      EthBaseUserOperationStruct,
    );
  }

  /**
   * Patches properties of a UserOperation. Currently, only the
   * `paymasterAndData` can be patched.
   *
   * @param address - Address of the sender.
   * @param userOp - UserOperation to patch.
   * @param context - Keyring execution context.
   * @returns A patch to apply to the UserOperation.
   */
  async patchUserOperation(
    address: string,
    userOp: EthUserOperation,
    context: KeyringExecutionContext,
  ): Promise<EthUserOperationPatch> {
    return strictMask(
      await this.#submitRequest({
        address,
        method: EthMethod.PatchUserOperation,
        params: toJson<Json[]>([userOp]),
        expectSync: true,
        // We assume the chain ID is already well formatted
        chainId: toCaipChainId(KnownCaipNamespace.Eip155, context.chainId),
      }),
      EthUserOperationPatchStruct,
    );
  }

  /**
   * Signs an UserOperation.
   *
   * @param address - Address of the sender.
   * @param userOp - UserOperation to sign.
   * @param context - Leyring execution context.
   * @returns The signature of the UserOperation.
   */
  async signUserOperation(
    address: string,
    userOp: EthUserOperation,
    context: KeyringExecutionContext,
  ): Promise<string> {
    return strictMask(
      await this.#submitRequest({
        address,
        method: EthMethod.SignUserOperation,
        params: toJson<Json[]>([userOp]),
        // We assume the chain ID is already well formatted
        chainId: toCaipChainId(KnownCaipNamespace.Eip155, context.chainId),
      }),
      EthBytesStruct,
    );
  }

  /**
   * Gets the private data associated with the given address so
   * that it may be exported.
   *
   * If this keyring contains duplicate public keys the first
   * matching address is exported.
   *
   * Used by the UI to export an account.
   *
   * @param _address - Address of the account to export.
   */
  exportAccount(_address: string): [Uint8Array, Json] | undefined {
    throw new Error('Exporting accounts from snaps is not supported.');
  }

  /**
   * Removes the account matching the given address.
   *
   * @param address - Address of the account to remove.
   */
  async removeAccount(address: string): Promise<void> {
    const { account, snapId } = this.#resolveAddress(address);

    // Always remove the account from the maps, even if the Snap is going to
    // fail to delete it.
    this.#accounts.delete(snapId, account.id);

    try {
      await this.#snapClient.withSnapId(snapId).deleteAccount(account.id);
    } catch (error) {
      // If the Snap failed to delete the account, log the error and continue
      // with the account deletion, otherwise the account will be stuck in the
      // keyring.
      console.error(
        `Account '${address}' may not have been removed from snap '${snapId}':`,
        error,
      );
    }
  }

  /**
   * Resolve an address to an account and Snap ID.
   *
   * @param address - Address of the account to resolve.
   * @returns Account and Snap ID. Throws if the account or Snap ID is not
   * found.
   */
  #resolveAddress(address: string): {
    account: KeyringAccount;
    snapId: SnapId;
  } {
    return (
      [...this.#accounts.values()].find(({ account }) =>
        equalsIgnoreCase(account.address, address),
      ) ?? throwError(`Account '${address}' not found`)
    );
  }

  /**
   * Get the metadata of a Snap keyring account.
   *
   * @param snapId - Snap ID.
   * @returns The Snap metadata or undefined if the Snap cannot be found.
   */
  #getSnapMetadata(
    snapId: SnapId,
  ): InternalAccount['metadata']['snap'] | undefined {
    const snap = this.#snapClient.getController().get(snapId);
    return snap
      ? { id: snapId, name: snap.manifest.proposedName, enabled: snap.enabled }
      : undefined;
  }

  /**
   * Get the allowed origins of a Snap.
   *
   * @param snap - Snap.
   * @returns The allowed origins of the Snap.
   */
  #getSnapAllowedOrigins(snap: Snap): string[] {
    return (
      snap.manifest.initialPermissions['endowment:keyring']?.allowedOrigins ??
      []
    );
  }

  /**
   * Return an internal account object for a given address.
   *
   * @param address - Address of the account to return.
   * @returns An internal account object for the given address.
   */
  getAccountByAddress(address: string): InternalAccount | undefined {
    const accounts = this.listAccounts();
    return accounts.find(({ address: accountAddress }) =>
      equalsIgnoreCase(accountAddress, address),
    );
  }

  /**
   * List all Snap keyring accounts.
   *
   * @returns An array containing all Snap keyring accounts.
   */
  listAccounts(): InternalAccount[] {
    return [...this.#accounts.values()].map(({ account, snapId }) => {
      const snap = this.#getSnapMetadata(snapId);
      return {
        ...account,
        // TODO: Do not convert the address to lowercase.
        //
        // This is a workaround to support the current UI which expects the
        // account address to be lowercase. This workaround should be removed
        // once we migrated the UI to use the account ID instead of the account
        // address.
        address: account.address.toLowerCase(),
        metadata: {
          name: '',
          importTime: 0,
          keyring: {
            type: this.type,
          },
          ...(snap !== undefined && { snap }),
        },
      };
    });
  }
}
