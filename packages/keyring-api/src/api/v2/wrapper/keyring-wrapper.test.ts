import type { Keyring } from '@metamask/keyring-utils';
import type { AccountId } from '@metamask/keyring-utils';
import type { Hex } from '@metamask/utils';
import type { Json } from '@metamask/utils';
import { v4 as uuidv4 } from 'uuid';

import type { KeyringAccount } from '../../account';
import { KeyringType } from '../keyring-type';
import type { KeyringCapabilities } from '../keyring-capabilities';
import { KeyringWrapper } from './keyring-wrapper';
import { InMemoryKeyringAddressResolver } from './keyring-address-resolver';

class TestKeyringWrapper extends KeyringWrapper<TestKeyring> {
  async createAccounts() {
    return this.getAccounts();
  }

  async deleteAccount(_accountId: AccountId) {}

  async exportAccount(): Promise<any> {
    return {};
  }

  async submitRequest() {
    return {};
  }
}

class TestKeyring implements Keyring {
  static type = 'Test Keyring';

  public type = TestKeyring.type;

  private readonly accounts: Hex[];

  public lastDeserializedState: Json | undefined;

  constructor(addresses: Hex[] = []) {
    this.accounts = addresses;
  }

  async serialize(): Promise<Json> {
    return { accounts: this.accounts };
  }

  async deserialize(state: Json): Promise<void> {
    this.lastDeserializedState = state;
  }

  async getAccounts(): Promise<Hex[]> {
    return this.accounts;
  }

  async addAccounts(_numberOfAccounts = 1): Promise<Hex[]> {
    return this.accounts;
  }
}

const capabilities: KeyringCapabilities = {
  scopes: ['eip155:1'],
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
    expect(state).toEqual({ accounts: ['0x1'] });

    await wrapper.deserialize(state);
    expect(inner.lastDeserializedState).toEqual(state);
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
      expect(account.scopes).toEqual(['eip155:1']);
      expect(account.options).toEqual({});
      expect(account.methods).toEqual([]);

      ids.add(account.id);
    });

    // Ensure IDs are unique
    expect(ids.size).toBe(addresses.length);

    // getAccount should resolve by ID
    const firstAccount = accounts[0]!;
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
});
