import type { TypedTransaction } from '@ethereumjs/tx';
import { TransactionFactory } from '@ethereumjs/tx';
import type { TypedDataV1, TypedMessage } from '@metamask/eth-sig-util';
import { SignTypedDataVersion } from '@metamask/eth-sig-util';
import type {
  KeyringAccount,
  BtcMethod,
  CaipChainId,
  ResolvedAccountAddress,
  KeyringExecutionContext,
  EthBaseTransaction,
  EthBaseUserOperation,
  EthUserOperation,
  EthUserOperationPatch,
} from '@metamask/keyring-api';
import {
  AnyAccountType,
  EthMethod,
  KeyringEvent,
  EthBytesStruct,
  EthBaseUserOperationStruct,
  EthUserOperationPatchStruct,
  AccountBalancesUpdatedEventStruct,
  AccountAssetListUpdatedEventStruct,
  AccountTransactionsUpdatedEventStruct,
} from '@metamask/keyring-api';
import { toKeyringRequestWithoutOrigin } from '@metamask/keyring-internal-api';
import { KeyringInternalSnapClient } from '@metamask/keyring-internal-snap-client';
import { KeyringAccountRegistry } from '@metamask/keyring-sdk';
import {
  GetSelectedAccountsRequestStruct,
  SnapManageAccountsMethod,
} from '@metamask/keyring-snap-sdk';
import type { GetSelectedAccountsResponse } from '@metamask/keyring-snap-sdk';
import type { AccountId, JsonRpcRequest } from '@metamask/keyring-utils';
import { strictMask } from '@metamask/keyring-utils';
import type { ExtractEventPayload } from '@metamask/messenger';
import type { SnapId } from '@metamask/snaps-sdk';
import { assert, mask, object, string } from '@metamask/superstruct';
import type { Hex, Json, DeferredPromise } from '@metamask/utils';
import {
  bigIntToHex,
  hasProperty,
  KnownCaipNamespace,
  toCaipChainId,
  createDeferredPromise,
} from '@metamask/utils';
import { v4 as uuid } from 'uuid';

import { transformAccount } from './account';
import {
  AccountCreatedEventStruct,
  AccountUpdatedEventStruct,
  AccountDeletedEventStruct,
  RequestApprovedEventStruct,
  RequestRejectedEventStruct,
} from './events';
import { projectLogger as log } from './logger';
import { getInternalOptionsOf } from './options';
import type { SnapKeyringInternalOptions } from './options';
import { PLATFORM_VERSION_FOR_KEYRING_REQUEST_WITH_ORIGIN } from './platform-versions';
import type {
  SnapKeyringEvents,
  SnapKeyringMessenger,
} from './SnapKeyringMessenger';
import type { SnapMessage } from './types';
import { SnapMessageStruct } from './types';
import {
  equalsIgnoreCase,
  normalizeAccountAddress,
  sanitizeUrl,
  throwError,
  toJson,
} from './util';

// TODO: to be removed when this is added to the keyring-api
export type AccountMethod = EthMethod | BtcMethod;

/**
 * Callback type to filter unknown account ID from a mapping account ID mapping.
 */
type FilterAccountIdFunction = <Entry>(
  accountMapping: Record<AccountId, Entry>,
) => Record<AccountId, Entry>;

/**
 * Callbacks injected by the parent `SnapKeyring` to delegate global concerns.
 *
 * These cover operations that span multiple snaps or require parent-level
 * coordination (account approval UI, persistence, global uniqueness checks).
 */
