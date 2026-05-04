import { EthAccountType, EthScope } from '@metamask/keyring-api';
import type { KeyringAccount } from '@metamask/keyring-api';
import { KeyringType } from '@metamask/keyring-api/v2';
import type { SnapId } from '@metamask/snaps-sdk';

import type { SnapKeyringMessenger } from '../SnapKeyringMessenger';
import { SnapKeyring } from './SnapKeyring';
import type { SnapKeyringCallbacks } from './SnapKeyring';
import { SnapKeyringV1 } from './SnapKeyringV1';

const SNAP_ID = 'npm:@metamask/test-snap' as SnapId;

const account1: KeyringAccount = {
  id: 'b05d918a-b37c-497a-bb28-3d15c0d56b7a',
  address: '0xc728514df8a7f9271f4b7a4dd2aa6d2d723d3ee3',
  options: {},
  methods: [],
  scopes: [EthScope.Eoa],
  type: EthAccountType.Eoa,
};

const account2: KeyringAccount = {
  id: '33c96b60-2237-488e-a7bb-233576f3d22f',
  address: '0x34b13912eac00152be0cb409a301ab8e55739e63',
  options: {},
  methods: [],
  scopes: [EthScope.Eoa],
  type: EthAccountType.Eoa,
};

/**
 * Create mock callbacks for `SnapKeyringV1`.
 *
 * @returns Mock callbacks.
 */
function makeMockCallbacks(): SnapKeyringCallbacks {
  return {
    addAccount: jest.fn().mockResolvedValue(undefined),
    removeAccount: jest.fn().mockResolvedValue(undefined),
    saveState: jest.fn().mockResolvedValue(undefined),
    redirectUser: jest.fn().mockResolvedValue(undefined),
    assertAccountCanBeUsed: jest.fn().mockResolvedValue(undefined),
  };
}

/**
 * Create a `SnapKeyringV1` test instance, initialized with the given snap ID
 * and no accounts.
 *
 * @param snapId - The Snap ID to initialize the keyring with.
 * @returns The wrapper and its callbacks.
 */
async function makeKeyring(snapId: SnapId = SNAP_ID): Promise<{
  keyring: SnapKeyringV1;
  callbacks: SnapKeyringCallbacks;
}> {
  const callbacks = makeMockCallbacks();
  const messenger = {
    call: jest.fn(),
    publish: jest.fn(),
  } as unknown as SnapKeyringMessenger;
  const keyring = new SnapKeyringV1({ messenger, callbacks });
  await keyring.deserialize({ snapId, accounts: {} });
  return { keyring, callbacks };
}

