import type { KeyringAccount } from '@metamask/keyring-api';
import { KeyringAccountStruct } from '@metamask/keyring-api';
import type {
  CreateAccountOptions,
  Keyring,
  KeyringCapabilities,
} from '@metamask/keyring-api/v2';
import { KeyringType } from '@metamask/keyring-api/v2';
import { KeyringInternalSnapClient } from '@metamask/keyring-internal-snap-client/v2';
import { KeyringAccountRegistry } from '@metamask/keyring-sdk';
import type { AccountId } from '@metamask/keyring-utils';
import type { SnapId } from '@metamask/snaps-sdk';
import type { Infer } from '@metamask/superstruct';
import { assert, object, record, string, union } from '@metamask/superstruct';
import type { Json } from '@metamask/utils';
import { Mutex } from 'async-mutex';

import {
  KeyringAccountV1Struct,
  normalizeAccount,
  normalizeAccountAddress,
  transformAccount,
} from '../account';
import { isAccountV1, migrateAccountV1 } from '../migrations';
import type { SnapKeyringMessenger } from '../SnapKeyringMessenger';
import { SnapKeyringV1 } from '../SnapKeyringV1';
import type { AccountMethod, SnapKeyringV1Callbacks } from '../SnapKeyringV1';
import { equalsIgnoreCase } from '../util';

/**
 * Default, empty capabilities used until the snap manifest is read on
 * `deserialize`. Typed (no cast) so that adding a new required
 * `KeyringCapabilities` field surfaces here as a compile error.
 */
export const EMPTY_CAPABILITIES: KeyringCapabilities = Object.freeze({
  scopes: [],
});

/**
 * Superstruct schema for {@link SnapKeyringState}.
 *
 * Accepts both v1 accounts (missing `scopes`) and v2 accounts so that
 * persisted state can be validated before migration.
 */
export const SnapKeyringStateStruct = object({
  snapId: string(),
  accounts: record(
    string(),
    union([KeyringAccountStruct, KeyringAccountV1Struct]),
  ),
});

/**
 * Serialized state of a single SnapKeyring instance.
 *
 * Note: this is an internal format only used between SnapKeyring and its
 * parent SnapKeyring. The external KeyringState format (flat `{ account,
 * snapId }` map) is preserved by SnapKeyring.serialize / deserialize.
 *
 * Inferred from {@link SnapKeyringStateStruct}: `snapId` is `string`
 * (not the branded `SnapId`) so the shape stays JSON-compatible without
 * unsafe casts.
 */
export type SnapKeyringState = Infer<typeof SnapKeyringStateStruct>;

/**
 * Callbacks injected by the parent `SnapKeyring` for global coordination.
 */
export type SnapKeyringCallbacks = SnapKeyringV1Callbacks & {
  /**
   * Run a callback under a global lock to prevent TOCTOU races in
   * `createAccounts` when multiple snaps call `assertAccountCanBeUsed`
   * concurrently.
   *
   * Optional: if omitted, `SnapKeyringV2` falls back to its own per-instance
   * `Mutex`, which is sufficient when the keyring is used standalone.
   */
  withLock?: <Result>(callback: () => Promise<Result>) => Promise<Result>;
};

type SnapKeyringOptions = {
  messenger: SnapKeyringMessenger;
  callbacks: SnapKeyringCallbacks;
  isAnyAccountTypeAllowed?: boolean;
};

/**
 * Holds the v2 snap client once a {@link SnapKeyring} instance has been bound
 * via {@link SnapKeyring.bindSnapId}.
 */
type SnapKeyringContext = {
  snapId: SnapId;
  client: KeyringInternalSnapClient;
};

/**
 * Checks if a given keyring is a Snap keyring (v2).
 *
 * @param keyring - The keyring to check.
 * @returns `true` if the keyring is a Snap keyring (v2), `false` otherwise.
 */
