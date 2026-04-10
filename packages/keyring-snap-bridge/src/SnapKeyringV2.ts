import type {
  KeyringAccount,
  CreateAccountOptions,
  KeyringV2,
  KeyringCapabilities,
} from '@metamask/keyring-api';
import { KeyringType } from '@metamask/keyring-api';
import type { AccountId } from '@metamask/keyring-utils';
import type { Json } from '@metamask/utils';

import { transformAccount } from './account';
import { isAccountV1, migrateAccountV1 } from './migrations';
import { SnapKeyringV1 } from './SnapKeyringV1';
import type {
  AccountMethod,
  SnapKeyringV1Callbacks,
  SnapKeyringV1Options,
} from './SnapKeyringV1';
import { normalizeAccountAddress } from './util';

/**
 * Serialized state of a single SnapKeyringV2 instance.
 *
 * Note: this is an internal format only used between SnapKeyringV2 and its
 * parent SnapKeyring. The external KeyringState format (flat `{ account,
 * snapId }` map) is preserved by SnapKeyring.serialize / deserialize.
 */
export type SnapKeyringV2State = {
  snapId: string;
  accounts: Record<AccountId, KeyringAccount>;
};

/**
 * Callbacks injected by the parent `SnapKeyring` for global coordination.
 *
 * Extends the v1 callbacks with the global keyring lock needed by the
 * batch `createAccounts` path.
 */
export type SnapKeyringV2Callbacks = SnapKeyringV1Callbacks & {
  /**
   * Run a callback under the global keyring lock.
   * Required by `createAccounts` for cross-snap uniqueness checks.
   */
  withLock: <Result>(callback: () => Promise<Result>) => Promise<Result>;
};

type SnapKeyringV2Options = Omit<SnapKeyringV1Options, 'callbacks'> & {
  callbacks: SnapKeyringV2Callbacks;
};

/**
 * Per-snap keyring wrapper that implements `KeyringV2`.
 *
 * Extends `SnapKeyringV1` — the v1 event-driven flow (account lifecycle,
 * request handling, asset events) is inherited. This class adds the
 * `KeyringV2` batch interface (`createAccounts`, `deleteAccount`, etc.) and
 * owns the `capabilities` property.
 *
 * The `KeyringAccountRegistry`, snap client, and messenger are all inherited
 * from `SnapKeyringV1` so there is no duplicated state.
 */
export class SnapKeyringV2 extends SnapKeyringV1 implements KeyringV2 {
  /**
   * V2-typed view of the callbacks. Stored separately from the V1 private
   * field so that V2-specific callbacks (e.g. `withLock`) are accessible
   * without casting. Both fields hold the same object reference.
   */
  readonly #callbacks: SnapKeyringV2Callbacks;

  // ──────────────────────────────────────────────
  // KeyringV2 properties
  // ──────────────────────────────────────────────

  readonly type = `${KeyringType.Snap}` as const;

  /**
   * Capabilities are snap-specific. Initialized empty and can be updated
   * by the parent when snap metadata becomes available.
   */
  capabilities: KeyringCapabilities;

  constructor(options: SnapKeyringV2Options) {
    super(options);
    this.#callbacks = options.callbacks;

    // Default capabilities — parent updates this when snap metadata is available.
    // We cast here because KeyringCapabilities requires a non-empty scopes array,
    // but we don't have the snap metadata at construction time (e.g. during deserialization).
    this.capabilities = { scopes: [] } as unknown as KeyringCapabilities;
  }

  // ──────────────────────────────────────────────
  // KeyringV2 methods
  // ──────────────────────────────────────────────

  /**
   * Returns all accounts managed by this keyring.
   *
   * @returns A promise that resolves to an array of all accounts.
   */
  async getAccounts(): Promise<KeyringAccount[]> {
    return this.accounts();
  }

