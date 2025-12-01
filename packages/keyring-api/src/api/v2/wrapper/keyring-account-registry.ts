import type { AccountId } from '@metamask/keyring-utils';
import { v4 as uuidv4 } from 'uuid';

import type { KeyringAccount } from '../../account';

/**
 * In-memory registry for KeyringAccount objects.
 *
 * Provides O(1) lookups by AccountId or address, and stores the full
 * KeyringAccount objects for efficient retrieval.
 */
export class KeyringAccountRegistry {
  readonly #accountById = new Map<AccountId, KeyringAccount>();

  readonly #idByAddress = new Map<string, AccountId>();

  /**
   * Get an account by its AccountId.
   *
   * @param accountId - The AccountId to look up.
   * @returns The KeyringAccount, or undefined if not found.
   */
  get(accountId: AccountId): KeyringAccount | undefined {
    return this.#accountById.get(accountId);
  }

  /**
   * Get an account's address by its AccountId.
   *
   * @param accountId - The AccountId to look up.
   * @returns The address, or undefined if not found.
   */
  getAddress(accountId: AccountId): string | undefined {
    return this.#accountById.get(accountId)?.address;
  }

  /**
   * Get an AccountId by the underlying address.
   *
   * @param address - The address to look up.
   * @returns The AccountId, or undefined if not found.
   */
  getAccountId(address: string): AccountId | undefined {
    return this.#idByAddress.get(address);
  }

  /**
   * Register a new address and generate an AccountId for it.
   * If the address is already registered, returns the existing AccountId.
   *
   * @param address - The address to register.
   * @returns The AccountId for this address.
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
   * Also registers the address → AccountId mapping.
   *
   * @param account - The KeyringAccount to cache.
   */
  set(account: KeyringAccount): void {
    this.#accountById.set(account.id, account);
    this.#idByAddress.set(account.address, account.id);
  }

  /**
   * Remove an account from the registry.
   *
   * @param accountId - The AccountId to remove.
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
   * @returns Array of all KeyringAccount objects in the registry.
   */
  values(): KeyringAccount[] {
    return Array.from(this.#accountById.values());
  }

  /**
   * Get all AccountIds in the registry.
   *
   * @returns Array of all AccountIds.
   */
  keys(): AccountId[] {
    return Array.from(this.#accountById.keys());
  }

  /**
   * Check if an account exists in the registry.
   *
   * @param accountId - The AccountId to check.
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