export type SnapKeyringV1Callbacks = {
  /**
   * Called when a new account is being created (v1 event-driven flow).
   * Handles the user-approval dialog and account registration in the UI.
   * The `snapId` is baked in at construction time.
   */
  addAccount: (
    address: string,
    handleUserInput: (accepted: boolean) => Promise<void>,
    onceSaved: Promise<AccountId>,
    accountNameSuggestion?: string,
    internalOptions?: SnapKeyringInternalOptions,
  ) => Promise<void>;

  /**
   * Called when an account is being deleted.
   * Handles the user-approval dialog and account removal in the UI.
   * The `snapId` is baked in at construction time.
   */
  removeAccount: (
    address: string,
    handleUserInput: (accepted: boolean) => Promise<void>,
  ) => Promise<void>;

  /**
   * Persist keyring state to disk via KeyringController.
   */
  saveState: () => Promise<void>;

  /**
   * Redirect the user to a URL after an async snap request.
   */
  redirectUser: (url: string, message: string) => Promise<void>;

  /**
   * Check global uniqueness (address + ID). Throws if the account cannot be used.
   * Must remain in the parent because it checks cross-snap invariants.
   */
  assertAccountCanBeUsed: (account: KeyringAccount) => Promise<void>;

  /**
   * Called synchronously whenever a new account is added to the registry.
   * Optional — consumers that don't need cross-instance indexing can omit this.
   */
  onRegister?: (accountId: AccountId) => void;

  /**
   * Called synchronously whenever an account is removed from the registry.
   * Optional — consumers that don't need cross-instance indexing can omit this.
   */
  onUnregister?: (accountId: AccountId) => void;
};

/**
 * Options for creating a `SnapKeyringV1` instance.
 */
export type SnapKeyringV1Options = {
  snapId: SnapId;
  messenger: SnapKeyringMessenger;
  callbacks: SnapKeyringV1Callbacks;
  /**
   * Whether to allow the creation and update of generic accounts.
   * Defaults to `false`.
   */
  isAnyAccountTypeAllowed?: boolean;
};

/**
 * Per-snap coordinator for the v1 (event-driven) keyring flow.
 *
 * Each instance is scoped to exactly one `SnapId`. It handles all Snap
 * keyring events (account lifecycle, request approval, asset updates) and
 * owns the per-snap request / internal-options state.
 *
 * Designed to be subclassed: `SnapKeyringV2` extends this class and adds the
 * `KeyringV2` interface on top, sharing the same registry and client.
 */
export class SnapKeyringV1 {
  /** The snap ID this instance is scoped to. */
  readonly snapId: SnapId;

  /** Account registry — shared with subclass (e.g. SnapKeyringV2). */
  protected readonly registry: KeyringAccountRegistry;

  /** Messenger for snap controller calls and event publishing. */
  protected readonly messenger: SnapKeyringMessenger;

  /** Snap client for keyring RPC calls. */
  protected readonly client: KeyringInternalSnapClient;

  /** Injected callbacks for parent-level coordination. */
  readonly #callbacks: SnapKeyringV1Callbacks;

  /** Whether to allow the creation and update of generic accounts. */
  readonly #isAnyAccountTypeAllowed: boolean;

  /**
   * Pending async request promises, keyed by request ID.
   * Plain Map is sufficient here since this instance is already snap-scoped.
   */
  readonly #requests: Map<string, DeferredPromise<any>>;

  /**
   * Correlation ID -> internal options, used to thread options from
   * `createAccount` through to the `AccountCreated` event handler.
   */
  readonly #options: Map<string, SnapKeyringInternalOptions>;

  /**
   * The currently selected account IDs for this snap.
   */
  #selectedAccounts: AccountId[];

  constructor({
    snapId,
    messenger,
    callbacks,
    isAnyAccountTypeAllowed = false,
  }: SnapKeyringV1Options) {
    this.snapId = snapId;
    this.registry = new KeyringAccountRegistry();
    this.messenger = messenger;
    this.#callbacks = callbacks;
    this.#isAnyAccountTypeAllowed = isAnyAccountTypeAllowed;
    this.client = new KeyringInternalSnapClient({ messenger, snapId });
    this.#requests = new Map();
    this.#options = new Map();
    this.#selectedAccounts = [];
  }

  // ──────────────────────────────────────────────
  // Public API
  // ──────────────────────────────────────────────

  /**
   * Destroy this keyring, rejecting any pending requests.
   *
   * Called when the per-snap entry is removed from the parent `SnapKeyring`,
   * either because all accounts were deleted or because state was re-deserialized.
   */
  async destroy(): Promise<void> {
    for (const promise of this.#requests.values()) {
      promise.reject(
        new Error(`Keyring for snap '${this.snapId}' has been destroyed`),
      );
    }
    this.#requests.clear();
  }

