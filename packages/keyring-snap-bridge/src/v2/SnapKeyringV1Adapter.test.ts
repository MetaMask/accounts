import type { KeyringAccount } from '@metamask/keyring-api';
import { EthAccountType, EthScope } from '@metamask/keyring-api';
import { KeyringType } from '@metamask/keyring-api/v2';
import { KeyringV1Adapter } from '@metamask/keyring-sdk/v2';
import type { AccountId } from '@metamask/keyring-utils';
import type { SnapId } from '@metamask/snaps-sdk';

import type { SnapKeyringMessenger } from '../SnapKeyringMessenger';
import { SnapKeyring } from './SnapKeyring';
import type { SnapKeyringCallbacks, SnapKeyringState } from './SnapKeyring';
import { SnapKeyringV1Adapter } from './SnapKeyringV1Adapter';

const ACCOUNT_ID = 'f2b88e0e-82a4-4e93-8c60-4fe59c6892d7';
const ACCOUNT_ADDRESS = '0xdeadbeef00000000000000000000000000000000';
const OTHER_ACCOUNT_ID = '978b6a3d-ce0f-4fc9-9746-70ea61fa714f';
const OTHER_ACCOUNT_ADDRESS = '0xcafecafe00000000000000000000000000000000';
const SNAP_ID = 'local:snap.mock' as SnapId;

type SetupOptions = {
  accounts?: KeyringAccount[];
};

function buildAccount({
  id = ACCOUNT_ID,
  address = ACCOUNT_ADDRESS,
}: {
  id?: AccountId;
  address?: string;
} = {}): KeyringAccount {
  return {
    id,
    type: EthAccountType.Eoa,
    address,
    scopes: [EthScope.Eoa],
    options: {},
    methods: [],
  };
}

type SetupResult = {
  adapter: SnapKeyringV1Adapter;
  inner: SnapKeyring;
  mocks: {
    deleteAccount: jest.SpyInstance<
      ReturnType<SnapKeyring['deleteAccount']>,
      Parameters<SnapKeyring['deleteAccount']>
    >;
    deserialize: jest.SpyInstance<
      ReturnType<SnapKeyring['deserialize']>,
      Parameters<SnapKeyring['deserialize']>
    >;
    lookupByAddress: jest.SpyInstance<
      ReturnType<SnapKeyring['lookupByAddress']>,
      Parameters<SnapKeyring['lookupByAddress']>
    >;
  };
};

async function setup({
  accounts = [buildAccount()],
}: SetupOptions = {}): Promise<SetupResult> {
  const state: SnapKeyringState = {
    snapId: SNAP_ID,
    accounts: Object.fromEntries(
      accounts.map((account) => [account.id, account]),
    ),
  };

  const inner = new SnapKeyring({
    callbacks: buildCallbacks(),
    messenger: buildMessenger(),
  });
  await inner.deserialize(state);

  const deleteAccount = jest
    .spyOn(inner, 'deleteAccount')
    .mockResolvedValue(undefined);
  const deserialize = jest.spyOn(inner, 'deserialize');
  const lookupByAddress = jest.spyOn(inner, 'lookupByAddress');

  return {
    adapter: new SnapKeyringV1Adapter({ keyring: inner }),
    inner,
    mocks: {
      deleteAccount,
      deserialize,
      lookupByAddress,
    },
  };
}

function buildCallbacks(): SnapKeyringCallbacks {
  return {
    addAccount: jest
      .fn<
        ReturnType<SnapKeyringCallbacks['addAccount']>,
        Parameters<SnapKeyringCallbacks['addAccount']>
      >()
      .mockResolvedValue(undefined),
    removeAccount: jest
      .fn<
        ReturnType<SnapKeyringCallbacks['removeAccount']>,
        Parameters<SnapKeyringCallbacks['removeAccount']>
      >()
      .mockResolvedValue(undefined),
    saveState: jest
      .fn<
        ReturnType<SnapKeyringCallbacks['saveState']>,
        Parameters<SnapKeyringCallbacks['saveState']>
      >()
      .mockResolvedValue(undefined),
    redirectUser: jest
      .fn<
        ReturnType<SnapKeyringCallbacks['redirectUser']>,
        Parameters<SnapKeyringCallbacks['redirectUser']>
      >()
      .mockResolvedValue(undefined),
    assertAccountCanBeUsed: jest
      .fn<
        ReturnType<SnapKeyringCallbacks['assertAccountCanBeUsed']>,
        Parameters<SnapKeyringCallbacks['assertAccountCanBeUsed']>
      >()
      .mockResolvedValue(undefined),
  };
}

function buildMessenger(): SnapKeyringMessenger {
  return {
    call: jest.fn(),
    publish: jest.fn(),
  } as unknown as SnapKeyringMessenger;
}

describe('SnapKeyringV1Adapter', () => {
  it('inherits generic v1 adapter behavior', async () => {
    const account = buildAccount();
    const otherAccount = buildAccount({
      id: OTHER_ACCOUNT_ID,
      address: OTHER_ACCOUNT_ADDRESS,
    });
    const { adapter, inner, mocks } = await setup({
      accounts: [account, otherAccount],
    });
    const state: SnapKeyringState = {
      snapId: SNAP_ID,
      accounts: {},
    };

    expect(adapter).toBeInstanceOf(KeyringV1Adapter);
    expect(adapter.type).toBe(KeyringType.Snap);
    expect(adapter.unwrap()).toBe(inner);
    expect(await adapter.getAccounts()).toStrictEqual([
      ACCOUNT_ADDRESS,
      OTHER_ACCOUNT_ADDRESS,
    ]);
    expect(await adapter.serialize()).toStrictEqual({
      snapId: SNAP_ID,
      accounts: {
        [ACCOUNT_ID]: account,
        [OTHER_ACCOUNT_ID]: otherAccount,
      },
    });

    await adapter.deserialize(state);

    expect(mocks.deserialize).toHaveBeenCalledWith(state);
  });

  it('removes an account by resolving its address and deleting its account ID', async () => {
    const { adapter, mocks } = await setup();

    await adapter.removeAccount(ACCOUNT_ADDRESS);

    expect(mocks.lookupByAddress).toHaveBeenCalledWith(ACCOUNT_ADDRESS);
    expect(mocks.deleteAccount).toHaveBeenCalledWith(ACCOUNT_ID);
  });

  it('throws if no account matches the address', async () => {
    const { adapter, mocks } = await setup({ accounts: [] });

    await expect(adapter.removeAccount(ACCOUNT_ADDRESS)).rejects.toThrow(
      `Account '${ACCOUNT_ADDRESS}' not found`,
    );
    expect(mocks.deleteAccount).not.toHaveBeenCalled();
  });
});
