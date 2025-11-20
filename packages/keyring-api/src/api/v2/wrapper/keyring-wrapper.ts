import type { Keyring } from '@metamask/keyring-utils';
import type { AccountId } from '@metamask/keyring-utils';

import type { KeyringAccount } from '../../account';
import type { KeyringRequest } from '../../request';
import type { Json } from '@metamask/utils';
import type { KeyringV2 } from '../keyring';
import { KeyringType } from '../keyring-type';
import type {
  CreateAccountOptions,
  ExportAccountOptions,
  ExportedAccount,
} from '../index';
import type { KeyringCapabilities } from '../keyring-capabilities';
import {
  InMemoryKeyringAddressResolver,
  type KeyringAddressResolver,
} from './keyring-address-resolver';

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
   */
  async serialize(): Promise<Json> {
    return this.inner.serialize();
  }

  /**
   * Hydrate the underlying keyring from a previously serialized state.
   *
   * This simply delegates to the legacy keyring's {@link Keyring.deserialize}
   * implementation.
   */
  async deserialize(state: Json): Promise<void> {
    await this.inner.deserialize(state);
  }

  /**
   * Return all accounts managed by this keyring.
   *
   * This generic implementation establishes the account ID/address mapping
   * using the configured {@link KeyringAddressResolver} and exposes each
   * address as an `eip155:eoa` account with the `eip155:1` (Ethereum mainnet)
   * scope. Concrete adapters may override this method if they need to provide
   * different account types, scopes, or options.
   */
  async getAccounts(): Promise<KeyringAccount[]> {
    const addresses = await this.inner.getAccounts();

    return addresses.map((address) => {
      const id = this.resolver.register(address);

      const account: KeyringAccount = {
        id,
        type: 'eip155:eoa',
        address,
        scopes: ['eip155:1'],
        options: {},
        methods: [],
      };

      return account;
    });
  }

  /**
   * Look up a single account by its {@link AccountId}.
   *
   * This method calls {@link getAccounts} and returns the matching
   * {@link KeyringAccount} by ID, or throws if the ID is unknown in the
   * current account set.
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
   * Implementations should enforce the capabilities of the underlying
   * keyring (for example whether private-key export is allowed) and wrap
   * the result into an {@link ExportedAccount} structure.
   */
  abstract exportAccount(
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
