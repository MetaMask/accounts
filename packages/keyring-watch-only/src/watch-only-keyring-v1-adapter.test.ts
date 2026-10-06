import { AccountCreationType } from '@metamask/keyring-api';
import { KeyringType } from '@metamask/keyring-api/v2';
import {
  EthKeyringV1AccountNotFoundError,
  EthKeyringV1MethodNotSupportedError,
  KeyringV1Adapter,
} from '@metamask/keyring-sdk/v2';

import { WatchOnlyKeyring } from './watch-only-keyring';
import {
  isWatchOnlyKeyringV1Adapter,
  WatchOnlyKeyringV1Adapter,
} from './watch-only-keyring-v1-adapter';

const TEST_ADDRESS_1 = '0xd8da6bf26964af9d7eed9e03e53415d37aa96045';
const TEST_ADDRESS_1_CHECKSUMMED = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

type SetupOptions = {
  addresses?: string[];
};

type SetupResult = {
  adapter: WatchOnlyKeyringV1Adapter;
  inner: WatchOnlyKeyring;
  mocks: {
    deleteAccount: jest.SpyInstance<
      ReturnType<WatchOnlyKeyring['deleteAccount']>,
      Parameters<WatchOnlyKeyring['deleteAccount']>
    >;
    lookupByAddress: jest.SpyInstance<
      ReturnType<WatchOnlyKeyring['lookupByAddress']>,
      Parameters<WatchOnlyKeyring['lookupByAddress']>
    >;
  };
};

async function setup({
  addresses = [TEST_ADDRESS_1],
}: SetupOptions = {}): Promise<SetupResult> {
  const inner = new WatchOnlyKeyring();

  for (const address of addresses) {
    await inner.createAccounts({
      type: AccountCreationType.AddressImport,
      address,
    });
  }

  const deleteAccount = jest.spyOn(inner, 'deleteAccount');
  const lookupByAddress = jest.spyOn(inner, 'lookupByAddress');

  return {
    adapter: new WatchOnlyKeyringV1Adapter(inner),
    inner,
    mocks: { deleteAccount, lookupByAddress },
  };
}

describe('isWatchOnlyKeyringV1Adapter', () => {
  it('returns true for a real WatchOnlyKeyringV1Adapter instance', async () => {
    const { adapter } = await setup();

    expect(isWatchOnlyKeyringV1Adapter(adapter)).toBe(true);
  });

  it('returns false for null', () => {
    expect(isWatchOnlyKeyringV1Adapter(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isWatchOnlyKeyringV1Adapter(undefined)).toBe(false);
  });

  it('returns false when type does not match', () => {
    expect(
      isWatchOnlyKeyringV1Adapter({ type: 'hd', unwrap: () => ({}) }),
    ).toBe(false);
  });

  it('returns false when unwrap is missing', () => {
    expect(isWatchOnlyKeyringV1Adapter({ type: KeyringType.WatchOnly })).toBe(
      false,
    );
  });

  it('returns true for a duck-typed object with matching type and unwrap', () => {
    expect(
      isWatchOnlyKeyringV1Adapter({
        type: KeyringType.WatchOnly,
        unwrap: () => ({}),
      }),
    ).toBe(true);
  });

  it('returns false for a raw WatchOnlyKeyring (v2) that lacks unwrap', async () => {
    const { inner } = await setup();

    expect(isWatchOnlyKeyringV1Adapter(inner)).toBe(false);
  });
});

describe('WatchOnlyKeyringV1Adapter', () => {
  it('inherits generic v1 adapter behavior', async () => {
    const { adapter, inner } = await setup();
    const state = await inner.serialize();

    expect(adapter).toBeInstanceOf(KeyringV1Adapter);
    expect(adapter.type).toBe(KeyringType.WatchOnly);
    expect(adapter.unwrap()).toBe(inner);
    expect(await adapter.getAccounts()).toStrictEqual([
      TEST_ADDRESS_1_CHECKSUMMED,
    ]);
    expect(await adapter.serialize()).toStrictEqual(state);

    await adapter.deserialize(state);

    expect(await adapter.getAccounts()).toStrictEqual([
      TEST_ADDRESS_1_CHECKSUMMED,
    ]);
  });

  describe('removeAccount', () => {
    it('removes an account by resolving its address and deleting its account ID', async () => {
      const { adapter, inner, mocks } = await setup();

      const account = inner.lookupByAddress(TEST_ADDRESS_1);

      await adapter.removeAccount(TEST_ADDRESS_1);

      expect(mocks.lookupByAddress).toHaveBeenCalledWith(TEST_ADDRESS_1);
      expect(mocks.deleteAccount).toHaveBeenCalledWith(account?.id);
      expect(await inner.getAccounts()).toStrictEqual([]);
    });

    it('matches the address case-insensitively', async () => {
      const { adapter, inner } = await setup();

      await adapter.removeAccount(TEST_ADDRESS_1_CHECKSUMMED);

      expect(await inner.getAccounts()).toStrictEqual([]);
    });

    it('throws if no account matches the address', async () => {
      const { adapter, mocks } = await setup({ addresses: [] });

      await expect(adapter.removeAccount(TEST_ADDRESS_1)).rejects.toThrow(
        'Account not found',
      );
      expect(mocks.deleteAccount).not.toHaveBeenCalled();
    });
  });

  describe('inherited signing methods', () => {
    it('throws when signing a personal message, since watch-only accounts declare no methods', async () => {
      const { adapter } = await setup();

      await expect(
        adapter.signPersonalMessage(TEST_ADDRESS_1_CHECKSUMMED, '0xdeadbeef'),
      ).rejects.toThrow(EthKeyringV1MethodNotSupportedError);
    });

    it('throws when signing a transaction, since watch-only accounts declare no methods', async () => {
      const { adapter } = await setup();

      await expect(
        adapter.signTransaction(TEST_ADDRESS_1_CHECKSUMMED, {} as never),
      ).rejects.toThrow(EthKeyringV1MethodNotSupportedError);
    });

    it('throws when the address does not resolve to an account', async () => {
      const { adapter } = await setup({ addresses: [] });

      await expect(
        adapter.signPersonalMessage(TEST_ADDRESS_1_CHECKSUMMED, '0xdeadbeef'),
      ).rejects.toThrow(EthKeyringV1AccountNotFoundError);
    });
  });

  describe('exportAccount', () => {
    it('throws, since the watch-only keyring does not support exporting accounts', async () => {
      const { adapter } = await setup();

      await expect(
        adapter.exportAccount(TEST_ADDRESS_1_CHECKSUMMED),
      ).rejects.toThrow('Keyring does not support exportAccount');
    });
  });
});