describe('SnapKeyringV1', () => {
  describe('type', () => {
    it('static type equals KeyringType.Snap', () => {
      expect(SnapKeyringV1.type).toBe(`${KeyringType.Snap}`);
    });

    it('instance type equals KeyringType.Snap', async () => {
      const { keyring } = await makeKeyring();
      expect(keyring.type).toBe(`${KeyringType.Snap}`);
    });
  });

  describe('asV2', () => {
    it('returns a SnapKeyring instance', async () => {
      const { keyring } = await makeKeyring();
      expect(keyring.asV2()).toBeInstanceOf(SnapKeyring);
    });

    it('returns the same object on repeated calls', async () => {
      const { keyring } = await makeKeyring();
      expect(keyring.asV2()).toBe(keyring.asV2());
    });
  });

  describe('snapId', () => {
    it('delegates to the inner v2 snapId', async () => {
      const { keyring } = await makeKeyring();
      expect(keyring.snapId).toBe(SNAP_ID);
      expect(keyring.snapId).toBe(keyring.asV2().snapId);
    });
  });

  describe('getAccounts', () => {
    it('returns an empty array when there are no accounts', async () => {
      const { keyring } = await makeKeyring();
      expect(await keyring.getAccounts()).toStrictEqual([]);
    });

    it('returns addresses as strings, not KeyringAccount objects', async () => {
      const { keyring } = await makeKeyring();
      keyring.asV2().setAccount(account1);

      const accounts = await keyring.getAccounts();
      expect(typeof accounts[0]).toBe('string');
    });

    it('returns the address for each account', async () => {
      const { keyring } = await makeKeyring();
      keyring.asV2().setAccount(account1);
      keyring.asV2().setAccount(account2);

      expect(await keyring.getAccounts()).toStrictEqual([
        account1.address,
        account2.address,
      ]);
    });
  });

  describe('delegation', () => {
    it('handleKeyringSnapMessage delegates to inner v2', async () => {
      const { keyring } = await makeKeyring();
      const spy = jest
        .spyOn(keyring.asV2(), 'handleKeyringSnapMessage')
        .mockResolvedValue(null);
      const message = {
        method: 'keyring_listAccounts',
        params: {},
      } as unknown as Parameters<SnapKeyring['handleKeyringSnapMessage']>[0];
      await keyring.handleKeyringSnapMessage(message);
      expect(spy).toHaveBeenCalledWith(message);
    });

    it('setSelectedAccounts delegates to inner v2', async () => {
      const { keyring } = await makeKeyring();
      const spy = jest
        .spyOn(keyring.asV2(), 'setSelectedAccounts')
        .mockResolvedValue(undefined);
      await keyring.setSelectedAccounts([account1.id]);
      expect(spy).toHaveBeenCalledWith([account1.id]);
    });

    it('resolveAccountAddress delegates to inner v2', async () => {
      const { keyring } = await makeKeyring();
      const spy = jest
        .spyOn(keyring.asV2(), 'resolveAccountAddress')
        .mockResolvedValue(null);
      const [scope, request] = [
        'eip155:1',
        { method: 'eth_sendTransaction' },
      ] as unknown as Parameters<SnapKeyring['resolveAccountAddress']>;
      await keyring.resolveAccountAddress(scope, request);
      expect(spy).toHaveBeenCalledWith(scope, request);
    });

    it('signTransaction delegates to inner v2', async () => {
      const { keyring } = await makeKeyring();
      const [, tx, opts] = [account1, {}, {}] as unknown as Parameters<
        SnapKeyring['signTransaction']
      >;
      const spy = jest
        .spyOn(keyring.asV2(), 'signTransaction')
        .mockResolvedValue(tx);
      await keyring.signTransaction(account1, tx, opts);
      expect(spy).toHaveBeenCalledWith(account1, tx, opts);
    });

    it('signMessage delegates to inner v2', async () => {
      const { keyring } = await makeKeyring();
      const spy = jest
        .spyOn(keyring.asV2(), 'signMessage')
        .mockResolvedValue('0xsig');
      await keyring.signMessage(account1, '0xdeadbeef');
      expect(spy).toHaveBeenCalledWith(account1, '0xdeadbeef');
    });

    it('signPersonalMessage delegates to inner v2', async () => {
      const { keyring } = await makeKeyring();
      const spy = jest
        .spyOn(keyring.asV2(), 'signPersonalMessage')
        .mockResolvedValue('0xsig');
      await keyring.signPersonalMessage(account1, '0xdeadbeef');
      expect(spy).toHaveBeenCalledWith(account1, '0xdeadbeef');
    });

    it('signTypedData delegates to inner v2', async () => {
      const { keyring } = await makeKeyring();
      const spy = jest
        .spyOn(keyring.asV2(), 'signTypedData')
        .mockResolvedValue('0xsig');
      const [, typedData, opts] = [
        account1,
        { domain: {}, types: {}, message: {} },
        { version: 'V4' },
      ] as unknown as Parameters<SnapKeyring['signTypedData']>;
      await keyring.signTypedData(account1, typedData, opts);
      expect(spy).toHaveBeenCalledWith(account1, typedData, opts);
    });

    it('prepareUserOperation delegates to inner v2', async () => {
      const { keyring } = await makeKeyring();
      const [, , intent] = [account1, [], {}] as unknown as Parameters<
        SnapKeyring['prepareUserOperation']
      >;
      const prepared = {} as unknown as Awaited<
        ReturnType<SnapKeyring['prepareUserOperation']>
      >;
      const spy = jest
        .spyOn(keyring.asV2(), 'prepareUserOperation')
        .mockResolvedValue(prepared);
      await keyring.prepareUserOperation(account1, [], intent);
      expect(spy).toHaveBeenCalledWith(account1, [], intent);
    });

    it('patchUserOperation delegates to inner v2', async () => {
      const { keyring } = await makeKeyring();
      const [, userOp, context] = [
        account1,
        {},
        { chainId: '1' },
      ] as unknown as Parameters<SnapKeyring['patchUserOperation']>;
      const patched = {} as unknown as Awaited<
        ReturnType<SnapKeyring['patchUserOperation']>
      >;
      const spy = jest
        .spyOn(keyring.asV2(), 'patchUserOperation')
        .mockResolvedValue(patched);
      await keyring.patchUserOperation(account1, userOp, context);
      expect(spy).toHaveBeenCalledWith(account1, userOp, context);
    });

    it('signUserOperation delegates to inner v2', async () => {
      const { keyring } = await makeKeyring();
      const [, userOp, context] = [
        account1,
        {},
        { chainId: '1' },
      ] as unknown as Parameters<SnapKeyring['signUserOperation']>;
      const spy = jest
        .spyOn(keyring.asV2(), 'signUserOperation')
        .mockResolvedValue('0xsig');
      await keyring.signUserOperation(account1, userOp, context);
      expect(spy).toHaveBeenCalledWith(account1, userOp, context);
    });

    it('destroy delegates to inner v2', async () => {
      const { keyring } = await makeKeyring();
      const spy = jest
        .spyOn(keyring.asV2(), 'destroy')
        .mockResolvedValue(undefined);
      await keyring.destroy();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('serialize / deserialize', () => {
    it('round-trips state through the inner v2', async () => {
      const { keyring } = await makeKeyring();
      keyring.asV2().setAccount(account1);

      const state = await keyring.serialize();
      expect(state.snapId).toBe(SNAP_ID);
      expect(state.accounts[account1.id]).toStrictEqual(account1);
    });

    it('deserialize sets the snapId on the inner v2', async () => {
      const callbacks = makeMockCallbacks();
      const messenger = {
        call: jest.fn(),
        publish: jest.fn(),
      } as unknown as SnapKeyringMessenger;
      const keyring = new SnapKeyringV1({ messenger, callbacks });

      await keyring.deserialize({ snapId: SNAP_ID, accounts: {} });

      expect(keyring.snapId).toBe(SNAP_ID);
    });
  });
});
