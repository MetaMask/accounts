import type { KeyringAccount } from '@metamask/keyring-api';
import type { Keyring as KeyringV2 } from '@metamask/keyring-api/v2';
import { KeyringType } from '@metamask/keyring-api/v2';
import type { Json } from '@metamask/utils';

import { KeyringV1Adapter } from './keyring-v1-adapter';

const MOCK_TYPE = `${KeyringType.Hd}` as const;

const evmAccount: KeyringAccount = {
  id: '111e1111-e89b-12d3-a456-426614174000',
  type: 'eip155:eoa',
  address: '0xC728514DF8A7F9271F4B7A4DD2AA6D2D723D3EE3',
  scopes: ['eip155:1'],
  options: {},
  methods: [],
};

const solanaAccount: KeyringAccount = {
  id: '222e2222-e89b-12d3-a456-426614174000',
  type: 'solana:data-account',
  address: 'So11111111111111111111111111111111111111112',
  scopes: ['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'],
  options: {},
  methods: [],
};

function makeMockInner(
  accounts: KeyringAccount[] = [],
  state: Json = {},
): jest.Mocked<KeyringV2> {
  return {
    type: MOCK_TYPE,
    capabilities: { scopes: ['eip155:1'] },
    getAccounts: jest.fn().mockResolvedValue(accounts),
    getAccount: jest.fn(),
    createAccounts: jest.fn(),
    deleteAccount: jest.fn(),
    submitRequest: jest.fn(),
    serialize: jest.fn().mockResolvedValue(state),
    deserialize: jest.fn().mockResolvedValue(undefined),
  };
}

describe('KeyringV1Adapter', () => {
  describe('type', () => {
    it('mirrors the inner keyring type', () => {
      const inner = makeMockInner();
      const adapter = new KeyringV1Adapter(inner);
      expect(adapter.type).toBe(MOCK_TYPE);
    });
  });

  describe('unwrap', () => {
    it('returns the inner v2 instance', () => {
      const inner = makeMockInner();
      const adapter = new KeyringV1Adapter(inner);
      expect(adapter.unwrap()).toBe(inner);
    });

    it('returns the same object on repeated calls', () => {
      const inner = makeMockInner();
      const adapter = new KeyringV1Adapter(inner);
      expect(adapter.unwrap()).toBe(adapter.unwrap());
    });
  });

  describe('getAccounts', () => {
    it('returns an empty array when there are no accounts', async () => {
      const inner = makeMockInner([]);
      const adapter = new KeyringV1Adapter(inner);
      expect(await adapter.getAccounts()).toStrictEqual([]);
    });

    it('returns addresses as strings', async () => {
      const inner = makeMockInner([evmAccount]);
      const adapter = new KeyringV1Adapter(inner);
      const accounts = await adapter.getAccounts();
      expect(accounts).toHaveLength(1);
      expect(typeof accounts[0]).toBe('string');
    });

    it('lowercases EVM account addresses', async () => {
      const inner = makeMockInner([evmAccount]);
      const adapter = new KeyringV1Adapter(inner);
      const accounts = await adapter.getAccounts();
      expect(accounts[0]).toBe(evmAccount.address.toLowerCase());
    });

    it('does not lowercase non-EVM account addresses', async () => {
      const inner = makeMockInner([solanaAccount]);
      const adapter = new KeyringV1Adapter(inner);
      const accounts = await adapter.getAccounts();
      expect(accounts[0]).toBe(solanaAccount.address);
    });

    it('handles mixed EVM and non-EVM accounts', async () => {
      const inner = makeMockInner([evmAccount, solanaAccount]);
      const adapter = new KeyringV1Adapter(inner);
      const accounts = await adapter.getAccounts();
      expect(accounts).toStrictEqual([
        evmAccount.address.toLowerCase(),
        solanaAccount.address,
      ]);
    });
  });

  describe('serialize', () => {
    it('delegates serialize to the inner instance', async () => {
      const state = { key: 'value' };
      const inner = makeMockInner([], state);
      const adapter = new KeyringV1Adapter(inner);
      expect(await adapter.serialize()).toStrictEqual(state);
      expect(inner.serialize).toHaveBeenCalledTimes(1);
    });
  });

  describe('deserialize', () => {
    it('delegates deserialize to the inner instance', async () => {
      const state = { key: 'value' };
      const inner = makeMockInner();
      const adapter = new KeyringV1Adapter(inner);
      await adapter.deserialize(state);
      expect(inner.deserialize).toHaveBeenCalledWith(state);
    });
  });
});
