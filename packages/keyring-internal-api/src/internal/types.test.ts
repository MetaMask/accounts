import { assert } from '@metamask/superstruct';

import { InternalAccountStruct } from '.';

describe('InternalAccount', () => {
  it.each([
    { type: 'eip155:eoa', address: '0x000' },
    {
      type: 'bip122:p2wpkh',
      address: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
    },
  ])('should have the correct structure: %s', ({ type, address }) => {
    const account = {
      id: '606a7759-b0fb-48e4-9874-bab62ff8e7eb',
      address,
      options: {},
      methods: [],
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
      type: 'eip155:eoa',
    };

    expect(() => assert(account, InternalAccountStruct)).toThrow(
      'At path: metadata -- Expected an object, but received: undefined',
    );
  });

  it('should throw if there are extra fields', () => {
    const account = {
      id: '606a7759-b0fb-48e4-9874-bab62ff8e7eb',
      address: '0x000',
      options: {},
      methods: [],
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
    const account = {
      id: '606a7759-b0fb-48e4-9874-bab62ff8e7eb',
      address: '0x000',
      options: {},
      methods: [],
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

    expect(() => assert(account, InternalAccountStruct)).not.toThrow();
  });

  it.each([['name', 'enabled', 'id']])(
    'should throw if snap.%i is not set',
    (key: string) => {
      const account = {
        id: '606a7759-b0fb-48e4-9874-bab62ff8e7eb',
        address: '0x000',
        options: {},
        methods: [],
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

      delete account.metadata.snap[key as keyof typeof account.metadata.snap];

      const regex = new RegExp(`At path: metadata.snap.${key}`, 'u');

      expect(() => assert(account, InternalAccountStruct)).toThrow(regex);
    },
  );
});