  /**
   * Returns the account with the specified ID.
   *
   * @param accountId - ID of the account to retrieve.
   * @returns A promise that resolves to the account.
   */
  async getAccount(accountId: AccountId): Promise<KeyringAccount> {
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
    return this.#callbacks.withLock(async () => {
      // Keep track of address/account ID part of this batch, to avoid having duplicates.
      const batchAddresses = new Set<string>();
      const batchIds = new Set<string>();

      const accounts: KeyringAccount[] = [];
      const newAccounts: KeyringAccount[] = [];
      const snapAccounts = await this.client.createAccounts(options);

      try {
        for (const snapAccount of snapAccounts) {
          let account = transformAccount(snapAccount);
          const address = normalizeAccountAddress(account);

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

          // NOTE: We assume this will never fail, thus, we don't need to rollback the
          // keyring state if anything goes wrong here.
          await this.#callbacks.saveState();
        }

        return accounts;
      } catch (error) {
        // Rollback Snap state.
        for (const snapAccount of snapAccounts) {
          // Make sure to only delete accounts that were not part of the keyring state.
          if (!this.#getExistingAccount(snapAccount)) {
            try {
              await this.client.deleteAccount(snapAccount.id);
            } catch {
              // Swallow — best-effort rollback.
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
    // Always remove the account from the registry, even if the Snap is going to
    // fail to delete it. removeAccount fires onUnregister to clean #accountIndex.
    this.removeAccount(accountId);

    try {
      await this.client.deleteAccount(accountId);
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
   * Validates that the account belongs to this wrapper, then delegates
   * to the inherited `submitSnapRequest` for the full request lifecycle
   * (sync / async / redirect).
   *
   * @param request - The keyring request to submit.
   * @param request.id - The request ID (unused — a fresh ID is generated internally).
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
    const account = this.lookupAccount(request.account);
    if (!account) {
      throw new Error(
        `Account '${request.account}' not found in snap '${this.snapId}'`,
      );
    }
    return this.submitSnapRequest({
      origin: request.origin,
      account,
      method: request.request.method as AccountMethod,
      params: request.request.params,
      scope: request.scope,
      noPending: false,
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
    const isNew = !this.registry.has(account.id);
    this.registry.set(account);
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
    if (!this.registry.has(id)) {
      return false;
    }
    this.registry.delete(id);
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
    return this.registry.has(id);
  }

  /**
   * Get an account by its ID.
   *
   * @param id - The account ID to look up.
   * @returns The account, or `undefined` if not found.
   */
  lookupAccount(id: AccountId): KeyringAccount | undefined {
    return this.registry.get(id);
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
    const id = this.registry.getAccountId(address);
    if (id !== undefined) {
      return this.registry.get(id);
    }
    return this.registry
      .values()
      .find(
        (account) => account.address.toLowerCase() === address.toLowerCase(),
      );
  }

  /**
   * Get all accounts in this keyring.
   *
   * @returns An array of all accounts.
   */
  accounts(): KeyringAccount[] {
    return this.registry.values();
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
  async serialize(): Promise<Json> {
    const accounts: Record<AccountId, KeyringAccount> = {};
    for (const account of this.registry.values()) {
      accounts[account.id] = account;
    }
    return {
      snapId: this.snapId,
      accounts,
    } as unknown as Json;
  }

  /**
   * Restore this keyring from a serialized state.
   *
   * Removes all existing accounts via `removeAccount` (firing `onUnregister`
   * for each), then repopulates via `setAccount` (firing `onRegister` for
   * each) -- keeping the parent's `#accountIndex` in sync automatically.
   *
   * Account migrations (v1 → v2) are applied before storage.
   *
   * @param state - The state to deserialize.
   * @returns A promise that resolves when deserialization is complete.
   */
  async deserialize(state: Json): Promise<void> {
    const typed = state as SnapKeyringV2State;

    // Remove existing accounts via removeAccount so that onUnregister fires
    // for each one, keeping the parent's #accountIndex in sync even if this
    // method is called outside of SnapKeyring.deserialize.
    for (const id of [...this.registry.keys()]) {
      this.removeAccount(id);
    }

    for (const rawAccount of Object.values(typed.accounts)) {
      let account = rawAccount;
      if (isAccountV1(rawAccount)) {
        console.info(
          `SnapKeyring - Found a KeyringAccountV1, migrating to V2: ${rawAccount.id}`,
        );
        account = migrateAccountV1(rawAccount);
      }
      this.setAccount(account);
    }
  }

  // ──────────────────────────────────────────────
  // Private helpers
  // ──────────────────────────────────────────────

  /**
   * Idempotency check: account exists in this wrapper with same address.
   *
   * @param account - The account to check.
   * @returns The existing account if found, `undefined` otherwise.
   */
  #getExistingAccount(account: KeyringAccount): KeyringAccount | undefined {
    const address = normalizeAccountAddress(account);
    const existing = this.lookupAccount(account.id);
    if (existing && normalizeAccountAddress(existing) === address) {
      return existing;
    }
    return undefined;
  }
}
