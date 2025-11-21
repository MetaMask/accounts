import type { Keyring, AccountId } from '@metamask/keyring-utils';
import type { Json } from '@metamask/utils';

import {
  InMemoryKeyringAddressResolver,
  type KeyringAddressResolver,
} from './keyring-address-resolver';
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
export type KeyringWrapperOptions<TInnerKeyring extends Keyring> = {
  /**
   * The underlying "old" keyring instance that this wrapper adapts.
   */
  inner: TInnerKeyring;

  /**
   * The concrete keyring type exposed through the V2 interface.
   */
  type: KeyringType;

  /**
   * Capabilities of the underlying keyring.
   */
  capabilities: KeyringCapabilities;

  /**
   * Resolver used to map between AccountId and underlying addresses. If not
   * provided, an in-memory resolver will be used.
   */
  resolver?: KeyringAddressResolver;
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
export abstract class KeyringWrapper<TInnerKeyring extends Keyring>
  implements KeyringV2
{
  readonly type: `${KeyringType}`;

  readonly capabilities: KeyringCapabilities;

  protected readonly inner: TInnerKeyring;

  protected readonly resolver: KeyringAddressResolver;

  constructor(options: KeyringWrapperOptions<TInnerKeyring>) {
    this.inner = options.inner;
    this.type = `${options.type}`;
    this.capabilities = options.capabilities;
    this.resolver = options.resolver ?? new InMemoryKeyringAddressResolver();
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
   * This simply delegates to the legacy keyring's {@link Keyring.deserialize}
   * implementation.
   *
   * @param state - The serialized keyring state.
   */
  async deserialize(state: Json): Promise<void> {
    await this.inner.deserialize(state);
  }

  /**
   * Return all accounts managed by this keyring.
   *
   * Concrete adapters are responsible for mapping the underlying keyring's
   * notion of accounts (typically addresses returned by
   * {@link Keyring.getAccounts}) into {@link KeyringAccount} objects.
   * Implementations should use the configured {@link KeyringAddressResolver}
   * to establish the account ID/address mapping so that
   * {@link getAccount} works as expected.
   *
   * @returns The list of managed accounts.
   */
  abstract getAccounts(): Promise<KeyringAccount[]>;

  /**
   * Look up a single account by its {@link AccountId}.
   *
   * This method calls {@link getAccounts} and returns the matching
   * {@link KeyringAccount} by ID, or throws if the ID is unknown in the
   * current account set.
   *
   * @param accountId - The AccountId to look up.
   * @returns The matching KeyringAccount.
   */
  async getAccount(accountId: AccountId): Promise<KeyringAccount> {
    const accounts = await this.getAccounts();
    const account = accounts.find((item) => item.id === accountId);
    if (!account) {
      throw new Error(`Account not found for id: ${accountId}`);
    }

    return account;
  }

  /**
   * Create one or more new accounts managed by this keyring.
   *
   * Implementations are responsible for interpreting the
   * {@link CreateAccountOptions} (for example BIP-44 derivation or
   * private-key import) and returning the resulting {@link KeyringAccount}
   * objects. Implementors should also ensure that the resolver is updated so
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
   * address (typically via the resolver) and then invoke the appropriate
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
