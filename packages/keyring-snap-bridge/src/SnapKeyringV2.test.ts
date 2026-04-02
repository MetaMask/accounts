import { EthAccountType, EthScope } from '@metamask/keyring-api';
import type { KeyringAccount } from '@metamask/keyring-api';
import type { SnapId } from '@metamask/snaps-sdk';

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

function makeKeyring(snapId: SnapId = SNAP_ID) {
  const registered: string[] = [];
  const unregistered: string[] = [];
  const keyring = new SnapKeyringV2({
    snapId,
    onRegister: (id) => registered.push(id),
    onUnregister: (id) => unregistered.push(id),
  });
  return { keyring, registered, unregistered };
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
    it('returns the snap ID and all accounts', () => {
      const { keyring } = makeKeyring();
      keyring.setAccount(account1);
      keyring.setAccount(account2);
      const state = keyring.serialize();
      expect(state.snapId).toBe(SNAP_ID);
      expect(state.accounts).toStrictEqual({
        [account1.id]: account1,
        [account2.id]: account2,
      });
    });
  });

  describe('deserialize', () => {
    it('restores accounts and fires onRegister for each', () => {
      const { keyring, registered } = makeKeyring();
      keyring.deserialize({
        snapId: SNAP_ID,
        accounts: { [account1.id]: account1, [account2.id]: account2 },
      });
      expect(keyring.hasAccount(account1.id)).toBe(true);
      expect(keyring.hasAccount(account2.id)).toBe(true);
      expect(registered).toStrictEqual(
        expect.arrayContaining([account1.id, account2.id]),
      );
    });

    it('clears existing accounts before restoring', () => {
      const { keyring } = makeKeyring();
      keyring.setAccount(account1);
      keyring.deserialize({
        snapId: SNAP_ID,
        accounts: { [account2.id]: account2 },
      });
      expect(keyring.hasAccount(account1.id)).toBe(false);
      expect(keyring.hasAccount(account2.id)).toBe(true);
    });

    it('migrates v1 accounts during restore', () => {
      const { keyring } = makeKeyring();
      // A v1 account genuinely has no `scopes` field (not just undefined).
      const { scopes: _removed, ...v1Account } = account1;
      keyring.deserialize({
        snapId: SNAP_ID,
        accounts: { [account1.id]: v1Account as unknown as KeyringAccount },
      });
      const restored = keyring.lookupAccount(account1.id);
      // v1 migration should have added scopes back.
      expect(restored?.scopes).toBeDefined();
    });
  });
});
