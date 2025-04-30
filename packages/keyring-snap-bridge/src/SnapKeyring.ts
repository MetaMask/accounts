/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
// This rule seems to be triggering a false positive. Possibly eslint is not
// inferring the `EthMethod`, `BtcMethod`, and `InternalAccount` types correctly.

import type { TypedTransaction } from '@ethereumjs/tx';
import { TransactionFactory } from '@ethereumjs/tx';
import type { ExtractEventPayload } from '@metamask/base-controller';
import type { TypedDataV1, TypedMessage } from '@metamask/eth-sig-util';
import { SignTypedDataVersion } from '@metamask/eth-sig-util';
import {
  EthBytesStruct,
  EthMethod,
  EthBaseUserOperationStruct,
  EthUserOperationPatchStruct,
  isEvmAccountType,
  KeyringEvent,
  AccountAssetListUpdatedEventStruct,
  AccountBalancesUpdatedEventStruct,
  AccountTransactionsUpdatedEventStruct,
  LogEventStruct,
} from '@metamask/keyring-api';
import type {
  KeyringAccount,
  KeyringExecutionContext,
  BtcMethod,
  EthBaseTransaction,
  EthBaseUserOperation,
  EthUserOperation,
  EthUserOperationPatch,
  ResolvedAccountAddress,
  CaipChainId,
  MetaMaskOptions,
} from '@metamask/keyring-api';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import { KeyringInternalSnapClient } from '@metamask/keyring-internal-snap-client';
import type { AccountId, JsonRpcRequest } from '@metamask/keyring-utils';
import { strictMask } from '@metamask/keyring-utils';
import type { SnapId } from '@metamask/snaps-sdk';
import { type Snap } from '@metamask/snaps-utils';
import { assert, mask, object, string } from '@metamask/superstruct';
import type { Hex, Json } from '@metamask/utils';
import {
  bigIntToHex,
  hasProperty,
  KnownCaipNamespace,
  toCaipChainId,
} from '@metamask/utils';
import { EventEmitter } from 'events';
import { v4 as uuid } from 'uuid';

import { transformAccount } from './account';
import { DeferredPromise } from './DeferredPromise';
import {
  AccountCreatedEventStruct,
  AccountUpdatedEventStruct,
  AccountDeletedEventStruct,
  RequestApprovedEventStruct,
  RequestRejectedEventStruct,
} from './events';
import { projectLogger as log } from './logger';
import { isAccountV1, migrateAccountV1 } from './migrations';
import {
  getInternalOptionsOf,
  type SnapKeyringInternalOptions,
} from './options';
import { SnapIdMap } from './SnapIdMap';
import type {
  SnapKeyringEvents,
  SnapKeyringMessenger,
} from './SnapKeyringMessenger';
import type { SnapMessage } from './types';
import { SnapMessageStruct } from './types';
import {
  equalsIgnoreCase,
  sanitizeUrl,
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
    onceSaved: Promise<AccountId>,
    accountNameSuggestion?: string,
    internalOptions?: SnapKeyringInternalOptions,
  ): Promise<void>;

  removeAccount(
    address: string,
    snapId: SnapId,
    handleUserInput: (accepted: boolean) => Promise<void>,
  ): Promise<void>;

  redirectUser(snapId: SnapId, url: string, message: string): Promise<void>;
};

/**
 * Callback type to filter unknown account ID from a mapping account ID mapping.
 */
type FilterAccountIdFunction = <Entry>(
  accountMapping: Record<AccountId, Entry>,
) => Record<AccountId, Entry>;

/**
 * Normalize account's address.
 *
 * @param account - The account.
 * @returns The normalized account address.
 */
function normalizeAccountAddress(account: KeyringAccount): string {
  // FIXME: Is it required to lowercase the address here? For now we'll keep this behavior
  // only for Ethereum addresses and use the original address for other non-EVM accounts.
  // For example, Solana addresses are case-sensitives.
  return isEvmAccountType(account.type)
    ? account.address.toLowerCase()
    : account.address;
}

/**
 * Keyring bridge implementation to support Snaps.
 */
export class SnapKeyring extends EventEmitter {
  static type: string = SNAP_KEYRING_TYPE;

  type: string;

  /**
   * Messenger to dispatch requests to the Snaps controller.
   */
  readonly #messenger: SnapKeyringMessenger;