  /**
   * Create a single account using the v1 event-driven flow.
   *
   * Handles the reserved 'metamask' field, correlation IDs, and internal
   * options registration. The account is ultimately added to the registry
   * via the `AccountCreated` event handler, not the return value.
   *
   * @param options - Account creation options.
   * @param internalOptions - Internal Snap keyring options.
   * @returns The account object returned by the snap.
   */
  async createAccount(
    options: Record<string, Json>,
    internalOptions?: SnapKeyringInternalOptions,
  ): Promise<KeyringAccount> {
    return this.#createSnapAccount(options, internalOptions);
  }

  /**
   * Handle an incoming message from the Snap.
   *
   * Routes the message to the appropriate private handler based on the method.
   *
   * @param message - The message sent by the Snap.
   * @returns The execution result.
   */
  async handleKeyringSnapMessage(message: SnapMessage): Promise<Json> {
    assert(message, SnapMessageStruct);
    switch (message.method) {
      case `${KeyringEvent.AccountCreated}`: {
        return this.#handleAccountCreated(message);
      }

      case `${KeyringEvent.AccountUpdated}`: {
        return this.#handleAccountUpdated(message);
      }

      case `${KeyringEvent.AccountDeleted}`: {
        return this.#handleAccountDeleted(message);
      }

      case `${KeyringEvent.RequestApproved}`: {
        return this.#handleRequestApproved(message);
      }

      case `${KeyringEvent.RequestRejected}`: {
        return this.#handleRequestRejected(message);
      }

      case `${KeyringEvent.AccountBalancesUpdated}`: {
        return this.#handleAccountBalancesUpdated(message);
      }

      case `${KeyringEvent.AccountAssetListUpdated}`: {
        return this.#handleAccountAssetListUpdated(message);
      }

      case `${KeyringEvent.AccountTransactionsUpdated}`: {
        return this.#handleAccountTransactionsUpdated(message);
      }

      case `${SnapManageAccountsMethod.GetSelectedAccounts}`: {
        return this.#handleGetSelectedAccounts(message);
      }

      default:
        throw new Error(`Method not supported: ${message.method}`);
    }
  }

  /**
   * Submit a snap request for the given account.
   *
   * Manages the request promise lifecycle (creation, resolution, cleanup) and
   * handles both synchronous and asynchronous (redirect) responses.
   *
   * @param options - The request options.
   * @param options.origin - The sender origin.
   * @param options.account - The account to submit the request for.
   * @param options.method - The method to call.
   * @param options.params - The method parameters.
   * @param options.scope - The CAIP-2 chain ID.
   * @param options.noPending - Whether the response is allowed to be pending.
   * @returns A promise that resolves to the keyring response.
   */
  async submitSnapRequest<Response extends Json>({
    origin,
    account,
    method,
    params,
    scope,
    noPending,
  }: {
    origin: string;
    account: KeyringAccount;
    method: AccountMethod;
    params?: Json[] | Record<string, Json> | undefined;
    scope: string;
    noPending: boolean;
  }): Promise<Response> {
    if (!(account.methods as AccountMethod[]).includes(method)) {
      throw new Error(
        `Method '${method}' not supported for account ${account.address}`,
      );
    }

    // Will both catch `undefined` and "empty" origins.
    if (!origin?.trim()) {
      throw new Error('An `origin` is required');
    }

    const requestId = uuid();

    // Create the promise before calling the Snap to prevent a race condition
    // where the Snap responds before we have a chance to create it.
    const requestPromise = this.#createRequestPromise<Response>(requestId);

    try {
      const useOrigin = this.messenger.call(
        'SnapController:isMinimumPlatformVersion',
        this.snapId,
        PLATFORM_VERSION_FOR_KEYRING_REQUEST_WITH_ORIGIN,
      );

      const request = {
        id: requestId,
        origin,
        scope,
        account: account.id,
        request: {
          method,
          ...(params !== undefined && { params }),
        },
      };

      log('Submit Snap request: ', request);

      let response;
      if (useOrigin) {
        response = await this.client.submitRequest(request);
      } else {
        response = await this.client.submitRequestWithoutOrigin(
          toKeyringRequestWithoutOrigin(request),
        );
      }

      if (noPending && response.pending) {
        throw new Error(
          `Request '${requestId}' to Snap '${this.snapId}' is pending and noPending is true.`,
        );
      }

      if (!response.pending) {
        this.#requests.delete(requestId);
        return response.result as Response;
      }

      if (response.redirect?.message || response.redirect?.url) {
        await this.#handleAsyncRedirect(response.redirect);
      }

      return requestPromise.promise;
    } catch (error) {
      log('Snap Request failed: ', { requestId });
      this.#requests.delete(requestId);
      throw error;
    }
  }

