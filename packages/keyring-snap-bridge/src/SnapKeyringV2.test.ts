import { EthAccountType, EthScope } from '@metamask/keyring-api';
import type {
  KeyringAccount,
  CreateAccountOptions,
} from '@metamask/keyring-api';
import type { SnapId } from '@metamask/snaps-sdk';

import type { SnapKeyringV2Callbacks } from './SnapKeyringV2';
import { SnapKeyringV2 } from './SnapKeyringV2';

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
 * Create mock callbacks for `SnapKeyringV2`.
 *
 * @returns Mock callbacks.
 */
function makeMockCallbacks(): SnapKeyringV2Callbacks {
  return {
    createSnapAccount: jest.fn<
      Promise<KeyringAccount>,
      [Record<string, unknown>, Record<string, unknown> | undefined]
    >(),
    createSnapAccounts: jest.fn<
      Promise<KeyringAccount[]>,
      [CreateAccountOptions]
    >(),
    deleteSnapAccount: jest
      .fn<Promise<void>, [string]>()
      .mockResolvedValue(undefined),
    submitSnapRequest: jest.fn(),
    assertAccountCanBeUsed: jest
      .fn<Promise<void>, [KeyringAccount]>()
      .mockResolvedValue(undefined),
    saveState: jest.fn<Promise<void>, []>().mockResolvedValue(undefined),
    withLock: jest.fn(async <Result>(callback: () => Promise<Result>) =>
      callback(),
    ),
  };
}

/**
 * Create a `SnapKeyringV2` test instance with tracking arrays for callbacks.
 *
 * @param snapId - The Snap ID used to construct the keyring.
 * @param callbackOverrides - Optional callback overrides.
 * @returns The keyring, arrays of registered/unregistered account IDs, and mock callbacks.
 */
function makeKeyring(
  snapId: SnapId = SNAP_ID,
  callbackOverrides?: Partial<SnapKeyringV2Callbacks>,
): {
  keyring: SnapKeyringV2;
  registered: string[];
  unregistered: string[];
  callbacks: SnapKeyringV2Callbacks;
} {
  const registered: string[] = [];
  const unregistered: string[] = [];
  const callbacks = { ...makeMockCallbacks(), ...callbackOverrides };
  const keyring = new SnapKeyringV2({
    snapId,
    onRegister: (id): void => {
      registered.push(id);
    },
    onUnregister: (id): void => {
      unregistered.push(id);
    },
    callbacks,
  });
  return { keyring, registered, unregistered, callbacks };
}

