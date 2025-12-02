import type { AccountId } from '@metamask/keyring-utils';
import { v4 as uuidv4 } from 'uuid';

import type { KeyringAccount } from '../../account';

/**
 * In-memory registry for KeyringAccount objects.
 *
 * Provides O(1) lookups by account ID or address, and stores the full
 * KeyringAccount objects for efficient retrieval.
 */
export class KeyringAccountRegistry<
  KeyringAccountType extends KeyringAccount = KeyringAccount,
> {
  readonly #accountById = new Map<AccountId, KeyringAccountType>();

  readonly #idByAddress = new Map<string, AccountId>();

  /**
   * Get an account by its account ID.
   *
   * @param accountId - The account ID to look up.
   * @returns The KeyringAccount, or undefined if not found.
   */
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  get(accountId: AccountId): KeyringAccountType | undefined {
    return this.#accountById.get(accountId);
  }

  /**
   * Get an account's address by its account ID.
   *
   * @param accountId - The account ID to look up.
   * @returns The address, or undefined if not found.
   */
  getAddress(accountId: AccountId): string | undefined {
    return this.#accountById.get(accountId)?.address;
  }

  /**
   * Get an account ID by the underlying address.
   *
   * @param address - The address to look up.
   * @returns The account ID, or undefined if not found.
   */
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  getAccountId(address: string): AccountId | undefined {
    return this.#idByAddress.get(address);
  }

  /**
   * Register a new address and generate an account ID for it.
   * If the address is already registered, returns the existing account ID.
   *
   * @param address - The address to register.
   * @returns The account ID for this address.
   */
  register(address: string): AccountId {
    const existing = this.#idByAddress.get(address);
    if (existing) {
      return existing;
    }
    const id = uuidv4();
    this.#idByAddress.set(address, id);
    return id;
  }

  /**
   * Add an account to the registry.
   * Also registers the address → account ID mapping.
   *
   * ⚠️ If an address was previously registered via `register()` with a
   * different account ID, calling `set()` with an account that has a new ID for
   * the same address will overwrite the address → ID mapping. The old ID
   * becomes "dangling" (i.e., `get(oldId)` will return undefined).
   *
   * @param account - The KeyringAccount to cache.
   */
  set(account: KeyringAccountType): void {
    this.#accountById.set(account.id, account);
    this.#idByAddress.set(account.address, account.id);
  }

  /**
   * Remove an account from the registry.
   *
   * @param accountId - The account ID to remove.
   */
  delete(accountId: AccountId): void {
    const account = this.#accountById.get(accountId);
    if (account) {
      this.#idByAddress.delete(account.address);
      this.#accountById.delete(accountId);
    }
  }

  /**
   * Clear all accounts from the registry.
   */
  clear(): void {
    this.#accountById.clear();
    this.#idByAddress.clear();
  }

  /**
   * Get all cached accounts as an array.
   *
   * @returns Array of all KeyringAccountType objects in the registry.
   */
  values(): KeyringAccountType[] {
    return Array.from(this.#accountById.values());
  }

  /**
   * Get all account IDs in the registry.
   *
   * @returns Array of all account IDs.
   */
  keys(): AccountId[] {
    return Array.from(this.#accountById.keys());
  }

  /**
   * Check if an account exists in the registry.
   *
   * @param accountId - The account ID to check.
   * @returns True if the account exists.
   */
  has(accountId: AccountId): boolean {
    return this.#accountById.has(accountId);
  }

  /**
   * Get the number of accounts in the registry.
   *
   * @returns The number of accounts.
   */
  get size(): number {
    return this.#accountById.size;
  }
}