  /**
   * Update the selected accounts for this snap.
   *
   * @param accountIds - The account IDs to set as selected.
   */
  async setSelectedAccounts(accountIds: AccountId[]): Promise<void> {
    this.#selectedAccounts = accountIds;
    try {
      await this.client.setSelectedAccounts(accountIds);
    } catch (error: any) {
      console.error(
        `Failed to set selected accounts for ${this.snapId} snap: '${error.message}'`,
      );
    }
  }

  /**
   * Resolve the account address associated with a signing request.
   *
   * Delegates directly to the snap-scoped client, which already has the
   * snap ID baked in from construction time.
   *
   * @param scope - CAIP-2 chain ID.
   * @param request - Signing request object.
   * @returns The resolved address if found, `null` otherwise.
   */
  async resolveAccountAddress(
    scope: CaipChainId,
    request: JsonRpcRequest,
  ): Promise<ResolvedAccountAddress | null> {
    return this.client.resolveAccountAddress(scope, request);
  }

  /**
   * Sign a transaction for the given account.
   *
   * @param account - The account to sign the transaction for.
   * @param transaction - The transaction to sign.
   * @param _opts - Transaction options (unused).
   * @returns A promise that resolves to the signed transaction.
   */
  async signTransaction(
    account: KeyringAccount,
    transaction: TypedTransaction,
    /* istanbul ignore next */
    _opts = {},
  ): Promise<Json | TypedTransaction> {
    const chainId = transaction.common.chainId();
    const tx = toJson({
      ...transaction.toJSON(),
      from: normalizeAccountAddress(account),
      type: `0x${transaction.type.toString(16)}`,
      chainId: bigIntToHex(chainId),
    });

    const signedTx = await this.submitSnapRequest({
      origin: 'metamask',
      account,
      method: EthMethod.SignTransaction,
      params: [tx],
      scope: toCaipChainId(KnownCaipNamespace.Eip155, `${chainId}`),
      noPending: false,
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
      r: signature.r as Hex,
      s: signature.s as Hex,
      v: signature.v as Hex,
    });
  }

  /**
   * Sign a typed data message for the given account.
   *
   * @param account - The account to sign the typed data for.
   * @param data - The typed data to sign.
   * @param opts - Signing options.
   * @param opts.version - The typed data version to use.
   * @returns A promise that resolves to the signature.
   */
  async signTypedData(
    account: KeyringAccount,
    data: Record<string, unknown>[] | TypedDataV1 | TypedMessage<any>,
    opts: { version: SignTypedDataVersion },
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

    const address = normalizeAccountAddress(account);
    return strictMask(
      await this.submitSnapRequest({
        origin: 'metamask',
        account,
        method,
        params: toJson<Json[]>([address, data]),
        scope:
          chainId === undefined
            ? ''
            : toCaipChainId(KnownCaipNamespace.Eip155, `${chainId}`),
        noPending: false,
      }),
      EthBytesStruct,
    );
  }

  /**
   * Sign a message (eth_sign) for the given account.
   *
   * @param account - The account to sign the message for.
   * @param hash - The data to sign.
   * @returns A promise that resolves to the signature.
   */
  async signMessage(account: KeyringAccount, hash: any): Promise<string> {
    const address = normalizeAccountAddress(account);
    return strictMask(
      await this.submitSnapRequest({
        origin: 'metamask',
        account,
        method: EthMethod.Sign,
        params: toJson<Json[]>([address, hash]),
        scope: '',
        noPending: false,
      }),
      EthBytesStruct,
    );
  }

  /**
   * Sign a personal message for the given account.
   *
   * Note: KeyringController says this should return a Buffer but it actually
   * expects a string.
   *
   * @param account - The account to sign the message for.
   * @param data - The data to sign.
   * @returns A promise that resolves to the signature.
   */
  async signPersonalMessage(
    account: KeyringAccount,
    data: any,
  ): Promise<string> {
    const address = normalizeAccountAddress(account);
    return strictMask(
      await this.submitSnapRequest({
        origin: 'metamask',
        account,
        method: EthMethod.PersonalSign,
        params: toJson<Json[]>([data, address]),
        scope: '',
        noPending: false,
      }),
      EthBytesStruct,
    );
  }

