import type { AccountId } from '@metamask/keyring-utils';

import { KeyringAccountRegistry } from './keyring-account-registry';
import type { KeyringAccount } from '../../account';

/**
 * Creates a mock KeyringAccount for testing.
 *
 * @param id - The account ID.
 * @param address - The account address.
 * @returns A mock KeyringAccount.
 */
function createMockAccount(id: AccountId, address: string): KeyringAccount {
  return {
    id,
    type: 'eip155:eoa',
    address,
    scopes: [],
    methods: [],
    options: {},
  };
}

describe('KeyringAccountRegistry', () => {
  describe('register', () => {
    it('registers an address and returns an AccountId', () => {
      const registry = new KeyringAccountRegistry();
      const address = '0xaBc';
      const id = registry.register(address);

      expect(typeof id).toBe('string');
      expect(registry.getAccountId(address)).toBe(id);
    });

    it('reuses the same ID when registering the same address', () => {
      const registry = new KeyringAccountRegistry();
      const address = '0xaBc';
      const firstId = registry.register(address);
      const secondId = registry.register(address);

      expect(firstId).toBe(secondId);
    });
  });

  describe('set and get', () => {
    it('stores and retrieves an account by ID', () => {
      const registry = new KeyringAccountRegistry();
      const address = '0xaBc';
      const id = registry.register(address);
      const account = createMockAccount(id, address);

      registry.set(account);

      expect(registry.get(id)).toBe(account);
    });

    it('returns undefined for unknown AccountId', () => {
      const registry = new KeyringAccountRegistry();

      expect(registry.get('unknown-id' as AccountId)).toBeUndefined();
    });

    it('also registers address mapping when setting account', () => {
      const registry = new KeyringAccountRegistry();
      const id = 'test-id' as AccountId;
      const address = '0xaBc';
      const account = createMockAccount(id, address);

      registry.set(account);

      expect(registry.getAccountId(address)).toBe(id);
    });
  });

  describe('getAddress', () => {
    it('returns address for a registered account', () => {
      const registry = new KeyringAccountRegistry();
      const address = '0xaBc';
      const id = registry.register(address);
      const account = createMockAccount(id, address);

      registry.set(account);

      expect(registry.getAddress(id)).toBe(address);
    });

    it('returns undefined for unknown AccountId', () => {
      const registry = new KeyringAccountRegistry();

      expect(registry.getAddress('unknown-id' as AccountId)).toBeUndefined();
    });
  });

  describe('getAccountId', () => {
    it('returns AccountId for a registered address', () => {
      const registry = new KeyringAccountRegistry();
      const address = '0xaBc';
      const id = registry.register(address);

      expect(registry.getAccountId(address)).toBe(id);
    });

    it('returns undefined for unknown address', () => {
      const registry = new KeyringAccountRegistry();

      expect(registry.getAccountId('0xUnknown')).toBeUndefined();
    });
  });

  describe('delete', () => {
    it('removes an account from the registry', () => {
      const registry = new KeyringAccountRegistry();
      const address = '0xaBc';
      const id = registry.register(address);
      const account = createMockAccount(id, address);

      registry.set(account);
      expect(registry.get(id)).toBe(account);

      registry.delete(id);

      expect(registry.get(id)).toBeUndefined();
      expect(registry.getAccountId(address)).toBeUndefined();
    });

    it('does nothing when deleting unknown AccountId', () => {
      const registry = new KeyringAccountRegistry();

      expect(() => registry.delete('unknown-id' as AccountId)).not.toThrow();
    });
  });

  describe('clear', () => {
    it('removes all accounts from the registry', () => {
      const registry = new KeyringAccountRegistry();
      const address1 = '0xaBc';
      const address2 = '0xDeF';
      const id1 = registry.register(address1);
      const id2 = registry.register(address2);

      registry.set(createMockAccount(id1, address1));
      registry.set(createMockAccount(id2, address2));

      expect(registry.size).toBe(2);

      registry.clear();

      expect(registry.size).toBe(0);
      expect(registry.get(id1)).toBeUndefined();
      expect(registry.get(id2)).toBeUndefined();
    });
  });

  describe('values', () => {
    it('returns all accounts as an array', () => {
      const registry = new KeyringAccountRegistry();
      const address1 = '0xaBc';
      const address2 = '0xDeF';
      const id1 = registry.register(address1);
      const id2 = registry.register(address2);
      const account1 = createMockAccount(id1, address1);
      const account2 = createMockAccount(id2, address2);

      registry.set(account1);
      registry.set(account2);

      const values = registry.values();

      expect(values).toHaveLength(2);
      expect(values).toContain(account1);
      expect(values).toContain(account2);
    });
  });

  describe('keys', () => {
    it('returns all AccountIds as an array', () => {
      const registry = new KeyringAccountRegistry();
      const id1 = registry.register('0xaBc');
      const id2 = registry.register('0xDeF');

      registry.set(createMockAccount(id1, '0xaBc'));
      registry.set(createMockAccount(id2, '0xDeF'));

      const keys = registry.keys();

      expect(keys).toHaveLength(2);
      expect(keys).toContain(id1);
      expect(keys).toContain(id2);
    });
  });

  describe('has', () => {
    it('returns true for existing account', () => {
      const registry = new KeyringAccountRegistry();
      const id = registry.register('0xaBc');

      registry.set(createMockAccount(id, '0xaBc'));

      expect(registry.has(id)).toBe(true);
    });

    it('returns false for non-existing account', () => {
      const registry = new KeyringAccountRegistry();

      expect(registry.has('unknown-id' as AccountId)).toBe(false);
    });
  });

  describe('size', () => {
    it('returns the number of accounts in the registry', () => {
      const registry = new KeyringAccountRegistry();

      expect(registry.size).toBe(0);

      const id1 = registry.register('0xaBc');
      registry.set(createMockAccount(id1, '0xaBc'));

      expect(registry.size).toBe(1);

      const id2 = registry.register('0xDeF');
      registry.set(createMockAccount(id2, '0xDeF'));

      expect(registry.size).toBe(2);
    });
  });
});
