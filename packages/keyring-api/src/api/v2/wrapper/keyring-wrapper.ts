import type { Keyring, AccountId } from '@metamask/keyring-utils';
import type { Json } from '@metamask/utils';
import { Mutex } from 'async-mutex';

import { KeyringAccountRegistry } from './keyring-account-registry';
import type {
  CreateAccountOptions,
  ExportAccountOptions,
  ExportedAccount,
} from '..';
import type { KeyringAccount } from '../../account';
import type { KeyringRequest } from '../../request';
import type { KeyringV2 } from '../keyring';
import type { KeyringCapabilities } from '../keyring-capabilities';
import type { KeyringType } from '../keyring-type';

/**
 * Basic options for constructing a {@link KeyringWrapper}.
 */
export type KeyringWrapperOptions<InnerKeyring extends Keyring> = {
  /**
   * The underlying "old" keyring instance that this wrapper adapts.
   */
  inner: InnerKeyring;

  /**
   * The concrete keyring type exposed through the V2 interface.
   */
  type: KeyringType;

  /**
   * Capabilities of the underlying keyring.
   */
  capabilities: KeyringCapabilities;
};

/**
 * Generic adapter that turns an existing {@link Keyring} implementation into a
 * {@link KeyringV2} instance.
 *
 * Consumers are expected to provide concrete mappings between high-level V2
 * operations and the underlying keyring methods (for example BIP-44 account
 * creation, private-key import, and request handling). This class focuses on
 * the common mechanics required by all adapters: state serialization,
 * account-ID/address mapping and basic account management.
 */
export abstract class KeyringWrapper<
  InnerKeyring extends Keyring,
  KeyringAccountType extends KeyringAccount = KeyringAccount,
> implements KeyringV2
{
  readonly type: `${KeyringType}`;

  readonly #capabilities: KeyringCapabilities;

  protected readonly inner: InnerKeyring;

  /**
   * Mutex to ensure exclusive access to the inner keyring during
   * operations that mutate its state.
   */
  readonly #lock = new Mutex();

  /**
   * Registry for KeyringAccount objects.
   * Provides O(1) lookups by AccountId or address.
   *
   * Subclasses should use this registry when creating accounts and
   * clear/update it when deleting accounts or deserializing state.
   */
  protected readonly registry =
    new KeyringAccountRegistry<KeyringAccountType>();

  constructor(options: KeyringWrapperOptions<InnerKeyring>) {
    this.inner = options.inner;
    this.type = `${options.type}`;
    this.#capabilities = options.capabilities;
  }

  /**
   * Get the capabilities of this keyring.
   *
   * Subclasses can override this getter to return capabilities dynamically
   * based on runtime state.
   *
   * @returns The keyring's capabilities.
   */
  get capabilities(): KeyringCapabilities {
    return this.#capabilities;
  }

  /**
   * Execute an operation with exclusive access to the inner keyring.
   *
   * This method ensures thread-safety for operations that read or mutate
   * the inner keyring state. All operations that modify the keyring
   * (createAccounts, deleteAccount, deserialize) should use this method
   * to prevent race conditions.
   *
   * Within the callback, use `this.inner` to access the inner keyring.
   *
   * @param callback - A function that performs the operation.
   * @returns The result of the callback.
   */
  protected async withLock<Result>(
    callback: () => Promise<Result>,
  ): Promise<Result> {
    return this.#lock.runExclusive(callback);
  }

  /**
   * Serialize the underlying keyring state to a JSON-serializable object.
   *
   * This simply delegates to the legacy keyring's {@link Keyring.serialize}
   * implementation.
   *
   * @returns The serialized keyring state.
   */
  async serialize(): Promise<Json> {
    return this.inner.serialize();
  }

  /**
   * Hydrate the underlying keyring from a previously serialized state.
   *
   * This clears the registry, delegates to the legacy keyring's
   * {@link Keyring.deserialize} implementation, and rebuilds the registry
   * by calling {@link getAccounts}.
   *
   * @param state - The serialized keyring state.
   */
  async deserialize(state: Json): Promise<void> {
    await this.withLock(async () => {
      // Clear the registry when deserializing
      this.registry.clear();

      // Deserialize the legacy keyring
      await this.inner.deserialize(state);

      // Rebuild the registry by calling getAccounts().
      // Subclass implementations of getAccounts() should populate the registry
      // as a side effect (see the abstract method's documentation).
      await this.getAccounts();
    });
  }

  /**
   * Return all accounts managed by this keyring.
   *
   * Concrete adapters are responsible for mapping the underlying keyring's
   * notion of accounts (typically addresses returned by
   * {@link Keyring.getAccounts}) into {@link KeyringAccount} objects.
   * Implementations should use the configured {@link KeyringAccountRegistry}
   * to establish the account ID/address mapping so that
   * {@link getAccount} works as expected.
   *
   * @returns The list of managed accounts.
   */
  abstract getAccounts(): Promise<KeyringAccount[]>;

  /**
   * Look up a single account by its {@link AccountId}.
   *
   * This method first checks the registry for O(1) lookup.
   * If not found, it falls back to calling {@link getAccounts} which
   * should populate the registry as a side effect.
   *
   * @param accountId - The AccountId to look up.
   * @returns The matching KeyringAccount.
   */
  async getAccount(accountId: AccountId): Promise<KeyringAccount> {
    let cached = this.registry.get(accountId);
    if (cached) {
      return cached;
    }

    // Prime the registry by calling getAccounts
    await this.getAccounts();

    // Try registry again after priming
    cached = this.registry.get(accountId);
    if (!cached) {
      throw new Error(`Account not found for id: ${accountId}`);
    }

    return cached;
  }

  /**
   * Create one or more new accounts managed by this keyring.
   *
   * Implementations are responsible for interpreting the
   * {@link CreateAccountOptions} (for example BIP-44 derivation or
   * private-key import) and returning the resulting {@link KeyringAccount}
   * objects. Implementors should also ensure that the registry is updated so
   * that {@link getAccount} works for newly created accounts.
   */
  abstract createAccounts(
    options: CreateAccountOptions,
  ): Promise<KeyringAccount[]>;

  /**
   * Remove the account associated with the given {@link AccountId} from this
   * keyring.
   *
   * Implementations are expected to translate the ID to an underlying
   * address (typically via the registry) and then invoke the appropriate
   * removal mechanism on the legacy keyring.
   */
  abstract deleteAccount(accountId: AccountId): Promise<void>;

  /**
   * Export the secrets associated with the given account in a format
   * described by {@link ExportAccountOptions}.
   *
   * This method is optional, and concrete adapters should only
   * implement it if the underlying keyring supports exporting
   * accounts.
   */
  exportAccount?(
    accountId: AccountId,
    options?: ExportAccountOptions,
  ): Promise<ExportedAccount>;

  /**
   * Handle a high-level {@link KeyringRequest} on behalf of this keyring.
   *
   * Concrete adapters are responsible for routing the request's method and
   * parameters to the appropriate legacy keyring APIs (for example signing
   * transactions or decrypting messages) and returning a JSON-serializable
   * result.
   */
  abstract submitRequest(request: KeyringRequest): Promise<Json>;
}
