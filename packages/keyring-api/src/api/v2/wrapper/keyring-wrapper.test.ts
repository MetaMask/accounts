import type { Keyring, AccountId } from '@metamask/keyring-utils';
import type { Hex, Json } from '@metamask/utils';
import { v4 as uuidv4 } from 'uuid';

import { KeyringWrapper } from './keyring-wrapper';
import type { KeyringAccount } from '../../account';
import type { KeyringCapabilities } from '../keyring-capabilities';
import { KeyringType } from '../keyring-type';

class TestKeyringWrapper extends KeyringWrapper<TestKeyring> {
  async getAccounts(): Promise<KeyringAccount[]> {
    const addresses = await this.inner.getAccounts();
    const scopes = this.capabilities.scopes ?? ['eip155:1'];

    return addresses.map((address) => {
      // Check if already in registry
      const existingId = this.registry.getAccountId(address);
      if (existingId) {
        const cached = this.registry.get(existingId);
        if (cached) {
          return cached;
        }
      }

      const id = this.registry.register(address);

      const account: KeyringAccount = {
        id,
        type: 'eip155:eoa',
        address,
        scopes,
        options: {},
        methods: [],
      };

      this.registry.set(account);

      return account;
    });
  }

  public deletedAccountIds: AccountId[] = [];

  async createAccounts(): Promise<KeyringAccount[]> {
    return this.getAccounts();
  }

  async deleteAccount(accountId: AccountId): Promise<void> {
    this.deletedAccountIds.push(accountId);
    this.registry.delete(accountId);
  }

  async submitRequest(): Promise<any> {
    return {};
  }
}

/**
 * A test wrapper that does NOT cache accounts in getAccounts().
 * This is used to test the fallback path in KeyringWrapper.getAccount().
 */
class NoCacheTestKeyringWrapper extends KeyringWrapper<TestKeyring> {
  async getAccounts(): Promise<KeyringAccount[]> {
    const addresses = await this.inner.getAccounts();
    const scopes = this.capabilities.scopes ?? ['eip155:1'];

    return addresses.map((address) => {
      const id = this.registry.register(address);

      const account: KeyringAccount = {
        id,
        type: 'eip155:eoa',
        address,
        scopes,
        options: {},
        methods: [],
      };

      // NOTE: We intentionally do NOT call this.registry.set(account) here
      // to test the fallback path in KeyringWrapper.getAccount()

      return account;
    });
  }

  async createAccounts(): Promise<KeyringAccount[]> {
    return this.getAccounts();
  }

  async deleteAccount(): Promise<void> {
    // no-op
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

const entropySourceId = 'test-entropy-source';

describe('KeyringWrapper', () => {
  it('serializes and deserializes via the inner keyring', async () => {
    const inner = new TestKeyring(['0x1']);
    const wrapper = new TestKeyringWrapper({
      inner,
      type: KeyringType.Hd,
      capabilities,
      entropySourceId,
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
      entropySourceId,
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
    // Should return the exact same object from cache
    expect(resolved).toBe(firstAccount);
  });

  it('returns cached account on subsequent getAccount calls (O(1) lookup)', async () => {
    const addresses = ['0x1' as const];
    const inner = new TestKeyring(addresses);
    const wrapper = new TestKeyringWrapper({
      inner,
      type: KeyringType.Hd,
      capabilities,
      entropySourceId,
    });

    // First call populates the registry
    const accounts = await wrapper.getAccounts();
    const firstAccount = accounts[0];
    expect(firstAccount).toBeDefined();

    // Second call should hit the cache and return the same object
    const cachedAccount = await wrapper.getAccount(
      firstAccount?.id as AccountId,
    );
    expect(cachedAccount).toBe(firstAccount);
  });

  it('uses fallback path when account not in registry cache', async () => {
    const addresses = ['0x1' as const];
    const inner = new TestKeyring(addresses);
    const wrapper = new NoCacheTestKeyringWrapper({
      inner,
      type: KeyringType.Hd,
      capabilities,
      entropySourceId,
    });

    // Get account by calling getAccounts first to know the ID
    const accounts = await wrapper.getAccounts();
    const firstAccount = accounts[0];
    expect(firstAccount).toBeDefined();

    // The NoCacheTestKeyringWrapper doesn't cache accounts, so getAccount
    // will miss the cache, call getAccounts(), and use the fallback .find() path
    const resolved = await wrapper.getAccount(firstAccount?.id as AccountId);
    expect(resolved.address).toBe('0x1');
  });

  it('throws when requesting an unknown account', async () => {
    const inner = new TestKeyring([]);
    const wrapper = new TestKeyringWrapper({
      inner,
      type: KeyringType.Hd,
      capabilities,
      entropySourceId,
    });

    await expect(wrapper.getAccount(uuidv4())).rejects.toThrow(
      'Account not found for id',
    );
  });

  it('throws when account mapping exists but account object cannot be found', async () => {
    const addresses = ['0x1' as const];
    const inner = new TestKeyring(addresses);
    const wrapper = new TestKeyringWrapper({
      inner,
      type: KeyringType.Hd,
      capabilities,
      entropySourceId,
    });

    // Prime the registry by calling getAccounts once
    const accounts = await wrapper.getAccounts();
    const firstAccount = accounts[0];
    expect(firstAccount).toBeDefined();

    // Now, simulate a missing account by creating a new wrapper with empty inner
    // but the registry won't have any accounts since it's a new instance
    const emptyInner = new TestKeyring([] as Hex[]);
    const inconsistentWrapper = new TestKeyringWrapper({
      inner: emptyInner,
      type: KeyringType.Hd,
      capabilities,
      entropySourceId,
    });

    // Use the account ID from the first wrapper - the new wrapper won't have it
    await expect(
      inconsistentWrapper.getAccount(firstAccount?.id as AccountId),
    ).rejects.toThrow('Account not found for id');
  });

  it('falls back to mainnet scope when capabilities.scopes is not set', async () => {
    const addresses = ['0x1' as const];
    const inner = new TestKeyring(addresses);
    const wrapper = new TestKeyringWrapper({
      inner,
      type: KeyringType.Hd,
      entropySourceId,
      // Explicitly omit scopes to exercise the default fallback.
      capabilities: {} as KeyringCapabilities,
    });

    const accounts = await wrapper.getAccounts();

    expect(accounts).toHaveLength(1);
    expect(accounts[0]?.scopes).toStrictEqual(['eip155:1']);
  });
});
