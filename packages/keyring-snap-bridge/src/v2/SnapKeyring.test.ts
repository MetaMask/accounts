import { EthAccountType, EthScope } from '@metamask/keyring-api';
import type {
  KeyringAccount,
  CreateAccountOptions,
} from '@metamask/keyring-api';
import { KeyringInternalSnapClient } from '@metamask/keyring-internal-snap-client';
import type { SnapId } from '@metamask/snaps-sdk';

import type { SnapKeyringMessenger } from '../SnapKeyringMessenger';
import type { SnapKeyringCallbacks } from './SnapKeyring';
import { SnapKeyring } from './SnapKeyring';

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
 * Create mock callbacks for `SnapKeyring`.
 *
 * @returns Mock callbacks.
 */
function makeMockCallbacks(): SnapKeyringCallbacks {
  return {
    // V1 base callbacks
    addAccount: jest.fn<Promise<void>, any[]>().mockResolvedValue(undefined),
    removeAccount: jest.fn<Promise<void>, any[]>().mockResolvedValue(undefined),
    saveState: jest.fn<Promise<void>, []>().mockResolvedValue(undefined),
    redirectUser: jest.fn<Promise<void>, any[]>().mockResolvedValue(undefined),
    assertAccountCanBeUsed: jest
      .fn<Promise<void>, [KeyringAccount]>()
      .mockResolvedValue(undefined),
    isUnlocked: jest.fn<boolean, []>().mockReturnValue(true),
  };
}

/**
 * Create a `SnapKeyring` test instance with tracking arrays for callbacks.
 *
 * The keyring is initialized (via `deserialize`) with the given snap ID and
 * no accounts so that `snapId` and the internal snap client are available
 * immediately after construction.
 *
 * @param snapId - The Snap ID to initialize the keyring with.
 * @param callbackOverrides - Optional callback overrides.
 * @returns The keyring, arrays of registered/unregistered IDs, and mock callbacks.
 */
async function makeKeyring(
  snapId: SnapId = SNAP_ID,
  callbackOverrides?: Partial<SnapKeyringCallbacks>,
): Promise<{
  keyring: SnapKeyring;
  registered: string[];
  unregistered: string[];
  callbacks: SnapKeyringCallbacks;
}> {
  const registered: string[] = [];
  const unregistered: string[] = [];
  const callbacks: SnapKeyringCallbacks = {
    ...makeMockCallbacks(),
    ...callbackOverrides,
    onRegister: (id): void => {
      registered.push(id);
    },
    onUnregister: (id): void => {
      unregistered.push(id);
    },
  };
  const messenger = {
    call: jest.fn(),
    publish: jest.fn(),
  } as unknown as SnapKeyringMessenger;
  const keyring = new SnapKeyring({ messenger, callbacks });
  await keyring.deserialize({ snapId, accounts: {} });
  return { keyring, registered, unregistered, callbacks };
}

