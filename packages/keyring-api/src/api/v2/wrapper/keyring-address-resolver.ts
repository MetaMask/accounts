import type { AccountId } from '@metamask/keyring-utils';
import { v4 as uuidv4 } from 'uuid';

/**
 * Mapping between an internal AccountId and the underlying keyring address.
 */
export type KeyringAddressResolver = {
  /**
   * Resolve an AccountId into an underlying address.
   */
  getAddress(accountId: AccountId): string | undefined;

  /**
   * Resolve an underlying address into an AccountId.
   */
  getAccountId(address: string): AccountId | undefined;

  /**
   * Register a new mapping. Implementations are free to decide how the
   * AccountId is generated (e.g. UUIDv4).
   */
  register(address: string): AccountId;
};

/**
 * Simple in-memory AccountId/address resolver used by default. This is mostly
 * intended for controller-managed lifecycles where wrappers live in memory.
 */
export class InMemoryKeyringAddressResolver implements KeyringAddressResolver {
  readonly #idByAddress = new Map<string, AccountId>();

  readonly #addressById = new Map<AccountId, string>();

  getAddress(accountId: AccountId): string | undefined {
    return this.#addressById.get(accountId);
  }

  getAccountId(address: string): AccountId | undefined {
    return this.#idByAddress.get(address);
  }

  register(address: string): AccountId {
    const existing = this.#idByAddress.get(address);
    if (existing) {
      return existing;
    }
    const id = uuidv4();

    this.#idByAddress.set(address, id);
    this.#addressById.set(id, address);

    return id;
  }
}