export function isSnapKeyring(keyring: Keyring): keyring is SnapKeyring {
  return keyring.type === KeyringType.Snap;
}

/**
 * Per-snap keyring that implements `Keyring` (v2).
 *
 * Owns the account registry and messenger. For v1 snaps (those that do not
 * declare `endowment:keyring` capabilities in their manifest), a
 * {@link SnapKeyringV1} instance is created on `deserialize` and held under
 * {@link SnapKeyring.v1}. V2 snaps have `v1 === undefined` and communicate
 * directly through the v2 client without the `{ pending, result }` envelope.
 */
export class SnapKeyring implements Keyring {
  /** Account registry — shared by reference with the v1 instance when present. */
  readonly #registry: KeyringAccountRegistry;

  /** Messenger for snap controller calls and event publishing. */
  readonly #messenger: SnapKeyringMessenger;

  readonly #callbacks: SnapKeyringCallbacks;

  readonly #isAnyAccountTypeAllowed: boolean;

  /**
   * Mutex that serializes `createAccounts` calls on this snap instance.
   * Owned here so that each `SnapKeyring` is fully self-contained.
   */
  readonly #lock: Mutex;

  /** V2 snap client. Set via {@link bindSnapId}. */
  #context: SnapKeyringContext | undefined;

  /**
   * V1 instance, present only when the snap does not declare v2 capabilities.
   * Created on `deserialize()` after reading the snap manifest.
   */
  #v1: SnapKeyringV1 | undefined;

  // ──────────────────────────────────────────────
  // Keyring properties
  // ──────────────────────────────────────────────

  readonly type = `${KeyringType.Snap}` as const;

  static readonly type = `${KeyringType.Snap}` as const;

  /**
   * Capabilities are snap-specific. Initialized empty and can be updated
   * by the parent when snap metadata becomes available.
   */
  capabilities: KeyringCapabilities;

  constructor({
    messenger,
    callbacks,
    isAnyAccountTypeAllowed = false,
  }: SnapKeyringOptions) {
    this.#registry = new KeyringAccountRegistry();
    this.#messenger = messenger;
    this.#callbacks = callbacks;
    this.#isAnyAccountTypeAllowed = isAnyAccountTypeAllowed;
    this.#lock = new Mutex();

    // Default capabilities; replaced from the snap manifest on `deserialize`.
    this.capabilities = EMPTY_CAPABILITIES;
  }

  /**
   * Gets the v1 instance for this snap, or `undefined` if the snap is v2-only.
   *
   * @returns The v1 instance, or `undefined` if the snap is v2-only.
   *
   * Use this to make v1 calls explicit:
   * ```ts
   * keyring.v1?.signTransaction(account, tx);
   * ```
   */
  get v1(): SnapKeyringV1 | undefined {
    return this.#v1;
  }

  /**
   * The snap ID this instance is scoped to.
   *
   * @returns The snap ID.
   * @throws If the keyring has not been initialized yet.
   */
  get snapId(): SnapId {
    /* istanbul ignore next */
    if (this.#context === undefined) {
      throw new Error(
        'SnapKeyring has not been initialized: call deserialize() first',
      );
    }
    return this.#context.snapId;
  }