  /**
   * Convert a base transaction to a base UserOperation.
   *
   * @param account - The account to prepare the user operation for.
   * @param transactions - Base transactions to include in the UserOperation.
   * @param context - Keyring execution context.
   * @returns A pseudo-UserOperation that can be used to construct a real one.
   */
  async prepareUserOperation(
    account: KeyringAccount,
    transactions: EthBaseTransaction[],
    context: KeyringExecutionContext,
  ): Promise<EthBaseUserOperation> {
    return strictMask(
      await this.submitSnapRequest({
        origin: 'metamask',
        account,
        method: EthMethod.PrepareUserOperation,
        params: toJson<Json[]>(transactions),
        noPending: true,
        scope: toCaipChainId(KnownCaipNamespace.Eip155, context.chainId),
      }),
      EthBaseUserOperationStruct,
    );
  }

  /**
   * Patches properties of a UserOperation. Currently, only the
   * `paymasterAndData` can be patched.
   *
   * @param account - The account to patch the user operation for.
   * @param userOp - UserOperation to patch.
   * @param context - Keyring execution context.
   * @returns A patch to apply to the UserOperation.
   */
  async patchUserOperation(
    account: KeyringAccount,
    userOp: EthUserOperation,
    context: KeyringExecutionContext,
  ): Promise<EthUserOperationPatch> {
    return strictMask(
      await this.submitSnapRequest({
        origin: 'metamask',
        account,
        method: EthMethod.PatchUserOperation,
        params: toJson<Json[]>([userOp]),
        noPending: true,
        scope: toCaipChainId(KnownCaipNamespace.Eip155, context.chainId),
      }),
      EthUserOperationPatchStruct,
    );
  }

  /**
   * Signs a UserOperation.
   *
   * @param account - The account to sign the user operation for.
   * @param userOp - UserOperation to sign.
   * @param context - Keyring execution context.
   * @returns A promise that resolves to the signature.
   */
  async signUserOperation(
    account: KeyringAccount,
    userOp: EthUserOperation,
    context: KeyringExecutionContext,
  ): Promise<string> {
    return strictMask(
      await this.submitSnapRequest({
        origin: 'metamask',
        account,
        method: EthMethod.SignUserOperation,
        params: toJson<Json[]>([userOp]),
        noPending: false,
        scope: toCaipChainId(KnownCaipNamespace.Eip155, context.chainId),
      }),
      EthBytesStruct,
    );
  }

  // ──────────────────────────────────────────────
  // Private handlers
  // ──────────────────────────────────────────────

  /**
   * Handle an Account Created event from the Snap.
   *
   * @param message - Event message.
   * @returns `null`.
   */
  async #handleAccountCreated(message: SnapMessage): Promise<null> {
    assert(message, AccountCreatedEventStruct);
    const {
      metamask,
      account: newAccountFromEvent,
      accountNameSuggestion,
      displayAccountNameSuggestion,
      displayConfirmation,
    } = message.params;

    // READ THIS CAREFULLY:
    // ------------------------------------------------------------------------
    // The account creation flow is now asynchronous. We expect the Snap to
    // first create the account data and then fire the "AccountCreated" event.

    // Potentially migrate the account.
    const account = transformAccount(newAccountFromEvent);
    const address = normalizeAccountAddress(account);

    if (this.getExistingAccount(account)) {
      // If the account already exists, we skip it.
      return null;
    }

    // Make sure this new account is valid.
    await this.#callbacks.assertAccountCanBeUsed(account);

    // A deferred promise that will be resolved once the Snap keyring has saved
    // its internal state.
    // This part of the flow is run asynchronously, so we have no other way of
    // letting the MetaMask client that this "save" has been run.
    // NOTE: Another way of fixing that could be to rely on events through the
    // messenger maybe?
    const onceSaved = createDeferredPromise<AccountId>();

