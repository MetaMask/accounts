import UpstreamLatticeKeyring from 'eth-lattice-keyring';

import { LatticeKeyring, LATTICE_KEYRING_TYPE } from './lattice-keyring';

describe('LatticeKeyring', () => {
  it('is a direct re-export of the upstream LatticeKeyring', () => {
    expect(LatticeKeyring).toBe(UpstreamLatticeKeyring);
  });

  describe('static properties', () => {
    it('has the correct keyring type', () => {
      expect(LatticeKeyring.type).toBe('Lattice Hardware');
    });

    it('exports LATTICE_KEYRING_TYPE matching the class type', () => {
      expect(LATTICE_KEYRING_TYPE).toBe(LatticeKeyring.type);
    });
  });

  describe('keyring interface', () => {
    it('exposes the standard keyring methods', () => {
      const keyring = new LatticeKeyring();
      expect(typeof keyring.serialize).toBe('function');
      expect(typeof keyring.deserialize).toBe('function');
      expect(typeof keyring.getAccounts).toBe('function');
      expect(typeof keyring.addAccounts).toBe('function');
      expect(typeof keyring.signTransaction).toBe('function');
      expect(typeof keyring.signPersonalMessage).toBe('function');
      expect(typeof keyring.signTypedData).toBe('function');
    });

    it('getAccounts returns an empty list before any account is added', async () => {
      const keyring = new LatticeKeyring();
      const accounts = await keyring.getAccounts();
      expect(accounts).toStrictEqual([]);
    });

    it('serialize returns the current state', async () => {
      const keyring = new LatticeKeyring();
      const state = await keyring.serialize();
      expect(state).toBeDefined();
      expect(typeof state).toBe('object');
    });
  });
});