describe('SnapKeyringV2', () => {
  describe('snapId', () => {
    it('returns the snap ID passed at construction', () => {
      const { keyring } = makeKeyring();
      expect(keyring.snapId).toBe(SNAP_ID);
    });
  });

  describe('setAccount', () => {
    it('adds a new account and fires onRegister', () => {
      const { keyring, registered } = makeKeyring();
      keyring.setAccount(account1);
      expect(keyring.hasAccount(account1.id)).toBe(true);
      expect(registered).toStrictEqual([account1.id]);
    });

    it('updates an existing account without firing onRegister again', () => {
      const { keyring, registered } = makeKeyring();
      keyring.setAccount(account1);
      const updated = { ...account1, options: { updated: true } };
      keyring.setAccount(updated);
      // onRegister fired only once (on the initial add)
      expect(registered).toStrictEqual([account1.id]);
      expect(keyring.lookupAccount(account1.id)).toStrictEqual(updated);
    });
  });

  describe('removeAccount', () => {
    it('removes an existing account and fires onUnregister', () => {
      const { keyring, unregistered } = makeKeyring();
      keyring.setAccount(account1);
      const removed = keyring.removeAccount(account1.id);
      expect(removed).toBe(true);
      expect(keyring.hasAccount(account1.id)).toBe(false);
      expect(unregistered).toStrictEqual([account1.id]);
    });

    it('returns false and does not fire onUnregister for unknown ID', () => {
      const { keyring, unregistered } = makeKeyring();
      const removed = keyring.removeAccount('does-not-exist');
      expect(removed).toBe(false);
      expect(unregistered).toHaveLength(0);
    });
  });

  describe('hasAccount', () => {
    it('returns true for an existing account', () => {
      const { keyring } = makeKeyring();
      keyring.setAccount(account1);
      expect(keyring.hasAccount(account1.id)).toBe(true);
    });

    it('returns false for an unknown account', () => {
      const { keyring } = makeKeyring();
      expect(keyring.hasAccount('does-not-exist')).toBe(false);
    });
  });

  describe('lookupAccount', () => {
    it('returns the account for a known ID', () => {
      const { keyring } = makeKeyring();
      keyring.setAccount(account1);
      expect(keyring.lookupAccount(account1.id)).toStrictEqual(account1);
    });

    it('returns undefined for an unknown ID', () => {
      const { keyring } = makeKeyring();
      expect(keyring.lookupAccount('does-not-exist')).toBeUndefined();
    });
  });

  describe('lookupByAddress', () => {
    it('returns the account for an exact address match', () => {
      const { keyring } = makeKeyring();
      keyring.setAccount(account1);
      expect(keyring.lookupByAddress(account1.address)).toStrictEqual(account1);
    });

    it('returns the account for a case-insensitive address match', () => {
      const { keyring } = makeKeyring();
      keyring.setAccount(account1);
      expect(
        keyring.lookupByAddress(account1.address.toUpperCase()),
      ).toStrictEqual(account1);
    });

    it('returns undefined for an unknown address', () => {
      const { keyring } = makeKeyring();
      expect(keyring.lookupByAddress('0xdeadbeef')).toBeUndefined();
    });
  });

  describe('accounts', () => {
    it('returns all accounts', () => {
      const { keyring } = makeKeyring();
      keyring.setAccount(account1);
      keyring.setAccount(account2);
      expect(keyring.accounts()).toStrictEqual(
        expect.arrayContaining([account1, account2]),
      );
    });

    it('returns an empty array when no accounts are registered', () => {
      const { keyring } = makeKeyring();
      expect(keyring.accounts()).toStrictEqual([]);
    });
  });

  describe('serialize', () => {
    it('returns the snap ID and all accounts', async () => {
      const { keyring } = makeKeyring();
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
      const { keyring, registered } = makeKeyring();
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
      const { keyring } = makeKeyring();
      keyring.setAccount(account1);
      await keyring.deserialize({
        snapId: SNAP_ID,
        accounts: { [account2.id]: account2 },
      });
      expect(keyring.hasAccount(account1.id)).toBe(false);
      expect(keyring.hasAccount(account2.id)).toBe(true);
    });

    it('migrates v1 accounts during restore', async () => {
      const { keyring } = makeKeyring();
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

    it('does not clear existing accounts when validation fails', async () => {
      const { keyring } = makeKeyring();
      keyring.setAccount(account1);
      // Empty object does not satisfy the account structs.
      const invalidState = {
        snapId: SNAP_ID,
        accounts: {
          [account1.id]: {} as KeyringAccount,
        },
      };
      await expect(keyring.deserialize(invalidState)).rejects.toThrow(
        /Expected/u,
      );
      expect(keyring.lookupAccount(account1.id)).toStrictEqual(account1);
    });
  });

  describe('KeyringV2 interface', () => {
    describe('type', () => {
      it('returns "snap"', () => {
        const { keyring } = makeKeyring();
        expect(keyring.type).toBe('snap');
      });
    });

    describe('getAccounts', () => {
      it('returns all accounts', async () => {
        const { keyring } = makeKeyring();
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
        const { keyring } = makeKeyring();
        keyring.setAccount(account1);
        const result = await keyring.getAccount(account1.id);
        expect(result).toStrictEqual(account1);
      });

      it('throws for an unknown ID', async () => {
        const { keyring } = makeKeyring();
        await expect(keyring.getAccount('does-not-exist')).rejects.toThrow(
          "Account 'does-not-exist' not found",
        );
      });
    });

    describe('createAccount', () => {
      it('delegates to the createSnapAccount callback', async () => {
        const { keyring, callbacks } = makeKeyring(SNAP_ID, {
          createSnapAccount: jest.fn().mockResolvedValue(account1),
        });

        const options = { entropySource: 'test', index: 0 };
        const internalOptions = { displayConfirmation: false };
        const result = await keyring.createAccount(options, internalOptions);

        expect(result).toStrictEqual(account1);
        expect(callbacks.createSnapAccount).toHaveBeenCalledWith(
          options,
          internalOptions,
        );
      });

      it('works without internal options', async () => {
        const { keyring, callbacks } = makeKeyring(SNAP_ID, {
          createSnapAccount: jest.fn().mockResolvedValue(account1),
        });

        const options = { entropySource: 'test', index: 0 };
        const result = await keyring.createAccount(options);

        expect(result).toStrictEqual(account1);
        expect(callbacks.createSnapAccount).toHaveBeenCalledWith(
          options,
          undefined,
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
        const { keyring, callbacks, registered } = makeKeyring(SNAP_ID, {
          createSnapAccounts: jest.fn().mockResolvedValue([account1, account2]),
        });

        const result = await keyring.createAccounts(options);

        expect(result).toStrictEqual([account1, account2]);
        expect(registered).toStrictEqual([account1.id, account2.id]);
        expect(callbacks.assertAccountCanBeUsed).toHaveBeenCalledTimes(2);
        expect(callbacks.saveState).toHaveBeenCalledTimes(1);
      });

      it('skips existing accounts (idempotent)', async () => {
        const { keyring, callbacks } = makeKeyring(SNAP_ID, {
          createSnapAccounts: jest.fn().mockResolvedValue([account1]),
        });
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
        const { keyring, callbacks } = makeKeyring(SNAP_ID, {
          createSnapAccounts: jest.fn().mockResolvedValue([account1, account2]),
          assertAccountCanBeUsed: jest
            .fn<Promise<void>, [KeyringAccount]>()
            .mockResolvedValueOnce(undefined)
            .mockRejectedValueOnce(new Error('duplicate address')),
        });

        await expect(keyring.createAccounts(options)).rejects.toThrow(
          'duplicate address',
        );
        // Both accounts should be rolled back since neither was pre-existing
        expect(callbacks.deleteSnapAccount).toHaveBeenCalledTimes(2);
      });

      it('logs rollback errors when snap delete fails during rollback', async () => {
        const consoleSpy = jest
          .spyOn(console, 'error')
          .mockImplementation(() => undefined);
        const rollbackError = new Error('snap rollback failed');
        const { keyring, callbacks } = makeKeyring(SNAP_ID, {
          createSnapAccounts: jest.fn().mockResolvedValue([account1, account2]),
          assertAccountCanBeUsed: jest
            .fn<Promise<void>, [KeyringAccount]>()
            .mockResolvedValueOnce(undefined)
            .mockRejectedValueOnce(new Error('validation failed')),
          deleteSnapAccount: jest.fn().mockRejectedValue(rollbackError),
        });

        await expect(keyring.createAccounts(options)).rejects.toThrow(
          'validation failed',
        );

        expect(callbacks.deleteSnapAccount).toHaveBeenCalledTimes(2);
        expect(consoleSpy).toHaveBeenCalledTimes(2);
        expect(consoleSpy).toHaveBeenNthCalledWith(
          1,
          `Account '${account1.id}' may not have been removed from snap '${SNAP_ID}' during createAccounts rollback:`,
          rollbackError,
        );
        expect(consoleSpy).toHaveBeenNthCalledWith(
          2,
          `Account '${account2.id}' may not have been removed from snap '${SNAP_ID}' during createAccounts rollback:`,
          rollbackError,
        );
        consoleSpy.mockRestore();
      });

      it('rejects duplicate accounts within a batch', async () => {
        const { keyring } = makeKeyring(SNAP_ID, {
          createSnapAccounts: jest.fn().mockResolvedValue([account1, account1]),
        });

        await expect(keyring.createAccounts(options)).rejects.toThrow(
          'already part of this batch',
        );
      });
    });

    describe('deleteAccount', () => {
      it('removes the account and calls snap to delete', async () => {
        const { keyring, callbacks, unregistered } = makeKeyring();
        keyring.setAccount(account1);

        await keyring.deleteAccount(account1.id);

        expect(keyring.hasAccount(account1.id)).toBe(false);
        expect(unregistered).toStrictEqual([account1.id]);
        expect(callbacks.deleteSnapAccount).toHaveBeenCalledWith(account1.id);
      });

      it('logs error but does not throw if snap deletion fails', async () => {
        const consoleSpy = jest
          .spyOn(console, 'error')
          .mockImplementation(() => undefined);
        const { keyring } = makeKeyring(SNAP_ID, {
          deleteSnapAccount: jest
            .fn()
            .mockRejectedValue(new Error('snap error')),
        });
        keyring.setAccount(account1);

        // Should not throw
        await keyring.deleteAccount(account1.id);

        expect(keyring.hasAccount(account1.id)).toBe(false);
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
      });
    });

    describe('submitRequest', () => {
      it('delegates to the callback for a known account', async () => {
        const mockResult = { success: true };
        const { keyring } = makeKeyring(SNAP_ID, {
          submitSnapRequest: jest.fn().mockResolvedValue(mockResult),
        });
        keyring.setAccount(account1);

        const request = {
          id: 'req-1',
          origin: 'metamask',
          scope: 'eip155:1',
          account: account1.id,
          request: { method: 'eth_sign' },
        };

        const result = await keyring.submitRequest(request);

        expect(result).toStrictEqual(mockResult);
      });

      it('throws for an unknown account', async () => {
        const { keyring } = makeKeyring();

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
