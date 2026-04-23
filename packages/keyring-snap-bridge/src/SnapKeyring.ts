import type { TypedTransaction } from '@ethereumjs/tx';
import type { TypedDataV1, TypedMessage } from '@metamask/eth-sig-util';
import { SignTypedDataVersion } from '@metamask/eth-sig-util';
import type {
  KeyringAccount,
  KeyringExecutionContext,
  EthBaseTransaction,
  EthBaseUserOperation,
  EthUserOperation,
  EthUserOperationPatch,
  ResolvedAccountAddress,
  CaipChainId,
  CreateAccountOptions,
} from '@metamask/keyring-api';
import { AnyAccountType, KeyringEvent } from '@metamask/keyring-api';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import type { AccountId, JsonRpcRequest } from '@metamask/keyring-utils';
import type { SnapId } from '@metamask/snaps-sdk';
import type { Snap } from '@metamask/snaps-utils';
import type { Json } from '@metamask/utils';
import { Mutex } from 'async-mutex';

import type { SnapKeyringInternalOptions } from './options';
import type { SnapKeyringMessenger } from './SnapKeyringMessenger';
import { SNAP_KEYRING_NAME } from './SnapKeyringMessenger';
import type { AccountMethod } from './SnapKeyringV1';
import type { SnapMessage } from './types';
import { normalizeAccountAddress, throwError, unique } from './util';
import { SnapKeyring as SnapKeyringV2 } from './v2/SnapKeyring';

export const SNAP_KEYRING_TYPE = 'Snap Keyring';

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
 * Keyring bridge implementation to support Snaps.
 */
export class SnapKeyring {
  static type: string = SNAP_KEYRING_TYPE;

  type: string;

  // Name and state are required for modular initialisation.
  name: typeof SNAP_KEYRING_NAME = SNAP_KEYRING_NAME;

  state = null;

  /**
   * Messenger to dispatch requests to the Snaps controller.
   */
  readonly #messenger: SnapKeyringMessenger;

  /**
   * Per-snap keyring instances. Each `SnapKeyringV2` (which extends
   * `SnapKeyringV1`) owns a single `KeyringAccountRegistry` and handles
   * both the event-driven v1 flow and the `KeyringV2` batch interface.
   */
  readonly #snapKeyrings: Map<SnapId, SnapKeyringV2>;

  /**
   * Reverse index from account ID to the owning Snap ID.
   *
   * Populated and kept in sync via the `onRegister` / `onUnregister`
   * callbacks injected into each entry. Enables O(1) routing for
   * any "which snap owns this account?" query.
   */
  readonly #accountIndex: Map<AccountId, SnapId>;

  /**
   * Callbacks used to interact with other components.
   */
  readonly #callbacks: SnapKeyringCallbacks;

  /**
   * Whether to allow the creation and update of generic accounts.
   *
   * Account deletion is not affected by this flag and is always allowed.
   */
  readonly #isAnyAccountTypeAllowed: boolean;

  /**
   * Global mutex that serializes `createAccounts` calls across all snaps.
   *
   * `assertAccountCanBeUsed` checks global state (`#accountIndex` for ID
   * uniqueness, `addressExists` for address uniqueness). Without serialization,
   * two concurrent `createAccounts` calls from different snaps could both pass
   * the uniqueness check before either one calls `setAccount`, leading to
   * duplicate accounts. Injected into each `SnapKeyringV2` via the optional
   * `withLock` callback.
   */
  readonly #lock: Mutex;

  /**
   * Serializes lazy keyring initialization in {@link SnapKeyring.#getOrCreateKeyring}.
   *
   * Kept separate from {@link SnapKeyring.#lock} (which guards `createAccounts`
   * uniqueness checks) to avoid mixing concerns. The lock is held only for the
   * duration of a single keyring's initialization - released before the caller
   * proceeds with its operation.
   */
  readonly #getOrCreateKeyringLock: Mutex;