describe('SnapKeyring', () => {
  describe('snapId', () => {
    it('returns the snap ID set during deserialize', async () => {
      const { keyring } = await makeKeyring();
      expect(keyring.snapId).toBe(SNAP_ID);
    });

    it('throws before deserialize is called', () => {
      const messenger = {
        call: jest.fn(),
        publish: jest.fn(),
      } as unknown as SnapKeyringMessenger;
      const keyring = new SnapKeyring({
        messenger,
        callbacks: makeMockCallbacks(),
      });
      expect(() => keyring.snapId).toThrow(
        'SnapKeyring has not been initialized',
      );
    });

    it('throws when deserializing with a different snap ID', async () => {
      const { keyring } = await makeKeyring(SNAP_ID);
      await expect(
        keyring.deserialize({
          snapId: 'npm:@metamask/other-snap' as SnapId,
          accounts: {},
        }),
      ).rejects.toThrow(
        `SnapKeyring bound to '${SNAP_ID}' cannot be rebound to 'npm:@metamask/other-snap'`,
      );
    });
  });

  describe('setAccount', () => {
    it('adds a new account and fires onRegister', async () => {
      const { keyring, registered } = await makeKeyring();
      keyring.setAccount(account1);
      expect(keyring.hasAccount(account1.id)).toBe(true);
      expect(registered).toStrictEqual([account1.id]);
    });

    it('updates an existing account without firing onRegister again', async () => {
      const { keyring, registered } = await makeKeyring();
      keyring.setAccount(account1);
      const updated = { ...account1, options: { updated: true } };
      keyring.setAccount(updated);
      // onRegister fired only once (on the initial add)
      expect(registered).toStrictEqual([account1.id]);
      expect(keyring.lookupAccount(account1.id)).toStrictEqual(updated);
    });
  });

  describe('removeAccount', () => {
    it('removes an existing account and fires onUnregister', async () => {
      const { keyring, unregistered } = await makeKeyring();
      keyring.setAccount(account1);
      const removed = keyring.removeAccount(account1.id);
      expect(removed).toBe(true);
      expect(keyring.hasAccount(account1.id)).toBe(false);
      expect(unregistered).toStrictEqual([account1.id]);
    });

    it('returns false and does not fire onUnregister for unknown ID', async () => {
      const { keyring, unregistered } = await makeKeyring();
      const removed = keyring.removeAccount('does-not-exist');
      expect(removed).toBe(false);
      expect(unregistered).toHaveLength(0);
    });
  });

  describe('hasAccount', () => {
    it('returns true for an existing account', async () => {
      const { keyring } = await makeKeyring();
      keyring.setAccount(account1);
      expect(keyring.hasAccount(account1.id)).toBe(true);
    });

    it('returns false for an unknown account', async () => {
      const { keyring } = await makeKeyring();
      expect(keyring.hasAccount('does-not-exist')).toBe(false);
    });
  });

  describe('lookupAccount', () => {
    it('returns the account for a known ID', async () => {
      const { keyring } = await makeKeyring();
      keyring.setAccount(account1);
      expect(keyring.lookupAccount(account1.id)).toStrictEqual(account1);
    });

    it('returns undefined for an unknown ID', async () => {
      const { keyring } = await makeKeyring();
      expect(keyring.lookupAccount('does-not-exist')).toBeUndefined();
    });
  });

  describe('lookupByAddress', () => {
    it('returns the account for an exact address match', async () => {
      const { keyring } = await makeKeyring();
      keyring.setAccount(account1);
      expect(keyring.lookupByAddress(account1.address)).toStrictEqual(account1);
    });

    it('returns the account for a case-insensitive address match', async () => {
      const { keyring } = await makeKeyring();
      keyring.setAccount(account1);
      expect(
        keyring.lookupByAddress(account1.address.toUpperCase()),
      ).toStrictEqual(account1);
    });

    it('returns undefined for an unknown address', async () => {
      const { keyring } = await makeKeyring();
      expect(keyring.lookupByAddress('0xdeadbeef')).toBeUndefined();
    });
  });

  describe('accounts', () => {
    it('returns all accounts', async () => {
      const { keyring } = await makeKeyring();
      keyring.setAccount(account1);
      keyring.setAccount(account2);
      expect(keyring.accounts()).toStrictEqual(
        expect.arrayContaining([account1, account2]),
      );
    });

    it('returns an empty array when no accounts are registered', async () => {
      const { keyring } = await makeKeyring();
      expect(keyring.accounts()).toStrictEqual([]);
    });
  });

  describe('serialize', () => {
    it('returns the snap ID and all accounts', async () => {
      const { keyring } = await makeKeyring();
      keyring.setAccount(account1);
      keyring.setAccount(account2);
      const state = await keyring.serialize();
      expect(state).toStrictEqual({
        snapId: SNAP_ID,
        accounts: {
          [account1.id]: account1,
          [account2.id]: account2,
        },
      });
    });
  });

  describe('deserialize', () => {
    it('restores accounts and fires onRegister for each', async () => {
      const { keyring, registered } = await makeKeyring();
      await keyring.deserialize({
        snapId: SNAP_ID,
        accounts: { [account1.id]: account1, [account2.id]: account2 },
      });
      expect(keyring.hasAccount(account1.id)).toBe(true);
      expect(keyring.hasAccount(account2.id)).toBe(true);
      expect(registered).toStrictEqual(
        expect.arrayContaining([account1.id, account2.id]),
      );
    });

    it('clears existing accounts before restoring', async () => {
      const { keyring } = await makeKeyring();
      keyring.setAccount(account1);
      await keyring.deserialize({
        snapId: SNAP_ID,
        accounts: { [account2.id]: account2 },
      });
      expect(keyring.hasAccount(account1.id)).toBe(false);
      expect(keyring.hasAccount(account2.id)).toBe(true);
    });

    it('migrates v1 accounts during restore', async () => {
      const { keyring } = await makeKeyring();
      // A v1 account genuinely has no `scopes` field (not just undefined).
      const { scopes: _removed, ...v1Account } = account1;
      await keyring.deserialize({
        snapId: SNAP_ID,
        accounts: { [account1.id]: v1Account as unknown as KeyringAccount },
      });
      const restored = keyring.lookupAccount(account1.id);
      // v1 migration should have added scopes back.
      expect(restored?.scopes).toBeDefined();
    });
  });

  describe('Keyring interface', () => {
    describe('type', () => {
      it('returns "snap"', async () => {
        const { keyring } = await makeKeyring();
        expect(keyring.type).toBe('snap');
      });
    });

    describe('getAccounts', () => {
      it('returns all accounts', async () => {
        const { keyring } = await makeKeyring();
        keyring.setAccount(account1);
        keyring.setAccount(account2);
        const result = await keyring.getAccounts();
        expect(result).toStrictEqual(
          expect.arrayContaining([account1, account2]),
        );
      });
    });

    describe('getAccount', () => {
      it('returns the account for a known ID', async () => {
        const { keyring } = await makeKeyring();
        keyring.setAccount(account1);
        const result = await keyring.getAccount(account1.id);
        expect(result).toStrictEqual(account1);
      });

      it('throws for an unknown ID', async () => {
        const { keyring } = await makeKeyring();
        await expect(keyring.getAccount('does-not-exist')).rejects.toThrow(
          "Account 'does-not-exist' not found",
        );
      });
    });

    describe('createAccounts', () => {
      const options = {
        type: 'bip44:derive-index',
        entropySource: 'test-entropy',
        groupIndex: 0,
      } as unknown as CreateAccountOptions;

      it('creates new accounts and saves state', async () => {
        const { keyring, callbacks, registered } = await makeKeyring();
        jest
          .spyOn(KeyringInternalSnapClient.prototype, 'createAccounts')
          .mockResolvedValue([account1, account2]);

        const result = await keyring.createAccounts(options);

        expect(result).toStrictEqual([account1, account2]);
        expect(registered).toStrictEqual([account1.id, account2.id]);
        expect(callbacks.assertAccountCanBeUsed).toHaveBeenCalledTimes(2);
        expect(callbacks.saveState).toHaveBeenCalledTimes(1);
      });

      it('skips existing accounts (idempotent)', async () => {
        const { keyring, callbacks } = await makeKeyring();
        jest
          .spyOn(KeyringInternalSnapClient.prototype, 'createAccounts')
          .mockResolvedValue([account1]);
        // Pre-populate the account
        keyring.setAccount(account1);

        const result = await keyring.createAccounts(options);

        expect(result).toStrictEqual([account1]);
        // assertAccountCanBeUsed should NOT be called for existing accounts
        expect(callbacks.assertAccountCanBeUsed).not.toHaveBeenCalled();
        // saveState should NOT be called since no new accounts
        expect(callbacks.saveState).not.toHaveBeenCalled();
      });

      it('rolls back on error', async () => {
        const { keyring } = await makeKeyring(SNAP_ID, {
          assertAccountCanBeUsed: jest
            .fn<Promise<void>, [KeyringAccount]>()
            .mockResolvedValueOnce(undefined)
            .mockRejectedValueOnce(new Error('duplicate address')),
        });
        jest
          .spyOn(KeyringInternalSnapClient.prototype, 'createAccounts')
          .mockResolvedValue([account1, account2]);
        const deleteSpy = jest
          .spyOn(KeyringInternalSnapClient.prototype, 'deleteAccount')
          .mockResolvedValue(undefined);

        await expect(keyring.createAccounts(options)).rejects.toThrow(
          'duplicate address',
        );
        // Both accounts should be rolled back since neither was pre-existing
        expect(deleteSpy).toHaveBeenCalledTimes(2);
      });

      it('rejects duplicate accounts within a batch', async () => {
        const { keyring } = await makeKeyring();
        jest
          .spyOn(KeyringInternalSnapClient.prototype, 'createAccounts')
          .mockResolvedValue([account1, account1]);

        await expect(keyring.createAccounts(options)).rejects.toThrow(
          'already part of this batch',
        );
      });

      it('defers when the controller is locked', async () => {
        const { keyring, callbacks } = await makeKeyring(SNAP_ID, {
          isUnlocked: jest.fn<boolean, []>().mockReturnValue(false),
        });
        const clientSpy = jest
          .spyOn(KeyringInternalSnapClient.prototype, 'createAccounts')
          .mockResolvedValue([account1]);

        const result = await keyring.createAccounts(options);

        expect(result).toStrictEqual([]);
        expect(clientSpy).not.toHaveBeenCalled();
        expect(callbacks.assertAccountCanBeUsed).not.toHaveBeenCalled();
        expect(callbacks.saveState).not.toHaveBeenCalled();
      });
    });

    describe('deleteAccount', () => {
      it('removes the account and calls snap to delete', async () => {
        const { keyring, unregistered } = await makeKeyring();
        keyring.setAccount(account1);
        const deleteSpy = jest
          .spyOn(KeyringInternalSnapClient.prototype, 'deleteAccount')
          .mockResolvedValue(undefined);

        await keyring.deleteAccount(account1.id);

        expect(keyring.hasAccount(account1.id)).toBe(false);
        expect(unregistered).toStrictEqual([account1.id]);
        expect(deleteSpy).toHaveBeenCalledWith(account1.id);
      });

      it('logs error but does not throw if snap deletion fails', async () => {
        const consoleSpy = jest
          .spyOn(console, 'error')
          .mockImplementation(() => undefined);
        const { keyring } = await makeKeyring();
        jest
          .spyOn(KeyringInternalSnapClient.prototype, 'deleteAccount')
          .mockRejectedValue(new Error('snap error'));
        keyring.setAccount(account1);

        // Should not throw
        await keyring.deleteAccount(account1.id);

        expect(keyring.hasAccount(account1.id)).toBe(false);
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
      });
    });

    describe('submitRequest', () => {
      it('delegates to inherited submitSnapRequest for a known account', async () => {
        const mockResult = { success: true };
        const { keyring } = await makeKeyring();
        keyring.setAccount(account1);

        // Spy on the inherited V1 method directly
        const submitSpy = jest
          .spyOn(keyring, 'submitSnapRequest')
          .mockResolvedValue(mockResult as any);

        const request = {
          id: 'req-1',
          origin: 'metamask',
          scope: 'eip155:1',
          account: account1.id,
          request: { method: 'eth_sign' },
        };

        const result = await keyring.submitRequest(request);

        expect(result).toStrictEqual(mockResult);
        expect(submitSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            origin: 'metamask',
            account: account1,
            method: 'eth_sign',
            scope: 'eip155:1',
            noPending: false,
          }),
        );
      });

      it('throws for an unknown account', async () => {
        const { keyring } = await makeKeyring();

        const request = {
          id: 'req-1',
          origin: 'metamask',
          scope: 'eip155:1',
          account: 'unknown-id',
          request: { method: 'eth_sign' },
        };

        await expect(keyring.submitRequest(request)).rejects.toThrow(
          "Account 'unknown-id' not found",
        );
      });
    });
  });
});