  /**
   * Bind this keyring to a snap ID and initialize the v2 client.
   *
   * Idempotent for the same `snapId`; throws if called again with a different
   * one to prevent accidentally swapping a keyring's identity.
   *
   * @param snapId - The snap ID to bind to.
   */
  protected bindSnapId(snapId: SnapId): void {
    if (this.#context !== undefined && this.#context.snapId !== snapId) {
      throw new Error(
        `SnapKeyring bound to '${this.#context.snapId}' cannot be rebound to '${snapId}'`,
      );
    }
    if (this.#context === undefined) {
      this.#context = {
        snapId,
        client: new KeyringInternalSnapClient({
          messenger: this.#messenger,
          snapId,
        }),
      };
    }
  }

  /**
   * Returns the v2 snap client.
   *
   * @returns The v2 snap client.
   * @throws If the keyring is not yet initialized.
   */
  get #client(): KeyringInternalSnapClient {
    /* istanbul ignore next */
    if (this.#context === undefined) {
      throw new Error('SnapKeyring is not bound to a snap ID');
    }
    return this.#context.client;
  }

  /**
   * Destroy this keyring, rejecting any pending v1 requests.
   *
   * @returns A promise that resolves when the keyring is destroyed.
   */
  async destroy(): Promise<void> {
    await this.#v1?.destroy();
    this.#v1 = undefined;
  }

  /**
   * Run a callback under the appropriate lock.
   *
   * Prefers the injected `withLock` callback (global lock provided by
   * `SnapKeyring`) so that `createAccounts` calls across different snaps
   * are serialized. Falls back to the per-instance `#lock` when no global
   * lock is provided (e.g. standalone use in tests).
   *
   * @param callback - Operation to run under the lock.
   * @returns The result of the callback.
   */
  async #withLock<Result>(callback: () => Promise<Result>): Promise<Result> {
    return (
      this.#callbacks.withLock ??
      (async (operation: () => Promise<Result>): Promise<Result> =>
        this.#lock.runExclusive(operation))
    )(callback);
  }

  // ──────────────────────────────────────────────
  // Keyring methods
  // ──────────────────────────────────────────────

  /**
   * Returns all accounts managed by this keyring.
   *
   * @returns A promise that resolves to an array of all accounts.
   */
  async getAccounts(): Promise<KeyringAccount[]> {
    this.#assertInitialized();
    return this.accounts();
  }

  /**
   * Returns the account with the specified ID.
   *
   * @param accountId - ID of the account to retrieve.
   * @returns A promise that resolves to the account.
   */
  async getAccount(accountId: AccountId): Promise<KeyringAccount> {
    this.#assertInitialized();
    const account = this.lookupAccount(accountId);
    if (!account) {
      throw new Error(
        `Account '${accountId}' not found in snap '${this.snapId}'`,
      );
    }
    return account;
  }

  /**
   * Creates one or more new accounts according to the provided options.
   *
   * Deterministic account creation MUST be idempotent, meaning that for
   * deterministic algorithms, like BIP-44, calling this method with the same
   * options should always return the same accounts, even if the accounts
   * already exist in the keyring.
   *
   * NOTE: If some accounts are not allowed (non-unique address, unsupported
   * generic account), this method will skip their creation and ask the Snap
   * to remove them from its state.
   *
   * @param options - Options describing how to create the account(s).
   * @returns A promise that resolves to an array of the created account objects.
   */
  async createAccounts(
    options: CreateAccountOptions,
  ): Promise<KeyringAccount[]> {
    this.#assertInitialized();
    return this.#withLock(async () => {
      // Keep track of address/account ID part of this batch, to avoid having duplicates.
      const batchAddresses = new Set<string>();
      const batchIds = new Set<string>();

      const accounts: KeyringAccount[] = [];
      const newAccounts: KeyringAccount[] = [];
      let snapAccounts: KeyringAccount[];
      if (this.#v1) {
        // v1 snap: the v1 client wraps options in `{ options }` before sending
        // `keyring_createAccounts`, while the v2 client sends flat options.
        // Route through v1 so v1 snaps receive the format they expect.
        snapAccounts = await this.#v1.createAccounts(options);
      } else {
        // v2 snap: call snap directly with flat options.
        snapAccounts = await this.#client.createAccounts(options);
      }

      try {
        for (const snapAccount of snapAccounts) {
          let account = normalizeAccount(transformAccount(snapAccount));
          const { address } = account;

          // Check for idempotency.
          const existingAccount = this.#getExistingAccount(account);
          if (existingAccount) {
            // NOTE: We re-use the account from the internal state to avoid having the Snap
            // mutating the account object without updating the map.
            account = existingAccount;
          } else {
            await this.#callbacks.assertAccountCanBeUsed(account);

            // Also check for transient accounts that are not yet part of the keyring
            // state.
            if (batchAddresses.has(address) || batchIds.has(account.id)) {
              throw new Error(
                `Account '${account.id}' is already part of this batch (same address or account ID)`,
              );
            }
            batchAddresses.add(address);
            batchIds.add(account.id);

            // NOTE: This method does not rely on the `AccountCreated` event to add
            // accounts to the keyring, so we have to add them to the state manually.
            newAccounts.push(account);
          }

          // New AND existing accounts are returned to the caller no matter what.
          accounts.push(account);
        }

        // We update the keyring state only if needed.
        if (newAccounts.length > 0) {
          for (const account of newAccounts) {
            this.setAccount(account);
          }
        }

        return accounts;
      } catch (error) {
        // Rollback Snap state.
        for (const snapAccount of snapAccounts) {
          // Make sure to only delete accounts that were not part of the keyring state.
          if (!this.#getExistingAccount(snapAccount)) {
            try {
              await this.#client.deleteAccount(snapAccount.id);
            } catch (rollbackError) {
              // Best-effort rollback; log snap-side failures for observability.
              console.error(
                `Account '${snapAccount.id}' may not have been removed from snap '${this.snapId}' during createAccounts rollback:`,
                rollbackError,
              );
            }
          }
        }

        throw error;
      }
    });
  }

  /**
   * Deletes the account with the specified ID.
   *
   * Removes the account from the local registry (firing `onUnregister` so the
   * parent can update its index), then asks the snap to delete it.
   *
   * @param accountId - ID of the account to delete.
   */
  async deleteAccount(accountId: AccountId): Promise<void> {
    this.#assertInitialized();
    // Always remove the account from the registry, even if the Snap is going to
    // fail to delete it. removeAccount fires onUnregister to clean #accountIndex.
    this.removeAccount(accountId);

    try {
      await this.#client.deleteAccount(accountId);
    } catch (error) {
      // If the Snap failed to delete the account, log the error and continue
      // with the account deletion, otherwise the account will be stuck in the
      // keyring.
      console.error(
        `Account '${accountId}' may not have been removed from snap '${this.snapId}':`,
        error,
      );
    }
  }

  /**
   * Submits a request to the keyring.
   *
   * For v1 snaps (those without declared capabilities), delegates to the v1
   * event-driven flow that handles the `{ pending, result }` envelope.
   * For v2 snaps, calls the snap directly via the v2 client which returns
   * `Json` with no envelope.
   *
   * @param request - The keyring request to submit.
   * @param request.id - The request ID.
   * @param request.origin - The sender origin.
   * @param request.scope - The CAIP-2 chain ID.
   * @param request.account - The account ID.
   * @param request.request - The inner JSON-RPC request.
   * @param request.request.method - The method to call.
   * @param request.request.params - The method parameters.
   * @returns A promise that resolves to the response.
   */
  async submitRequest(request: {
    id: string;
    origin: string;
    scope: string;
    account: AccountId;
    request: {
      method: string;
      params?: Json[] | Record<string, Json>;
    };
  }): Promise<Json> {
    this.#assertInitialized();
    const account = this.lookupAccount(request.account);
    if (!account) {
      throw new Error(
        `Account '${request.account}' not found in snap '${this.snapId}'`,
      );
    }
    if (this.#v1) {
      // v1 snap: use event-driven flow with { pending, result } envelope handling.
      return this.#v1.submitSnapRequest({
        origin: request.origin,
        account,
        method: request.request.method as AccountMethod,
        params: request.request.params,
        scope: request.scope,
        noPending: false,
      });
    }
    // v2 snap: call snap directly, returns Json (no envelope).
    return this.#client.submitRequest({
      id: request.id,
      origin: request.origin,
      scope: request.scope,
      account: request.account,
      request: request.request,
    });
  }

  // ──────────────────────────────────────────────
  // Internal API (used by parent SnapKeyring for event handling, routing, etc.)
  // ──────────────────────────────────────────────

  /**
   * Upsert an account into the registry.
   *
   * Fires `onRegister` only when the account is new (not already present).
   * Safe to call for updates -- the parent index is already populated in that
   * case and the no-op path avoids a redundant write.
   *
   * @param account - The account to add or update.
   */
  setAccount(account: KeyringAccount): void {
    const isNew = !this.#registry.has(account.id);
    this.#registry.set(account);
    if (isNew) {
      this.#callbacks.onRegister?.(account.id);
    }
  }

  /**
   * Remove an account from the registry.
   *
   * Fires `onUnregister` so the parent can drop the account from its index.
   *
   * @param id - The account ID to remove.
   * @returns `true` if the account was removed, `false` if it was not found.
   */
  removeAccount(id: AccountId): boolean {
    if (!this.#registry.has(id)) {
      return false;
    }
    this.#registry.delete(id);
    this.#callbacks.onUnregister?.(id);
    return true;
  }

  /**
   * Check whether an account exists in this keyring.
   *
   * @param id - The account ID to check.
   * @returns `true` if the account exists.
   */
  hasAccount(id: AccountId): boolean {
    return this.#registry.has(id);
  }

  /**
   * Get an account by its ID.
   *
   * @param id - The account ID to look up.
   * @returns The account, or `undefined` if not found.
   */
  lookupAccount(id: AccountId): KeyringAccount | undefined {
    return this.#registry.get(id);
  }

  /**
   * Get an account by address (case-insensitive).
   *
   * Performs an O(1) exact lookup first; falls back to a linear scan to
   * handle addresses stored with different casing.
   *
   * @param address - The address to look up.
   * @returns The account, or `undefined` if not found.
   */
  lookupByAddress(address: string): KeyringAccount | undefined {
    const id = this.#registry.getAccountId(address);
    if (id !== undefined) {
      return this.#registry.get(id);
    }
    // The fallback only runs when the exact-match branch above misses,
    // which in practice only happens for EVM addresses with casing
    // differences (checksummed vs lowercase). Non-EVM addresses are
    // case-sensitive and always resolve on the exact branch.
    return this.#registry
      .values()
      .find((account) => equalsIgnoreCase(account.address, address));
  }

  /**
   * Get all accounts in this keyring (synchronous).
   *
   * This exists alongside the async `getAccounts()` (from `Keyring`) because
   * `SnapKeyring` needs synchronous access for iteration in `serialize`,
   * `listAccounts`, `hasSnapId`, etc. without awaiting.
   *
   * @returns An array of all accounts.
   */
  accounts(): KeyringAccount[] {
    return this.#registry.values();
  }

  /**
   * Serialize this keyring's state.
   *
   * The returned object uses the internal per-snap format; the parent
   * `SnapKeyring` reconstructs the flat external format in its own
   * `serialize()`.
   *
   * @returns The serialized state.
   */
  async serialize(): Promise<SnapKeyringState> {
    const accounts: SnapKeyringState['accounts'] = {};
    for (const account of this.#registry.values()) {
      accounts[account.id] = account;
    }
    const state: SnapKeyringState = {
      snapId: this.snapId,
      accounts,
    };
    return state;
  }

  /**
   * Restore this keyring from a serialized state.
   *
   * Validates the payload (accepting both v1 and v2 account shapes), migrates
   * any v1 accounts to v2, then replaces the registry. Also determines whether
   * the snap is v1 or v2 by reading its manifest capabilities: if no
   * capabilities are declared, a {@link SnapKeyringV1} instance is created and
   * held under {@link SnapKeyring.v1}.
   *
   * @param state - The state to deserialize.
   * @returns A promise that resolves when deserialization is complete.
   */
  async deserialize(state: Json): Promise<void> {
    // Validate the raw payload — accepts both v1 and v2 account shapes.
    assert(state, SnapKeyringStateStruct);

    // Bind the keyring to its snap ID (idempotent for the same ID, throws on
    // mismatch to prevent swapping a keyring's identity via deserialize).
    this.bindSnapId(state.snapId as SnapId);

    // Refresh capabilities from the snap manifest on every deserialize, falling
    // back to the empty default so a re-hydrate clears any previously-loaded
    // capabilities when the snap no longer declares them.
    const capabilities = this.#resolveKeyringCapabilities();
    this.capabilities = capabilities ?? EMPTY_CAPABILITIES;

    // Determine snap version and create a v1 instance if needed.
    const v1 = capabilities === undefined;
    if (v1) {
      // v1 snap: no declared capabilities. Create a SnapKeyringV1 instance
      // that shares the registry and messenger owned by this class.
      if (this.#v1 === undefined) {
        this.#v1 = new SnapKeyringV1({
          messenger: this.#messenger,
          callbacks: this.#callbacks,
          registry: this.#registry,
          isAnyAccountTypeAllowed: this.#isAnyAccountTypeAllowed,
        });
        this.#v1.bindSnapId(state.snapId as SnapId);
      }
    } else {
      // v2 snap: tear down any stale v1 instance (e.g. after a manifest update).
      await this.#v1?.destroy();
      this.#v1 = undefined;
    }

    // Migrate v1 accounts to v2.
    const migratedAccounts: Record<string, KeyringAccount> = {};
    for (const [id, rawAccount] of Object.entries(state.accounts)) {
      if (isAccountV1(rawAccount)) {
        console.info(
          `SnapKeyring - Found a KeyringAccountV1, migrating to V2: ${rawAccount.id}`,
        );
        migratedAccounts[id] = migrateAccountV1(rawAccount);
      } else {
        migratedAccounts[id] = rawAccount as KeyringAccount;
      }
    }

    // Apply the migrated state to the registry.
    for (const id of [...this.#registry.keys()]) {
      this.removeAccount(id);
    }

    for (const account of Object.values(migratedAccounts)) {
      this.setAccount(account);
    }
  }

  // ──────────────────────────────────────────────
  // Private helpers
  // ──────────────────────────────────────────────

  /**
   * Assert that the keyring has been initialized.
   *
   * @throws An error if the keyring has not been initialized.
   */
  #assertInitialized(): void {
    if (this.#context === undefined) {
      throw new Error(
        'SnapKeyring has not been initialized: call deserialize() first',
      );
    }
  }

  /**
   * Resolve the keyring capabilities from the snap manifest.
   *
   * @returns The keyring capabilities, or `undefined` if the snap manifest does not declare any capabilities.
   */
  #resolveKeyringCapabilities(): KeyringCapabilities | undefined {
    const snap = this.#messenger.call('SnapController:getSnap', this.snapId);
    // READ THIS CAREFULLY:
    // We are not validating the shape of the capabilities here, because there is
    // manifest validation done already on the snaps side, the snaps repo maintains
    // a copy of the `KeyringCapabilitiesStruct`.
    // We must ensure that both structs are always in-sync, otherwise the type-cast
    // could cause runtime issues!
    return snap?.manifest.initialPermissions['endowment:keyring']
      ?.capabilities as KeyringCapabilities | undefined;
  }

  /**
   * Check whether an account with the same ID and address already exists in
   * the registry. Used for idempotent account creation.
   *
   * @param account - The account to check against the registry.
   * @returns The existing account if found, `undefined` otherwise.
   */
  #getExistingAccount(account: KeyringAccount): KeyringAccount | undefined {
    const address = normalizeAccountAddress(account);
    const existing = this.#registry.get(account.id);
    if (existing && normalizeAccountAddress(existing) === address) {
      return existing;
    }
    return undefined;
  }
}