  /**
   * Create a new Snap keyring.
   *
   * @param options - Constructor options.
   * @param options.messenger - Snap keyring messenger.
   * @param options.callbacks - Callbacks used to interact with other components.
   * @param options.isAnyAccountTypeAllowed - Whether to allow the `AnyAccountType` generic account type.
   * @returns A new Snap keyring.
   */
  constructor({
    messenger,
    callbacks,
    isAnyAccountTypeAllowed = false,
  }: {
    messenger: SnapKeyringMessenger;
    callbacks: SnapKeyringCallbacks;
    isAnyAccountTypeAllowed?: boolean;
  }) {
    this.type = SnapKeyring.type;
    this.#messenger = messenger;
    this.#snapKeyrings = new Map();
    this.#accountIndex = new Map();
    this.#callbacks = callbacks;
    this.#isAnyAccountTypeAllowed = isAnyAccountTypeAllowed;
    this.#lock = new Mutex();
    this.#getOrCreateKeyringLock = new Mutex();
  }

  /**
   * Get the SnapKeyringEntry for a Snap, creating and initializing it if it
   * does not exist yet.
   *
   * When a new keyring is created it is immediately initialized by calling
   * `deserialize({ snapId, accounts: {} })` so that `snapId` and the internal
   * snap client are available before any event handler or method runs.
   *
   * Both v1 and v2 share the same KeyringAccountRegistry instance. The
   * onRegister / onUnregister callbacks keep #accountIndex in sync regardless
   * of which class mutates the registry.
   *
   * @param snapId - Snap ID.
   * @returns The SnapKeyringEntry for the given Snap.
   */
  async #getOrCreateKeyring(snapId: SnapId): Promise<SnapKeyringV2> {
    // Fast path: keyring already exists, no lock needed.
    const existing = this.#snapKeyrings.get(snapId);
    if (existing) {
      return existing;
    }

    return this.#getOrCreateKeyringLock.runExclusive(async () => {
      // Double-check: a concurrent caller may have created the keyring while
      // we were waiting for the lock.
      const keyring = this.#snapKeyrings.get(snapId);
      if (keyring) {
        return keyring;
      }

