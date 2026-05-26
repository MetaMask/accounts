import type { KeyringAccount } from '@metamask/keyring-api';
import {
  EthAccountType,
  EthScope,
  SolAccountType,
  SolScope,
} from '@metamask/keyring-api';

import {
  normalizeAccount,
  normalizeAccountAddress,
  transformAccount,
} from './account';

const ethAccount: KeyringAccount = {
  id: 'b05d918a-b37c-497a-bb28-3d15c0d56b7a',
  address: '0xC728514Df8A7F9271f4B7a4dd2Aa6d2D723d3eE3',
  options: {},
  methods: [],
  scopes: [EthScope.Eoa],
  type: EthAccountType.Eoa,
};

const solAccount: KeyringAccount = {
  id: '780ee179-5ab5-449d-9c25-34e12c1ada66',
  address: '3d4v35MRK57xM2Nte3E3rTQU1zyXGVrkXJ6FuEjVoKzM',
  options: {},
  methods: [],
  scopes: [SolScope.Mainnet],
  type: SolAccountType.DataAccount,
};

describe('account', () => {
  describe('normalizeAccountAddress', () => {
    it('lowercases EVM account addresses', () => {
      expect(normalizeAccountAddress(ethAccount)).toBe(
        '0xc728514df8a7f9271f4b7a4dd2aa6d2d723d3ee3',
      );
    });

    it('preserves non-EVM account addresses', () => {
      expect(normalizeAccountAddress(solAccount)).toBe(solAccount.address);
    });
  });

  describe('normalizeAccount', () => {
    it('normalizes EVM account addresses', () => {
      expect(normalizeAccount(ethAccount)).toStrictEqual({
        ...ethAccount,
        address: '0xc728514df8a7f9271f4b7a4dd2aa6d2d723d3ee3',
      });
    });

    it('preserves non-EVM account addresses', () => {
      expect(normalizeAccount(solAccount)).toStrictEqual(solAccount);
    });
  });

  it('throws for unknown account type', () => {
    const unknownAccount = {
      // This should not be really possible to create such account, but since we potentially
      // migrate data upon the Snap keyring initialization, we want to cover edge-cases
      // like this one to avoid crashing and blocking everything...
      type: 'unknown:type',
    } as unknown as KeyringAccount; // Just testing the default case.

    expect(() => transformAccount(unknownAccount)).toThrow(
      "Unknown account type: 'unknown:type'",
    );
  });
});