  /**
   * Client used to call the Snap keyring.
   */
  readonly #snapClient: KeyringInternalSnapClient;

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
  readonly #requests: SnapIdMap<{
    promise: DeferredPromise<any>;
    snapId: SnapId;
  }>;

  /**
   * Mapping between internal options, a correlation ID and a Snap ID.
   */
  readonly #options: SnapIdMap<{
    options: SnapKeyringInternalOptions;
    snapId: SnapId;
    // TODO: Add TTL to avoid having too many "leaking" internal options.
  }>;

  /**
   * Callbacks used to interact with other components.
   */
  readonly #callbacks: SnapKeyringCallbacks;

  /**
   * Create a new Snap keyring.
   *
   * @param messenger - Snap keyring messenger.
   * @param callbacks - Callbacks used to interact with other components.
   * @returns A new Snap keyring.
   */
  constructor(
    messenger: SnapKeyringMessenger,
    callbacks: SnapKeyringCallbacks,
  ) {
    super();
    this.type = SnapKeyring.type;
    this.#messenger = messenger;
    this.#snapClient = new KeyringInternalSnapClient({ messenger });
    this.#requests = new SnapIdMap();
    this.#accounts = new SnapIdMap();
    this.#options = new SnapIdMap();
    this.#callbacks = callbacks;
  }

  /**
   * Get internal options given a correlation ID.
   *
   * NOTE: The associated options will be deleted automatically.
   *
   * @param snapId - Snap ID
   * @param correlationId - Correlation ID associated with the internal options.
   * @returns Internal options if found, `undefined` otherwise.
   */
  #getInternalOptions(
    snapId: SnapId,
    correlationId: string | undefined,
  ): SnapKeyringInternalOptions | undefined {
    if (correlationId) {
      // We still need to check if the correlation ID is valid and associated to
      // some internal options.
      //
      // NOTE: `found` will be `undefined` if a Snap tried to use a correlation ID that
      // belongs to another Snap ID. However, if a Snap starts 2 parallel flow (which
      // will results in 2 different correlation IDs), we won't be able to prevent
      // the Snap from swapping/mixing up those correlation IDs he owns.
      const found = this.#options.pop(snapId, correlationId);

      if (found) {
        return found.options;
      }

      console.warn(
        `SnapKeyring - Received unmapped correlation ID: "${correlationId}"`,
      );
    }

    return undefined;
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
    const {
      metamask, // Used for internal options.
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

    // The UI still uses the account address to identify accounts, so we need
    // to block the creation of duplicate accounts for now to prevent accounts
    // from being overwritten.
    const address = normalizeAccountAddress(account);
    if (await this.#callbacks.addressExists(address)) {
      throw new Error(`Account address '${address}' already exists`);
    }

    // A Snap could try to create an account with a different address but with
    // an existing ID, so the above test only is not enough.
    if (this.#accounts.has(snapId, account.id)) {
      throw new Error(`Account '${account.id}' already exists`);
    }

    // A deferred promise that will be resolved once the Snap keyring has saved
    // its internal state.
    // This part of the flow is run asynchronously, so we have no other way of
    // letting the MetaMask client that this "save" has been run.
    // NOTE: Another way of fixing that could be to rely on events through the
    // messenger maybe?
    const onceSaved = new DeferredPromise<AccountId>();

    // Add the account to the keyring, but wait for the MetaMask client to
    // approve the account creation first.
    await this.#callbacks.addAccount(
      address,
      snapId,
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
          this.#accounts.set(account.id, { account, snapId });

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
            .catch(async (error) => {
              // FIXME: There's a potential race condition here, if the Snap did
              // not persist the account yet (this should mostly be for older Snaps).
              await this.#deleteAccount(snapId, account);

              // This allows the MetaMask client to be "notified" that something went
              // wrong with the Snap keyring. (e.g. useful to display account creation
              // error dialogs).
              onceSaved.reject(error);
            });
        }
      },
      onceSaved.promise,
      accountNameSuggestion,
      getInternalOptionsOf([
        // 1. We use the internal options from the Snap keyring.
        this.#getInternalOptions(snapId, metamask?.correlationId) ?? {},
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
    const { account: newAccountFromEvent } = message.params;
    const { account: oldAccount } =
      this.#accounts.get(snapId, newAccountFromEvent.id) ??
      throwError(`Account '${newAccountFromEvent.id}' not found`);

    // Potentially migrate the account.
    const newAccount = transformAccount(newAccountFromEvent);

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
    const { account } = entry;

    await this.#callbacks.removeAccount(
      normalizeAccountAddress(account),
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
   * Re-publish an account event.
   *
   * @param snapId - Snap ID.
   * @param event - The event type. This is a unique identifier for this event.
   * @param filteredEventCallback - A callback that returns the event to re-publish. This callback takes a filtering
   * function as parameter that can be used to filter out account ID that do not belong to this Snap ID.
   * @template EventType - A Snap keyring event type.
   * @returns `null`.
   */
  async #rePublishAccountEvent<EventType extends SnapKeyringEvents['type']>(
    snapId: SnapId,
    event: EventType,
    filteredEventCallback: (
      filter: FilterAccountIdFunction,
    ) => ExtractEventPayload<SnapKeyringEvents, EventType>,
  ): Promise<null> {
    // This callback can be used to filter out the accounts that no longer exists on the Snap (fail-safe) or to
    // prevent other Snaps from updating accounts they do not own.
    const filter: FilterAccountIdFunction = <Entry>(
      accountMapping: Record<AccountId, Entry>,
    ): Record<AccountId, Entry> => {
      return Object.entries(accountMapping).reduce<Record<AccountId, Entry>>(
        (filtered, [accountId, entry]) => {
          if (this.#accounts.has(snapId, accountId)) {
            // If the Snap owns this account, we can use it.
            filtered[accountId] = entry;
          } else {
            // Otherwise, we just filter it out and log it (for debugging/tracking purposes).
            console.warn(
              `SnapKeyring - ${event} - Found an unknown account ID "${accountId}" for Snap ID "${snapId}". Skipping.`,
            );
          }

          return filtered;
        },
        {},
      );
    };

    this.#messenger.publish(event, ...filteredEventCallback(filter));
    return null;
  }

  /**
   * Handle a balances updated event from a Snap.
   *
   * @param snapId - ID of the Snap.
   * @param message - Event message.
   * @returns `null`.
   */
  async #handleAccountBalancesUpdated(
    snapId: SnapId,
    message: SnapMessage,
  ): Promise<null> {
    assert(message, AccountBalancesUpdatedEventStruct);

    const event = message.params;
    return this.#rePublishAccountEvent(
      snapId,
      'SnapKeyring:accountBalancesUpdated',
      (filter) => {
        event.balances = filter(event.balances);
        return [event];
      },
    );
  }

  /**
   * Handle a asset list updated event from a Snap.
   *
   * @param snapId - ID of the Snap.
   * @param message - Event message.
   * @returns `null`.
   */
  async #handleAccountAssetListUpdated(
    snapId: SnapId,
    message: SnapMessage,
  ): Promise<null> {
    assert(message, AccountAssetListUpdatedEventStruct);

    const event = message.params;
    return this.#rePublishAccountEvent(
      snapId,
      'SnapKeyring:accountAssetListUpdated',
      (filter) => {
        event.assets = filter(event.assets);
        return [event];
      },
    );
  }

  /**
   * Handle a transactions updated event from a Snap.
   *
   * @param snapId - ID of the Snap.
   * @param message - Event message.
   * @returns `null`.
   */
  async #handleAccountTransactionsUpdated(
    snapId: SnapId,
    message: SnapMessage,
  ): Promise<null> {
    assert(message, AccountTransactionsUpdatedEventStruct);

    const event = message.params;
    return this.#rePublishAccountEvent(
      snapId,
      'SnapKeyring:accountTransactionsUpdated',
      (filter) => {
        event.transactions = filter(event.transactions);
        return [event];
      },
    );
  }

  /**
   * Handle a log event from a Snap.
   *
   * @param snapId - ID of the Snap.
   * @param message - Event message.
   * @returns `null`.
   */
  async #handleLog(snapId: SnapId, message: SnapMessage): Promise<null> {
    assert(message, LogEventStruct);

    const event = message.params;
    console.log(snapId, event.log);
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
      case `${KeyringEvent.AccountCreated}`: {
        return this.#handleAccountCreated(snapId, message);
      }

      case `${KeyringEvent.AccountUpdated}`: {
        return this.#handleAccountUpdated(snapId, message);
      }

      case `${KeyringEvent.AccountDeleted}`: {
        return this.#handleAccountDeleted(snapId, message);
      }

      case `${KeyringEvent.RequestApproved}`: {
        return this.#handleRequestApproved(snapId, message);
      }

      case `${KeyringEvent.RequestRejected}`: {
        return this.#handleRequestRejected(snapId, message);
      }

      // Assets related events:
      case `${KeyringEvent.AccountBalancesUpdated}`: {
        return this.#handleAccountBalancesUpdated(snapId, message);
      }

      case `${KeyringEvent.AccountAssetListUpdated}`: {
        return this.#handleAccountAssetListUpdated(snapId, message);
      }

      case `${KeyringEvent.AccountTransactionsUpdated}`: {
        return this.#handleAccountTransactionsUpdated(snapId, message);
      }

      case `${KeyringEvent.Log}`: {
        return this.#handleLog(snapId, message);
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

    // Running Snap keyring migrations. We might have some accounts that have a
    // different "version" than the one we expect.
    // In this case, we "transform" then directly when deserializing to convert
    // them in the final account version.
    const accounts: KeyringState['accounts'] = {};
    for (const [snapId, entry] of Object.entries(state.accounts)) {
      // V1 accounts are missing the scopes.
      if (isAccountV1(entry.account)) {
        console.info(
          `SnapKeyring - Found a KeyringAccountV1, migrating to V2: ${entry.account.id}`,
        );
        accounts[snapId] = {
          ...entry,
          account: migrateAccountV1(entry.account),
        };
      } else {
        accounts[snapId] = entry;
      }
    }

    this.#accounts = SnapIdMap.fromObject(accounts);
  }

  /**
   * Get an account and its associated Snap ID from its ID.
   *
   * @param id - Account ID.
   * @throws An error if the account could not be found.
   * @returns The account associated with the given account ID in this keyring.
   */
  #getAccount(id: string): { account: KeyringAccount; snapId: SnapId } {
    const found = [...this.#accounts.values()].find(
      (entry) => entry.account.id === id,
    );

    if (!found) {
      throw new Error(`Unable to get account: unknown account ID: '${id}'`);
    }
    return found;
  }

  /**
   * Get the addresses of the accounts in this keyring.
   *
   * @returns The addresses of the accounts in this keyring.
   */
  async getAccounts(): Promise<string[]> {
    return unique(
      [...this.#accounts.values()].map(({ account }) =>
        normalizeAccountAddress(account),
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
        .map(({ account }) => normalizeAccountAddress(account)),
    );
  }

  /**
   * Create an account.
   *
   * @param snapId - Snap ID to create the account for.
   * @param options - Account creation options. Differs between keyrings.
   * @param internalOptions - Internal Snap keyring options.
   * @returns The account object.
   */
  async createAccount(
    snapId: SnapId,
    options: Record<string, Json>,
    internalOptions?: SnapKeyringInternalOptions,
  ): Promise<KeyringAccount> {
    const client = new KeyringInternalSnapClient({
      messenger: this.#messenger,
      snapId,
    });

    // The 'metamask' field is reserved, so we have to prevent use of it on
    // the "normal options".
    const reserved = 'metamask';
    if (hasProperty(options, reserved)) {
      throw new Error(
        `The '${reserved}' property is reserved for internal use`,
      );
    }

    // Those internal options are optional. If not set, we avoid registering anything
    // to internal map (to avoid holding resources for nothing). In this case, it's
    // just a normal `keyring_createAccount`.
    if (!internalOptions) {
      return await client.createAccount(options);
    }

    // A unique ID to identify this execution flow which allows to associate the
    // internal options and the current `keyring_createAccount` flow for that Snap.
    const correlationId = uuid();

    // Register those internal options to use them during the `keyring_createAccount`
    // flow.
    this.#options.set(correlationId, {
      snapId,
      options: internalOptions,
    });

    return await client.createAccount({
      ...options,
      // Create internal options context.
      // NOTE: Those options HAVE TO be re-emitted during the `notify:accountCreated` event.
      ...({
        metamask: {
          correlationId,
        },
      } as MetaMaskOptions),
    });
  }

  /**
   * Checks if a Snap ID is known from the keyring.
   *
   * @param snapId - Snap ID.
   * @returns `true` if the Snap ID is known, `false` otherwise.
   */
  hasSnapId(snapId: SnapId): boolean {
    return this.#accounts.hasSnapId(snapId);
  }

  /**
   * Resolve the Snap account's address associated from a signing request.
   *
   * @param snapId - Snap ID.
   * @param scope - CAIP-2 chain ID.
   * @param request - Signing request object.
   * @throws An error if the Snap ID is not known from the keyring.
   * @returns The resolved address if found, `null` otherwise.
   */
  async resolveAccountAddress(
    snapId: SnapId,
    scope: CaipChainId,
    request: JsonRpcRequest,
  ): Promise<ResolvedAccountAddress | null> {
    // We do check that the incoming Snap ID is known by the keyring.
    if (!this.hasSnapId(snapId)) {
      throw new Error(
        `Unable to resolve account address: unknown Snap ID: ${snapId}`,
      );
    }

    return await this.#snapClient
      .withSnapId(snapId)
      .resolveAccountAddress(scope, request);
  }

  /**
   * Submit a request to a Snap from an account ID.
   *
   * This request cannot be an asynchronous keyring request.
   *
   * @param opts - Request options.
   * @param opts.account - Account ID.
   * @param opts.method - Method to call.
   * @param opts.params - Method parameters.
   * @param opts.scope - Selected chain ID (CAIP-2).
   * @returns Promise that resolves to the result of the method call.
   */
  async submitRequest({
    account: accountId,
    method,
    params,
    scope,
  }: {
    // NOTE: We use `account` here rather than `id` to avoid ambiguity with a "request ID".
    // We already use this same field name for `KeyringAccount`s.
    account: string;
    method: string;
    params?: Json[] | Record<string, Json>;
    scope: string;
  }): Promise<Json> {
    const { account, snapId } = this.#getAccount(accountId);

    return await this.#submitSnapRequest({
      snapId,
      account,
      method: method as AccountMethod,
      params,
      scope,
      // For non-EVM (in the context of the multichain API and SIP-26), we enforce responses
      // to be synchronous.
      noPending: true,
    });
  }

  /**
   * Submit a request to a Snap from an account address.
   *
   * @param opts - Request options.
   * @param opts.address - Account address.
   * @param opts.method - Method to call.
   * @param opts.params - Method parameters.
   * @param opts.scope - Selected chain ID (CAIP-2).
   * @param opts.noPending - Whether the response is allowed to be pending.
   * @returns Promise that resolves to the result of the method call.
   */
  async #submitRequest<Response extends Json>({
    address,
    method,
    params,
    scope = '',
    noPending = false,
  }: {
    address: string;
    method: string;
    params?: Json[] | Record<string, Json>;
    scope?: string;
    noPending?: boolean;
  }): Promise<Response> {
    const { account, snapId } = this.#resolveAddress(address);

    return await this.#submitSnapRequest<Response>({
      snapId,
      account,
      method: method as AccountMethod,
      params,
      scope,
      noPending,
    });
  }

  /**
   * Submits a request to a Snap.
   *
   * @param options - The options for the Snap request.
   * @param options.snapId - The Snap ID to submit the request to.
   * @param options.account - The account to use for the request.
   * @param options.method - The Ethereum method to call.
   * @param options.params - The parameters to pass to the method, can be undefined.
   * @param options.scope - The chain ID to use for the request, can be an empty string.
   * @param options.noPending - Whether the response is allowed to be pending.
   * @returns A promise that resolves to the keyring response from the Snap.
   * @throws An error if the Snap fails to respond or if there's an issue with the request submission.
   */
  async #submitSnapRequest<Response extends Json>({
    snapId,
    account,
    method,
    params,
    scope,
    noPending,
  }: {
    snapId: SnapId;
    account: KeyringAccount;
    method: AccountMethod;
    params?: Json[] | Record<string, Json> | undefined;
    scope: string;
    noPending: boolean;
  }): Promise<Response> {
    if (!this.#hasMethod(account, method)) {
      throw new Error(
        `Method '${method}' not supported for account ${account.address}`,
      );
    }

    // Generate a new random request ID to keep track of the request execution flow.
    const requestId = uuid();

    // Create the promise before calling the Snap to prevent a race condition
    // where the Snap responds before we have a chance to create it.
    const requestPromise = this.#createRequestPromise<Response>(
      requestId,
      snapId,
    );

    try {
      const request = {
        id: requestId,
        scope,
        account: account.id,
        request: {
          method,
          ...(params !== undefined && { params }),
        },
      };

      log('Submit Snap request: ', request);

      const response = await this.#snapClient
        .withSnapId(snapId)
        .submitRequest(request);

      // Some methods, like the ones used to prepare and patch user operations,
      // require the Snap to answer synchronously in order to work with the
      // confirmation flow. This check lets the caller enforce this behavior.
      if (noPending && response.pending) {
        throw new Error(
          `Request '${requestId}' to Snap '${snapId}' is pending and noPending is true.`,
        );
      }

      // If the Snap answers synchronously, the promise must be removed from the
      // map to prevent a leak.
      if (!response.pending) {
        return this.#handleSyncResponse<Response>(response, requestId, snapId);
      }

      // If the Snap answers asynchronously, we will inform the user with a redirect
      if (response.redirect?.message || response.redirect?.url) {
        await this.#handleAsyncResponse(response.redirect, snapId);
      }

      return requestPromise.promise;
    } catch (error) {
      log('Snap Request failed: ', { requestId });

      // If the Snap failed to respond, delete the promise to prevent a leak.
      this.#clearRequestPromise(requestId, snapId);
      throw error;
    }
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
   * Clear a promise for a request and delete it from the map of requests.
   *
   * @param requestId - The unique identifier for the request.
   * @param snapId - The Snap ID associated with the request.
   */
  #clearRequestPromise(requestId: string, snapId: SnapId): void {
    this.#requests.delete(snapId, requestId);
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
  #handleSyncResponse<Response extends Json>(
    response: { pending: false; result: Json },
    requestId: string,
    snapId: SnapId,
  ): Response {
    this.#requests.delete(snapId, requestId);
    // We consider `Response` to be compatible with `result` here.
    return response.result as Response;
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
  ): Promise<void> {
    const { message = '', url: redirectUrl = '' } = redirect;
    const url = this.#sanitizeRedirectUrl(redirectUrl);
    if (url) {
      this.#validateRedirectUrl(url, snapId);
    }
    await this.#callbacks.redirectUser(snapId, url, message);
  }

  /**
   * Sanitize a redirect URL.
   *
   * @param url - The URL to sanitize.
   * @returns The new sanitized redirect URL.
   */
  #sanitizeRedirectUrl(url: string): string {
    // We do check if the URL is empty or not since the Snap might not returns any URL at all.
    return url ? sanitizeUrl(url) : url;
  }

  /**
   * Validates if the redirect URL is in the Snap's allowed origins.
   *
   * @param url - The URL to validate.
   * @param snapId - The Snap ID to check allowed origins for.
   * @throws An error if the URL's origin is not in the Snap's allowed origins.
   */
  #validateRedirectUrl(url: string, snapId: SnapId): void {
    const { origin } = new URL(url);
    const snap = this.#getSnap(snapId);
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
   * @returns A promise that resolves to the signed transaction.
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
      scope: toCaipChainId(KnownCaipNamespace.Eip155, `${chainId}`),
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
              scope: toCaipChainId(KnownCaipNamespace.Eip155, `${chainId}`),
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
        noPending: true,
        // We assume the chain ID is already well formatted
        scope: toCaipChainId(KnownCaipNamespace.Eip155, context.chainId),
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
        noPending: true,
        // We assume the chain ID is already well formatted
        scope: toCaipChainId(KnownCaipNamespace.Eip155, context.chainId),
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
        scope: toCaipChainId(KnownCaipNamespace.Eip155, context.chainId),
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

    await this.#deleteAccount(snapId, account);
  }

  /**
   * Removes an account.
   *
   * @param snapId - Snap ID.
   * @param account - Account to delete.
   */
  async #deleteAccount(snapId: SnapId, account: KeyringAccount): Promise<void> {
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
        `Account '${account.address}' may not have been removed from snap '${snapId}':`,
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
   * Get the Snap associated with the given Snap ID.
   *
   * @param snapId - Snap ID.
   * @returns The Snap or undefined if the Snap cannot be found.
   */
  #getSnap(snapId: SnapId): Snap | undefined {
    return this.#messenger.call('SnapController:get', snapId);
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
    const snap = this.#getSnap(snapId);
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
        //
        // NOTE: We convert the address only for EVM accounts, see
        // `normalizeAccountAddress`.
        address: normalizeAccountAddress(account),
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
