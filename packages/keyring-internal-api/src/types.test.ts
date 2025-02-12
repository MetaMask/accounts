import { assert } from '@metamask/superstruct';

import type { InternalAccount } from '.';
import { InternalAccountStruct } from '.';

describe('InternalAccount', () => {
  it.each([
    { type: 'eip155:eoa', address: '0x000', scopes: ['eip155:0'] },
    {
      type: 'bip122:p2wpkh',
      address: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
      scopes: ['bip122:000000000019d6689c085ae165831e93'],
    },
  ])('should have the correct structure: %s', ({ type, address, scopes }) => {
    const account = {
      id: '606a7759-b0fb-48e4-9874-bab62ff8e7eb',
      address,
      options: {},
      methods: [],
      scopes,
      type,
      metadata: {
        keyring: {
          type: 'Test Keyring',
        },
        name: 'Account 1',
        importTime: 1713153716,
      },
    };

    expect(() => assert(account, InternalAccountStruct)).not.toThrow();
  });

  it('should throw if metadata.keyring.type is not set', () => {
    const account = {
      id: '606a7759-b0fb-48e4-9874-bab62ff8e7eb',
      address: '0x000',
      options: {},
      methods: [],
      scopes: ['eip155:0'],
      type: 'eip155:eoa',
      metadata: {
        keyring: {},
        name: 'Account 1',
        importTime: 1713153716,
      },
    };

    expect(() => assert(account, InternalAccountStruct)).toThrow(
      'At path: metadata.keyring.type -- Expected a string, but received: undefined',
    );
  });

  it('should throw if metadata.keyring is not set', () => {
    const account = {
      id: '606a7759-b0fb-48e4-9874-bab62ff8e7eb',
      address: '0x000',
      options: {},
      methods: [],
      scopes: ['eip155:0'],
      type: 'eip155:eoa',
      metadata: {
        name: 'Account 1',
        importTime: 1713153716,
      },
    };

    expect(() => assert(account, InternalAccountStruct)).toThrow(
      'At path: metadata.keyring -- Expected an object, but received: undefined',
    );
  });

  it('should throw if metadata is not set', () => {
    const account = {
      id: '606a7759-b0fb-48e4-9874-bab62ff8e7eb',
      address: '0x000',
      options: {},
      methods: [],
      scopes: ['eip155:0'],
      type: 'eip155:eoa',
    };

    expect(() => assert(account, InternalAccountStruct)).toThrow(
      'At path: metadata -- Expected an object, but received: undefined',
    );
  });

  it('should throw if scopes is not set', () => {
    const account = {
      id: '606a7759-b0fb-48e4-9874-bab62ff8e7eb',
      address: '0x000',
      options: {},
      methods: [],
      type: 'eip155:eoa',
    };

    expect(() => assert(account, InternalAccountStruct)).toThrow(
      'At path: scopes -- Expected an array value, but received: undefined',
    );
  });

  it('should throw if there are extra fields', () => {
    const account = {
      id: '606a7759-b0fb-48e4-9874-bab62ff8e7eb',
      address: '0x000',
      options: {},
      methods: [],
      scopes: ['eip155:0'],
      type: 'eip155:eoa',
      metadata: {
        keyring: {
          type: 'Test Keyring',
        },
        name: 'Account 1',
        importTime: 1713153716,
        extra: 'field',
      },
    };

    expect(() => assert(account, InternalAccountStruct)).toThrow(
      'At path: metadata.extra -- Expected a value of type `never`',
    );
  });

  it('should contain snap name, id and enabled if the snap metadata exists', () => {
    const account: InternalAccount = {
      id: '606a7759-b0fb-48e4-9874-bab62ff8e7eb',
      address: '0x000',
      options: {},
      methods: [],
      type: 'eip155:eoa',
      scopes: ['eip155:0'],
      metadata: {
        keyring: {
          type: 'Test Keyring',
        },
        name: 'Account 1',
        importTime: 1713153716,
        snap: {
          id: 'test-snap',
          enabled: true,
          name: 'Test Snap',
        },
      },
    };

    expect(() => assert(account, InternalAccountStruct)).not.toThrow();
  });

  it.each([['name', 'enabled', 'id']])(
    'should throw if snap.%s is not set',
    (key: string) => {
      const account: InternalAccount = {
        id: '606a7759-b0fb-48e4-9874-bab62ff8e7eb',
        address: '0x000',
        options: {},
        methods: [],
        scopes: ['eip155:0'],
        type: 'eip155:eoa',
        metadata: {
          keyring: {
            type: 'Test Keyring',
          },
          name: 'Account 1',
          importTime: 1713153716,
          snap: {
            id: 'test-snap',
            enabled: true,
            name: 'Test Snap',
          },
        },
      };

      // On `InternalAccount` the `metadata.snap` is optional, hence the `?.` here.
      delete account.metadata.snap?.[key as keyof typeof account.metadata.snap];

      const regex = new RegExp(`At path: metadata.snap.${key}`, 'u');

      expect(() => assert(account, InternalAccountStruct)).toThrow(regex);
    },
  );
});
