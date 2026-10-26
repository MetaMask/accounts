import {
  EthAccountType,
  EthScope,
  SolAccountType,
  SolScope,
} from '@metamask/keyring-api';
import type { KeyringAccount } from '@metamask/keyring-api';
import type { Keyring as KeyringV2 } from '@metamask/keyring-api/v2';
import { KeyringType } from '@metamask/keyring-api/v2';
import type { Json } from '@metamask/utils';

import { EthKeyringV1Adapter } from './eth';
import { KeyringV1Adapter, isKeyringV1Adapter } from './keyring-v1-adapter';

const MOCK_TYPE = `${KeyringType.Hd}` as const;

const evmAccount: KeyringAccount = {
  id: '111e1111-e89b-12d3-a456-426614174000',
  type: EthAccountType.Eoa,
  address: '0xC728514DF8A7F9271F4B7A4DD2AA6D2D723D3EE3',
  scopes: [EthScope.Eoa],
  options: {},
  methods: [],
};

const solanaAccount: KeyringAccount = {
  id: '222e2222-e89b-12d3-a456-426614174000',
  type: SolAccountType.DataAccount,
  address: 'So11111111111111111111111111111111111111112',
  scopes: [SolScope.Mainnet],
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

    it('handles mixed EVM and non-EVM accounts', async () => {
      const inner = makeMockInner([evmAccount, solanaAccount]);
      const adapter = new KeyringV1Adapter(inner);
      const accounts = await adapter.getAccounts();
      expect(accounts).toStrictEqual([
        evmAccount.address,
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

describe('isKeyringV1Adapter', () => {
  it('returns true for a KeyringV1Adapter', () => {
    expect(isKeyringV1Adapter(new KeyringV1Adapter(makeMockInner()))).toBe(
      true,
    );
  });

  it('returns true for a subclass such as EthKeyringV1Adapter', () => {
    expect(
      isKeyringV1Adapter(new EthKeyringV1Adapter(makeMockInner())),
    ).toBe(true);
  });

  it('returns true for an adapter constructed by a different copy of the class', () => {
    // Models a split dependency tree, where the adapter was constructed by
    // another copy of this package: `instanceof` is then always false even
    // though the structure is identical. This is the scenario the guard
    // replaces `instanceof` for.
    class ForeignCopyKeyringV1Adapter {
      readonly type: string;

      readonly #inner: KeyringV2;

      constructor(inner: KeyringV2) {
        this.#inner = inner;
        this.type = inner.type;
      }

      unwrap(): KeyringV2 {
        return this.#inner;
      }
    }

    const foreignAdapter = new ForeignCopyKeyringV1Adapter(makeMockInner());

    expect(isKeyringV1Adapter(foreignAdapter)).toBe(true);
    // For reference: the `instanceof` check this guard replaces fails here.
    expect(foreignAdapter).not.toBeInstanceOf(KeyringV1Adapter);
  });

  it('returns false for the inner v2 keyring itself', () => {
    expect(isKeyringV1Adapter(makeMockInner())).toBe(false);
  });

  it('returns false for a plain object without unwrap', () => {
    expect(isKeyringV1Adapter({ type: MOCK_TYPE })).toBe(false);
  });

  it('returns false when unwrap is not a function', () => {
    expect(
      isKeyringV1Adapter({ type: MOCK_TYPE, unwrap: 'not-a-function' }),
    ).toBe(false);
  });

  it('returns false for null and undefined', () => {
    expect(isKeyringV1Adapter(null)).toBe(false);
    expect(isKeyringV1Adapter(undefined)).toBe(false);
  });
});
