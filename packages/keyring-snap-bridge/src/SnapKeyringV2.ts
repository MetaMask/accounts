import type { KeyringAccount } from '@metamask/keyring-api';
import { KeyringAccountRegistry } from '@metamask/keyring-sdk';
import type { AccountId } from '@metamask/keyring-utils';
import type { SnapId } from '@metamask/snaps-sdk';

import { isAccountV1, migrateAccountV1 } from './migrations';

/**
 * Serialized state of a single SnapKeyringV2 instance.
 *
 * Note: this is an internal format only used between SnapKeyringV2 and its
 * parent SnapKeyring. The external KeyringState format (flat `{ account,
 * snapId }` map) is preserved by SnapKeyring.serialize / deserialize.
 */
export type SnapKeyringV2State = {
  snapId: SnapId;
  accounts: Record<AccountId, KeyringAccount>;
};

type SnapKeyringV2Options = {
  snapId: SnapId;
  /**
   * Called synchronously whenever a new account is added to this keyring.
   * The parent uses this to maintain a global account-ID → snap-ID index.
   */
  onRegister: (accountId: AccountId) => void;
  /**
   * Called synchronously whenever an account is removed from this keyring.
   * The parent uses this to clean up its global index.
   */
  onUnregister: (accountId: AccountId) => void;
};

/**
 * Per-snap keyring wrapper.
 *
 * Each instance is responsible for exactly one `SnapId` and uses a
 * `KeyringAccountRegistry` as its sole backing store, providing O(1) lookups
 * by account ID and address.
 */
export class SnapKeyringV2 {
  readonly #snapId: SnapId;

  readonly #registry: KeyringAccountRegistry;

  readonly #onRegister: (accountId: AccountId) => void;

  readonly #onUnregister: (accountId: AccountId) => void;

  constructor({ snapId, onRegister, onUnregister }: SnapKeyringV2Options) {
    this.#snapId = snapId;
    this.#registry = new KeyringAccountRegistry();
    this.#onRegister = onRegister;
    this.#onUnregister = onUnregister;
  }

  /**
   * The Snap ID that owns all accounts in this keyring.
   *
   * @returns The owning Snap ID.
   */
  get snapId(): SnapId {
    return this.#snapId;
  }

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
      this.#onRegister(account.id);
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
    this.#onUnregister(id);
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
    return this.#registry
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
  serialize(): SnapKeyringV2State {
    const accounts: Record<AccountId, KeyringAccount> = {};
    for (const account of this.#registry.values()) {
      accounts[account.id] = account;
    }
    return { snapId: this.#snapId, accounts };
  }

  /**
   * Restore this keyring from a serialized state.
   *
   * Clears the current registry, then repopulates it via `setAccount` so that
   * each `onRegister` callback fires -- automatically rebuilding the parent's
   * `#accountIndex` without any extra coordination.
   *
   * Account migrations (v1 → v2) are applied before storage.
   *
   * @param state - The state to deserialize.
   */
  deserialize(state: SnapKeyringV2State): void {
    this.#registry.clear();
    for (const rawAccount of Object.values(state.accounts)) {
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
}