      const newKeyring = new SnapKeyringV2({
        messenger: this.#messenger,
        isAnyAccountTypeAllowed: this.#isAnyAccountTypeAllowed,
        callbacks: {
          onRegister: (id: AccountId): void => {
            this.#accountIndex.set(id, snapId);
          },
          onUnregister: (id: AccountId): void => {
            this.#accountIndex.delete(id);
          },
          addAccount: async (
            address,
            handleUserInput,
            onceSaved,
            accountNameSuggestion,
            internalOptions,
          ): Promise<void> =>
            this.#callbacks.addAccount(
              address,
              snapId,
              handleUserInput,
              onceSaved,
              accountNameSuggestion,
              internalOptions,
            ),
          removeAccount: async (address, handleUserInput): Promise<void> =>
            this.#callbacks.removeAccount(address, snapId, handleUserInput),
          saveState: async (): Promise<void> => this.#callbacks.saveState(),
          redirectUser: async (url, message): Promise<void> =>
            this.#callbacks.redirectUser(snapId, url, message),
          assertAccountCanBeUsed: async (account): Promise<void> =>
            this.#assertAccountCanBeUsed(account),
          withLock: async <Result>(
            callback: () => Promise<Result>,
          ): Promise<Result> => this.#lock.runExclusive(callback),
        },
      });

      // Initialize the keyring with its snap ID (no accounts yet).
      await newKeyring.deserialize({ snapId, accounts: {} });

      // Keyring is fully initialized; register it before releasing the lock so
      // that no concurrent caller can create a duplicate.
      this.#snapKeyrings.set(snapId, newKeyring);

      return newKeyring;
    });
  }

  /**
   * Drop a per-snap keyring from {@link #snapKeyrings} when it has no accounts.
   *
   * Without this, deleting every account for a Snap would leave an empty
   * `SnapKeyringV2` in the map for the rest of the session (unlike the old
   * `SnapIdMap`, which dropped entries on delete).
   *
   * @param snapId - Snap ID whose keyring may be removed.
   */
  async #removeSnapKeyringIfEmpty(snapId: SnapId): Promise<void> {
    const keyring = this.#snapKeyrings.get(snapId);
    if (keyring?.accounts().length === 0) {
      await keyring.destroy();
      this.#snapKeyrings.delete(snapId);
    }
  }

  /**
   * Asserts that an account can be used within the Snap keyring. (e.g. generic accounts, unique
   * addresses, etc...).
   *
   * @param account - The account to check.
   * @throws If the account cannot be used.
   */
  async #assertAccountCanBeUsed(account: KeyringAccount): Promise<void> {
    const address = normalizeAccountAddress(account);

    // The `AnyAccountType.Account` generic account type is allowed only during
    // development, so we check whether it's allowed before continuing.
    if (
      !this.#isAnyAccountTypeAllowed &&
      account.type === AnyAccountType.Account
    ) {
      throw new Error(`Cannot create generic account '${account.id}'`);
    }

    // A Snap could try to create an account with a different address but with
    // an existing ID, so the above test only is not enough.
    // Account IDs are globally unique across all snaps.
    if (this.#accountIndex.has(account.id)) {
      throw new Error(`Account '${account.id}' already exists`);
    }

    // The UI still uses the account address to identify accounts, so we need
    // to block the creation of duplicate accounts for now to prevent accounts
    // from being overwritten.
    if (await this.#callbacks.addressExists(address)) {
      throw new Error(`Account address '${address}' already exists`);
    }
  }

  /**
   * Handle a message from a Snap.
   *
   * Only `AccountCreated` triggers lazy keyring creation via
   * `#getOrCreateKeyring`, since that is the single entry point for the v1
   * event-driven flow. All other events from unknown snaps throw an error.
   * After handling `AccountCreated`, `#removeSnapKeyringIfEmpty` always runs
   * (via `try/finally`) to clean up if account creation was rejected.
   *
   * @param snapId - ID of the Snap.
   * @param message - Message sent by the Snap.
   * @returns The execution result.
   */
  async handleKeyringSnapMessage(
    snapId: SnapId,
    message: SnapMessage,
  ): Promise<Json> {
    let keyring = this.#snapKeyrings.get(snapId);

    // We can create a new keyring if the message is an AccountCreated event.
    const isAccountCreated =
      message.method === `${KeyringEvent.AccountCreated}`;
    if (!keyring && isAccountCreated) {
      keyring = await this.#getOrCreateKeyring(snapId);
    }

    if (!keyring) {
      throw new Error(
        `SnapKeyring - Received a message for an unknown snap keyring '${snapId}'`,
      );
    }

    try {
      return await keyring.handleKeyringSnapMessage(message);
    } finally {
      // Clean up if AccountCreated was rejected (e.g. duplicate address,
      // invalid account), leaving the snap with no registered accounts.
      if (isAccountCreated) {
        await this.#removeSnapKeyringIfEmpty(snapId);
      }
    }
  }

  /**
   * Serialize the keyring state.
   *
   * Delegates to each per-snap v2 keyring and flattens back into the original
   * external format so that `KeyringController` sees no change.
   *
   * @returns Serialized keyring state.
   */
  async serialize(): Promise<KeyringState> {
    const accounts: KeyringState['accounts'] = {};
    for (const keyring of this.#snapKeyrings.values()) {
      for (const account of keyring.accounts()) {
        accounts[account.id] = { account, snapId: keyring.snapId };
      }
    }
    return { accounts };
  }

  /**
   * Deserialize the keyring state into this keyring.
   *
   * Groups the flat persisted state by `snapId`, clears both indexes, then
   * rebuilds each per-snap entry. The `onRegister` callbacks fired during
   * `v2.deserialize()` automatically repopulate `#accountIndex`.
   *
   * @param state - Serialized keyring state.
   */
  async deserialize(state: KeyringState | undefined): Promise<void> {
    // If the state is undefined, it means that this is a new keyring, so we
    // don't need to do anything.
    if (state === undefined) {
      return;
    }

    // Group flat state by snapId. Migrations and migration logging are handled
    // inside v2.deserialize().
    const bySnap = new Map<SnapId, Record<AccountId, KeyringAccount>>();
    for (const entry of Object.values(state.accounts)) {
      const snapAccounts = bySnap.get(entry.snapId) ?? {};
      snapAccounts[entry.account.id] = entry.account;
      bySnap.set(entry.snapId, snapAccounts);
    }

    // Destroy existing keyrings before clearing — rejects any pending requests.
    for (const keyring of this.#snapKeyrings.values()) {
      await keyring.destroy();
    }

    // Clear both indexes before rebuilding — they must always be consistent.
    this.#snapKeyrings.clear();
    this.#accountIndex.clear();

    // Rebuild per-snap keyrings. Each keyring handles its own validation
    // and migration internally. #getOrCreateKeyring initializes the keyring
    // with an empty state; the second deserialize call loads the real accounts.
    for (const [snapId, accounts] of bySnap) {
      const keyring = await this.#getOrCreateKeyring(snapId);
      await keyring.deserialize({ snapId, accounts });
      // onRegister callbacks fired above have repopulated #accountIndex.
      await this.#removeSnapKeyringIfEmpty(snapId);
    }
  }

  /**
   * Get an account and its associated Snap ID from its ID.
   *
   * @param id - Account ID.
   * @throws An error if the account could not be found.
   * @returns The account associated with the given account ID in this keyring.
   */
  #getAccount(id: string): { account: KeyringAccount; snapId: SnapId } {
    const snapId = this.#accountIndex.get(id);
    const account = snapId
      ? this.#snapKeyrings.get(snapId)?.lookupAccount(id)
      : undefined;

    if (!snapId || !account) {
      throw new Error(`Unable to get account: unknown account ID: '${id}'`);
    }
    return { account, snapId };
  }

  /**
   * Get the addresses of the accounts in this keyring.
   *
   * @returns The addresses of the accounts in this keyring.
   */
  async getAccounts(): Promise<string[]> {
    const addresses: string[] = [];
    for (const keyring of this.#snapKeyrings.values()) {
      for (const account of keyring.accounts()) {
        addresses.push(normalizeAccountAddress(account));
      }
    }
    return unique(addresses);
  }

  /**
   * Get the addresses of the accounts associated with a given Snap.
   *
   * @param snapId - Snap ID to filter by.
   * @returns The addresses of the accounts associated with the given Snap.
   */
  async getAccountsBySnapId(snapId: SnapId): Promise<string[]> {
    return unique(
      (this.#snapKeyrings.get(snapId)?.accounts() ?? []).map(
        normalizeAccountAddress,
      ),
    );
  }

  /**
   * Create an account (v1 event-driven flow).
   *
   * Delegates to the per-snap SnapKeyringV1 instance.
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
    const keyring = await this.#getOrCreateKeyring(snapId);
    return keyring.createAccount(options, internalOptions);
  }

  /**
   * Creates one or more new accounts according to the provided options.
   *
   * Delegates to the per-snap SnapKeyringV2 instance which handles
   * idempotency, validation, batch tracking, state persistence, and rollback.
   *
   * @param snapId - Snap ID to create the account(s) for.
   * @param options - Options describing how to create the account(s).
   * @returns An array of the created account objects.
   */
  async createAccounts(
    snapId: SnapId,
    options: CreateAccountOptions,
  ): Promise<KeyringAccount[]> {
    const keyring = await this.#getOrCreateKeyring(snapId);
    return keyring.createAccounts(options);
  }

  /**
   * Checks if a Snap ID is known from the keyring.
   *
   * @param snapId - Snap ID.
   * @returns `true` if the Snap ID is known, `false` otherwise.
   */
  hasSnapId(snapId: SnapId): boolean {
    const keyring = this.#snapKeyrings.get(snapId);
    return keyring !== undefined && keyring.accounts().length > 0;
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

    const keyring = await this.#getOrCreateKeyring(snapId);
    return keyring.resolveAccountAddress(scope, request);
  }

  /**
   * Submit a request to a Snap from an account ID.
   *
   * This request cannot be an asynchronous keyring request.
   *
   * @param opts - Request options.
   * @param opts.origin - Send origin.
   * @param opts.account - Account ID.
   * @param opts.method - Method to call.
   * @param opts.params - Method parameters.
   * @param opts.scope - Selected chain ID (CAIP-2).
   * @returns Promise that resolves to the result of the method call.
   */
  async submitRequest({
    origin,
    account: accountId,
    method,
    params,
    scope,
  }: {
    origin: string;
    // NOTE: We use `account` here rather than `id` to avoid ambiguity with a "request ID".
    // We already use this same field name for `KeyringAccount`s.
    account: string;
    method: string;
    params?: Json[] | Record<string, Json>;
    scope: string;
  }): Promise<Json> {
    const { account, snapId } = this.#getAccount(accountId);
    /* istanbul ignore next */
    const keyring =
      this.#snapKeyrings.get(snapId) ??
      throwError(`No keyring found for snap '${snapId}'`);

    return await keyring.submitSnapRequest({
      origin,
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
    const { account, keyring } = this.#resolveAddress(address);
    return keyring.signTransaction(account, transaction, _opts);
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
    const { account, keyring } = this.#resolveAddress(address);
    return keyring.signTypedData(account, data, opts);
  }

  /**
   * Sign a message.
   *
   * @param address - Signer's address.
   * @param hash - Data to sign.
   * @returns The signature.
   */
  async signMessage(address: string, hash: any): Promise<string> {
    const { account, keyring } = this.#resolveAddress(address);
    return keyring.signMessage(account, hash);
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
    const { account, keyring } = this.#resolveAddress(address);
    return keyring.signPersonalMessage(account, data);
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
    const { account, keyring } = this.#resolveAddress(address);
    return keyring.prepareUserOperation(account, transactions, context);
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
    const { account, keyring } = this.#resolveAddress(address);
    return keyring.patchUserOperation(account, userOp, context);
  }

  /**
   * Signs a UserOperation.
   *
   * @param address - Address of the sender.
   * @param userOp - UserOperation to sign.
   * @param context - Keyring execution context.
   * @returns The signature of the UserOperation.
   */
  async signUserOperation(
    address: string,
    userOp: EthUserOperation,
    context: KeyringExecutionContext,
  ): Promise<string> {
    const { account, keyring } = this.#resolveAddress(address);
    return keyring.signUserOperation(account, userOp, context);
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
   * Delegates to the per-snap SnapKeyringV2 keyring which handles
   * registry removal, index cleanup, and snap communication.
   *
   * @param address - Address of the account to remove.
   */
  async removeAccount(address: string): Promise<void> {
    const { account, keyring } = this.#resolveAddress(address);
    await keyring.deleteAccount(account.id);
    await this.#removeSnapKeyringIfEmpty(keyring.snapId);
  }

  /**
   * Resolve an address to an account and its owning keyring entry.
   *
   * @param address - Address of the account to resolve.
   * @returns Account and the per-snap keyring that owns it. Throws if not
   * found.
   */
  #resolveAddress(address: string): {
    account: KeyringAccount;
    keyring: SnapKeyringV2;
  } {
    for (const keyring of this.#snapKeyrings.values()) {
      const account = keyring.lookupByAddress(address);
      if (account) {
        return { account, keyring };
      }
    }
    return throwError(`Account '${address}' not found`);
  }

  /**
   * Set the selected accounts.
   *
   * Distributes the global list by snap and forwards to each v1 instance.
   *
   * @param accounts - The accounts to set as selected.
   */
  async setSelectedAccounts(accounts: AccountId[]): Promise<void> {
    // Build per-snap distribution using the account index.
    const bySnap = new Map<SnapId, AccountId[]>();
    for (const accountId of accounts) {
      const snapId = this.#accountIndex.get(accountId);
      if (!snapId) {
        continue;
      }
      const snapAccounts = bySnap.get(snapId) ?? [];
      snapAccounts.push(accountId);
      bySnap.set(snapId, snapAccounts);
    }

    await Promise.all(
      [...this.#snapKeyrings.entries()].map(async ([snapId, keyring]) =>
        keyring.setSelectedAccounts(
          /* istanbul ignore next */
          bySnap.get(snapId) ?? [],
        ),
      ),
    );
  }

  /**
   * Get the Snap associated with the given Snap ID.
   *
   * @param snapId - Snap ID.
   * @returns The Snap or undefined if the Snap cannot be found.
   */
  #getSnap(snapId: SnapId): Snap | null {
    return this.#messenger.call('SnapController:getSnap', snapId);
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

  #transformToInternalAccount(
    account: KeyringAccount,
    snapId: SnapId,
  ): InternalAccount {
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
  }

  /**
   * Return an internal account object for a given address.
   *
   * @param address - Address of the account to return.
   * @returns An internal account object for the given address.
   */
  getAccountByAddress(address: string): InternalAccount | undefined {
    for (const [snapId, keyring] of this.#snapKeyrings) {
      const account = keyring.lookupByAddress(address);
      if (account) {
        return this.#transformToInternalAccount(account, snapId);
      }
    }
    return undefined;
  }

  /**
   * List all Snap keyring accounts.
   * This method is expensive on mobile devices and could takes tens or hundreds of milliseconds to complete.
   * Use with caution.
   *
   * @returns An array containing all Snap keyring accounts.
   */
  listAccounts(): InternalAccount[] {
    const accounts: InternalAccount[] = [];
    for (const [snapId, keyring] of this.#snapKeyrings) {
      for (const account of keyring.accounts()) {
        accounts.push(this.#transformToInternalAccount(account, snapId));
      }
    }
    return accounts;
  }
}