    // Add the account to the keyring, but wait for the MetaMask client to
    // approve the account creation first.
    await this.#callbacks.addAccount(
      address,
      // This callback is passed to the MetaMask client, it will be called whenever
      // the end user will accept or not the account creation.
      async (accepted: boolean) => {
        if (accepted) {
          // We consider the account to be created on the Snap keyring only if
          // the user accepted it. Meaning that the Snap MIGHT HAVE created the
          // account on its own state, but the Snap keyring MIGHT NOT HAVE it yet.
          //
          // e.g The account creation dialog crashed on MetaMask, this callback
          // will never be called, but the Snap still has the account.
          this.registry.set(account);
          this.#callbacks.onRegister?.(account.id);

          // This is the "true async part". We do not `await` for this call, mainly
          // because this callback will persist the account on the client side
          // (through the `AccountsController`).
          //
          // Since this will happen after the Snap account creation and Snap
          // event, if anything goes wrong, we will delete the account by
          // calling `deleteAccount` on the Snap.
          // eslint-disable-next-line no-void
          void this.#callbacks
            .saveState()
            .then(() => {
              // This allows the MetaMask client to be "notified" when then
              // Snap keyring has truly persisted its state. From there, we should
              // be able to use the account (e.g. to display account creation
              // confirmation dialogs).
              onceSaved.resolve(account.id);
            })
            .catch(
              /* istanbul ignore next */
              async (error: unknown) => {
                // FIXME: There's a potential race condition here, if the Snap did
                // not persist the account yet (this should mostly be for older Snaps).
                this.registry.delete(account.id);
                this.#callbacks.onUnregister?.(account.id);
                await this.client
                  .deleteAccount(account.id)
                  /* istanbul ignore next */
                  .catch((deleteError: unknown) => {
                    console.error(
                      `Account '${account.id}' may not have been removed from snap '${this.snapId}':`,
                      deleteError,
                    );
                  });

                // This allows the MetaMask client to be "notified" that something went
                // wrong with the Snap keyring. (e.g. useful to display account creation
                // error dialogs).
                onceSaved.reject(error);
              },
            );
        }
      },
      onceSaved.promise,
      accountNameSuggestion,
      getInternalOptionsOf([
        // 1. We use the internal options from the Snap keyring.
        this.#getInternalOptions(metamask?.correlationId) ?? {},
        // 2. We use the ones coming from the Snap.
        {
          displayConfirmation,
          displayAccountNameSuggestion,
        },
      ]),
    );

    return null;
  }

  /**
   * Handle an Account Updated event from the Snap.
   *
   * @param message - Event message.
   * @returns `null`.
   */
  async #handleAccountUpdated(message: SnapMessage): Promise<null> {
    assert(message, AccountUpdatedEventStruct);
    const { account: newAccountFromEvent } = message.params;
    const oldAccount =
      this.registry.get(newAccountFromEvent.id) ??
      throwError(`Account '${newAccountFromEvent.id}' not found`);

    // Potentially migrate the account.
    const newAccount = transformAccount(newAccountFromEvent);

    // The `AnyAccountType.Account` generic account type is allowed only during
    // development, so we check whether it's allowed before continuing.
    //
    // An account cannot be updated if the `isAnyAccountTypeAllowed` flag is
    // set to `false` and the new or old account is a generic account.
    const isGenericAccountInvolved =
      newAccount.type === AnyAccountType.Account ||
      oldAccount.type === AnyAccountType.Account;

    if (!this.#isAnyAccountTypeAllowed && isGenericAccountInvolved) {
      throw new Error(`Cannot update generic account '${newAccount.id}'`);
    }

    // The address of the account cannot be changed. In the future, we will
    // support changing the address of an account since it will be required to
    // support UTXO-based chains.
    if (!equalsIgnoreCase(oldAccount.address, newAccount.address)) {
      throw new Error(`Cannot change address of account '${newAccount.id}'`);
    }

    this.registry.set(newAccount);
    await this.#callbacks.saveState();
    return null;
  }

  /**
   * Handle an Account Deleted event from the Snap.
   *
   * @param message - Event message.
   * @returns `null`.
   */
  async #handleAccountDeleted(message: SnapMessage): Promise<null> {
    assert(message, AccountDeletedEventStruct);
    const { id } = message.params;
    const account = this.registry.get(id);

    // We can ignore the case where the account was already removed from the
    // keyring, making the deletion idempotent.
    //
    // This happens when the keyring calls the Snap to delete an account, and
    // the Snap calls the keyring back with an `AccountDeleted` event.
    if (account === undefined) {
      return null;
    }

    await this.#callbacks.removeAccount(
      normalizeAccountAddress(account),
      async (accepted) => {
        if (accepted) {
          await this.#callbacks.saveState();
        }
      },
    );
    return null;
  }

  /**
   * Handle a Request Approved event from the Snap.
   *
   * @param message - Event message.
   * @returns `null`.
   */
  async #handleRequestApproved(message: SnapMessage): Promise<null> {
    assert(message, RequestApprovedEventStruct);
    const { id, result } = message.params;
    const promise =
      this.#requests.get(id) ?? throwError(`Request '${id}' not found`);

    this.#requests.delete(id);
    promise.resolve(result);
    return null;
  }

  /**
   * Handle a Request Rejected event from the Snap.
   *
   * @param message - Event message.
   * @returns `null`.
   */
  async #handleRequestRejected(message: SnapMessage): Promise<null> {
    assert(message, RequestRejectedEventStruct);
    const { id } = message.params;
    const promise =
      this.#requests.get(id) ?? throwError(`Request '${id}' not found`);

    this.#requests.delete(id);
    promise.reject(new Error(`Request rejected by user or snap.`));
    return null;
  }

  /**
   * Handle a Get Selected Accounts method call from the Snap.
   *
   * @param message - Method call message.
   * @returns The selected accounts.
   */
  async #handleGetSelectedAccounts(
    message: SnapMessage,
  ): Promise<GetSelectedAccountsResponse> {
    assert(message, GetSelectedAccountsRequestStruct);
    return this.#selectedAccounts;
  }

  /**
   * Handle an Account Balances Updated event from the Snap.
   *
   * @param message - Event message.
   * @returns `null`.
   */
  async #handleAccountBalancesUpdated(message: SnapMessage): Promise<null> {
    assert(message, AccountBalancesUpdatedEventStruct);
    const event = message.params;
    return this.#rePublishAccountEvent(
      'SnapKeyring:accountBalancesUpdated',
      (filter) => {
        event.balances = filter(event.balances);
        return [event];
      },
    );
  }

  /**
   * Handle an Account Asset List Updated event from the Snap.
   *
   * @param message - Event message.
   * @returns `null`.
   */
  async #handleAccountAssetListUpdated(message: SnapMessage): Promise<null> {
    assert(message, AccountAssetListUpdatedEventStruct);
    const event = message.params;
    return this.#rePublishAccountEvent(
      'SnapKeyring:accountAssetListUpdated',
      (filter) => {
        event.assets = filter(event.assets);
        return [event];
      },
    );
  }

  /**
   * Handle an Account Transactions Updated event from the Snap.
   *
   * @param message - Event message.
   * @returns `null`.
   */
  async #handleAccountTransactionsUpdated(message: SnapMessage): Promise<null> {
    assert(message, AccountTransactionsUpdatedEventStruct);
    const event = message.params;
    return this.#rePublishAccountEvent(
      'SnapKeyring:accountTransactionsUpdated',
      (filter) => {
        event.transactions = filter(event.transactions);
        return [event];
      },
    );
  }

  // ──────────────────────────────────────────────
  // Private helpers
  // ──────────────────────────────────────────────

  /**
   * Re-publish an account event after filtering out accounts that don't
   * belong to this snap.
   *
   * Uses the registry as the source of truth: only accounts present in
   * this snap's registry are forwarded. This prevents a snap from emitting
   * updates for accounts it doesn't own.
   *
   * @param event - The event type to re-publish.
   * @param filteredEventCallback - Callback that receives the filter function
   * and returns the event payload to publish.
   * @template EventType - A Snap keyring event type.
   * @returns `null`.
   */
  async #rePublishAccountEvent<EventType extends SnapKeyringEvents['type']>(
    event: EventType,
    filteredEventCallback: (
      filter: FilterAccountIdFunction,
    ) => ExtractEventPayload<SnapKeyringEvents, EventType>,
  ): Promise<null> {
    const filter: FilterAccountIdFunction = <Entry>(
      accountMapping: Record<AccountId, Entry>,
    ): Record<AccountId, Entry> => {
      return Object.entries(accountMapping).reduce<Record<AccountId, Entry>>(
        (filtered, [accountId, entry]) => {
          if (this.registry.has(accountId)) {
            filtered[accountId] = entry;
          } else {
            console.warn(
              `SnapKeyring - ${event} - Found an unknown account ID "${accountId}" for Snap ID "${this.snapId}". Skipping.`,
            );
          }
          return filtered;
        },
        {},
      );
    };

    this.messenger.publish(event, ...filteredEventCallback(filter));
    return null;
  }

  /**
   * Core logic for the v1 `createAccount` flow.
   *
   * Handles the reserved 'metamask' field, correlation IDs, and internal
   * options registration. The account is ultimately added to the registry
   * via the `AccountCreated` event handler, not the return value.
   *
   * @param options - Account creation options.
   * @param internalOptions - Internal Snap keyring options.
   * @returns The account object returned by the snap.
   */
  async #createSnapAccount(
    options: Record<string, Json>,
    internalOptions?: SnapKeyringInternalOptions,
  ): Promise<KeyringAccount> {
    const reserved = 'metamask';
    if (hasProperty(options, reserved)) {
      throw new Error(
        `The '${reserved}' property is reserved for internal use`,
      );
    }

    if (!internalOptions) {
      return await this.client.createAccount(options);
    }

    const correlationId = uuid();
    this.#options.set(correlationId, internalOptions);

    return await this.client.createAccount({
      ...options,
      metamask: {
        correlationId,
      },
    });
  }

  /**
   * Retrieve and consume internal options for a given correlation ID.
   *
   * NOTE: The options are deleted from the map on retrieval (pop semantics).
   *
   * @param correlationId - Correlation ID associated with the internal options.
   * @returns Internal options if found, `undefined` otherwise.
   */
  #getInternalOptions(
    correlationId: string | undefined,
  ): SnapKeyringInternalOptions | undefined {
    if (!correlationId) {
      return undefined;
    }

    const options = this.#options.get(correlationId);
    if (options) {
      this.#options.delete(correlationId);
      return options;
    }

    console.warn(
      `SnapKeyring - Received unmapped correlation ID: "${correlationId}"`,
    );
    return undefined;
  }

  /**
   * Idempotency check: account already exists in this snap with same address.
   *
   * Protected so that `SnapKeyringV2` can reuse it without duplicating the
   * logic.
   *
   * @param account - The account to check.
   * @returns The existing account if found, `undefined` otherwise.
   */
  protected getExistingAccount(
    account: KeyringAccount,
  ): KeyringAccount | undefined {
    const address = normalizeAccountAddress(account);
    const existing = this.registry.get(account.id);
    if (existing && normalizeAccountAddress(existing) === address) {
      return existing;
    }
    return undefined;
  }

  /**
   * Create a deferred promise for a request and store it.
   *
   * @param requestId - The unique request identifier.
   * @returns The deferred promise.
   */
  #createRequestPromise<Response>(
    requestId: string,
  ): DeferredPromise<Response> {
    const promise = createDeferredPromise<Response>();
    this.#requests.set(requestId, promise);
    return promise;
  }

  /**
   * Handle an async redirect response from the Snap.
   *
   * @param redirect - The redirect information.
   * @param redirect.message - The message to show the user.
   * @param redirect.url - The URL to redirect to.
   */
  async #handleAsyncRedirect(redirect: {
    message?: string;
    url?: string;
  }): Promise<void> {
    const { message = '', url: redirectUrl = '' } = redirect;
    const url = redirectUrl ? sanitizeUrl(redirectUrl) : redirectUrl;
    if (url) {
      this.#validateRedirectUrl(url);
    }
    await this.#callbacks.redirectUser(url, message);
  }

  /**
   * Validates that a redirect URL is in the Snap's allowed origins.
   *
   * @param url - The URL to validate.
   * @throws An error if the URL's origin is not in the Snap's allowed origins.
   */
  #validateRedirectUrl(url: string): void {
    const { origin } = new URL(url);
    const snap = this.messenger.call('SnapController:getSnap', this.snapId);
    if (!snap) {
      throw new Error(`Snap '${this.snapId}' not found.`);
    }
    const allowedOrigins =
      snap.manifest.initialPermissions['endowment:keyring']?.allowedOrigins ??
      [];
    if (!allowedOrigins.includes(origin)) {
      throw new Error(
        `Redirect URL domain '${origin}' is not an allowed origin by snap '${this.snapId}'`,
      );
    }
  }
}
