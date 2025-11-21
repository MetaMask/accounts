import type { Keyring, AccountId } from '@metamask/keyring-utils';
import type { Hex, Json } from '@metamask/utils';
import { v4 as uuidv4 } from 'uuid';

import { InMemoryKeyringAddressResolver } from './keyring-address-resolver';
import { KeyringWrapper } from './keyring-wrapper';
import type { KeyringAccount } from '../../account';
import type { KeyringCapabilities } from '../keyring-capabilities';
import { KeyringType } from '../keyring-type';

class TestKeyringWrapper extends KeyringWrapper<TestKeyring> {
  async getAccounts(): Promise<KeyringAccount[]> {
    const addresses = await this.inner.getAccounts();
    const scopes = this.capabilities.scopes ?? ['eip155:1'];

    return addresses.map((address) => {
      const id = this.resolver.register(address);

      const account: KeyringAccount = {
        id,
        type: 'eip155:eoa',
        address,
        scopes,
        options: {},
        methods: [],
      };

      return account;
    });
  }
  public deletedAccountIds: AccountId[] = [];

  async createAccounts(): Promise<KeyringAccount[]> {
    return this.getAccounts();
  }

  async deleteAccount(accountId: AccountId): Promise<void> {
    this.deletedAccountIds.push(accountId);
  }

  async submitRequest(): Promise<any> {
    return {};
  }
}

class TestKeyring implements Keyring {
  static type = 'Test Keyring';

  public type = TestKeyring.type;

  readonly #accounts: Hex[];

  public lastDeserializedState: Json | undefined;

  constructor(addresses: Hex[] = []) {
    this.#accounts = addresses;
  }

  async serialize(): Promise<Json> {
    return { accounts: this.#accounts };
  }

  async deserialize(state: Json): Promise<void> {
    this.lastDeserializedState = state;
  }

  async getAccounts(): Promise<Hex[]> {
    return this.#accounts;
  }

  async addAccounts(_numberOfAccounts = 1): Promise<Hex[]> {
    return this.#accounts;
  }
}

const capabilities: KeyringCapabilities = {
  scopes: ['eip155:10'],
};

describe('KeyringWrapper', () => {
  it('serializes and deserializes via the inner keyring', async () => {
    const inner = new TestKeyring(['0x1']);
    const wrapper = new TestKeyringWrapper({
      inner,
      type: KeyringType.Hd,
      capabilities,
    });

    const state = await wrapper.serialize();
    expect(state).toStrictEqual({ accounts: ['0x1'] });

    await wrapper.deserialize(state);
    expect(inner.lastDeserializedState).toStrictEqual(state);
  });

  it('returns accounts with stable IDs and correct addresses', async () => {
    const addresses = ['0x1' as const, '0x2' as const];
    const inner = new TestKeyring(addresses);
    const wrapper = new TestKeyringWrapper({
      inner,
      type: KeyringType.Hd,
      capabilities,
    });

    const accounts = await wrapper.getAccounts();

    expect(accounts).toHaveLength(addresses.length);

    const ids = new Set<string>();
    accounts.forEach((account: KeyringAccount, index) => {
      expect(account.address).toBe(addresses[index]);
      expect(account.type).toBe('eip155:eoa');
      expect(account.scopes).toStrictEqual(capabilities.scopes);
      expect(account.options).toStrictEqual({});
      expect(account.methods).toStrictEqual([]);

      ids.add(account.id);
    });

    // Ensure IDs are unique
    expect(ids.size).toBe(addresses.length);

    // getAccount should resolve by ID
    const [firstAccount] = accounts;
    expect(firstAccount).toBeDefined();
    if (!firstAccount) {
      throw new Error('Expected at least one account from the wrapper');
    }
    const resolved = await wrapper.getAccount(firstAccount.id);
    expect(resolved.address).toBe(firstAccount.address);
  });

  it('throws when requesting an unknown account', async () => {
    const inner = new TestKeyring([]);
    const wrapper = new TestKeyringWrapper({
      inner,
      type: KeyringType.Hd,
      capabilities,
    });

    await expect(wrapper.getAccount(uuidv4())).rejects.toThrow(
      'Account not found for id',
    );
  });

  it('throws when account mapping exists but account object cannot be found', async () => {
    const addresses = ['0x1' as const];
    const inner = new TestKeyring(addresses);
    const resolver = new InMemoryKeyringAddressResolver();
    const wrapper = new TestKeyringWrapper({
      inner,
      type: KeyringType.Hd,
      capabilities,
      resolver,
    });

    // Prime the resolver by calling getAccounts once
    await wrapper.getAccounts();

    // Now, simulate a missing account object by clearing the underlying
    // accounts of the inner keyring.
    const emptyInner = new TestKeyring([] as Hex[]);
    const inconsistentWrapper = new TestKeyringWrapper({
      inner: emptyInner,
      type: KeyringType.Hd,
      capabilities,
      resolver,
    });

    const accountId = resolver.getAccountId(
      addresses[0] as string,
    ) as AccountId;

    await expect(inconsistentWrapper.getAccount(accountId)).rejects.toThrow(
      'Account not found for id',
    );
  });

  it('falls back to mainnet scope when capabilities.scopes is not set', async () => {
    const addresses = ['0x1' as const];
    const inner = new TestKeyring(addresses);
    const wrapper = new TestKeyringWrapper({
      inner,
      type: KeyringType.Hd,
      // Explicitly omit scopes to exercise the default fallback.
      capabilities: {} as KeyringCapabilities,
    });

    const accounts = await wrapper.getAccounts();

    expect(accounts).toHaveLength(1);
    expect(accounts[0]?.scopes).toStrictEqual(['eip155:1']);
  });
});
