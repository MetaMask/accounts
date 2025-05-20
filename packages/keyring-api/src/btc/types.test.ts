import { BtcScope } from './constants';
import type {
  BtcP2pkhAccount,
  BtcP2shAccount,
  BtcP2trAccount,
  BtcP2wpkhAccount,
} from './types';
import {
  BtcMethod,
  BtcP2pkhAccountStruct,
  BtcP2shAccountStruct,
  BtcP2trAccountStruct,
  BtcP2wpkhAccountStruct,
} from './types';
import { BtcAccountType } from '../api';

describe('types', () => {
  const mockAccount = {
    id: '55583f38-d81b-48f8-8494-fc543c2b5c95',
    methods: [BtcMethod.SendBitcoin],
    options: {},
    scopes: [BtcScope.Mainnet],
  };

  describe('BtcP2pkhAccount', () => {
    const p2pkhAccount: BtcP2pkhAccount = {
      ...mockAccount,
      type: BtcAccountType.P2pkh,
      address: '15feVv7kK3z7jxA4RZZzY7Fwdu3yqFwzcT',
    };

    it.each([
      '15feVv7kK3z7jxA4RZZzY7Fwdu3yqFwzcT',
      'mjPQaLkhZN3MxsYN8Nebzwevuz8vdTaRCq',
    ])('is valid; %s', (address) => {
      expect(() =>
        BtcP2pkhAccountStruct.assert({ ...p2pkhAccount, address }),
      ).not.toThrow();
    });

    it('throws an error if the address is invalid', () => {
      expect(() =>
        BtcP2pkhAccountStruct.assert({
          ...p2pkhAccount,
          address: 'invalidAddress',
        }),
      ).toThrow('At path: address -- Invalid p2pkh address: Invalid address');
    });

    it('throws an error if there is no scope', () => {
      expect(() =>
        BtcP2pkhAccountStruct.assert({ ...p2pkhAccount, scopes: [] }),
      ).toThrow(
        'At path: scopes -- Expected a nonempty array but received an empty one',
      );
    });
  });

  describe('BtcP2shAccount', () => {
    const p2shAccount: BtcP2shAccount = {
      ...mockAccount,
      type: BtcAccountType.P2sh,
      address: '3QVSaDYjxEh4L3K24eorrQjfVxPAKJMys2',
    };

    it.each([
      '3QVSaDYjxEh4L3K24eorrQjfVxPAKJMys2',
      '2NBG623WvXp1zxKB6gK2mnMe2mSDCur5qRU',
    ])('is valid; %s', (address) => {
      expect(() =>
        BtcP2shAccountStruct.assert({ ...p2shAccount, address }),
      ).not.toThrow();
    });

    it('throws an error if the address is invalid', () => {
      expect(() =>
        BtcP2shAccountStruct.assert({
          ...p2shAccount,
          address: 'invalidAddress',
        }),
      ).toThrow('At path: address -- Invalid p2sh address: Invalid address');
    });

    it('throws an error if there is no scope', () => {
      expect(() =>
        BtcP2shAccountStruct.assert({ ...p2shAccount, scopes: [] }),
      ).toThrow(
        'At path: scopes -- Expected a nonempty array but received an empty one',
      );
    });
  });

  describe('BtcP2wpkhAccount', () => {
    const p2wpkhAccount: BtcP2wpkhAccount = {
      ...mockAccount,
      type: BtcAccountType.P2wpkh,
      address: 'bc1qe2e3tdkqwytw7furyl2nlfy3sqs23acynn50d9',
    };

    it.each([
      'bc1qe2e3tdkqwytw7furyl2nlfy3sqs23acynn50d9',
      'tb1qmh8qny6ezjlg4phl68lj82drr76zume6txt032',
    ])('is valid; %s', (address) => {
      expect(() =>
        BtcP2wpkhAccountStruct.assert({ ...p2wpkhAccount, address }),
      ).not.toThrow();
    });

    it('throws an error if the address is invalid', () => {
      expect(() =>
        BtcP2wpkhAccountStruct.assert({
          ...p2wpkhAccount,
          address: 'invalidAddress',
        }),
      ).toThrow('At path: address -- Invalid p2wpkh address: Invalid address');
    });

    it('throws an error if there is no scope', () => {
      expect(() =>
        BtcP2wpkhAccountStruct.assert({ ...p2wpkhAccount, scopes: [] }),
      ).toThrow(
        'At path: scopes -- Expected a nonempty array but received an empty one',
      );
    });
  });

  describe('BtcP2trAccount', () => {
    const p2trAccount: BtcP2trAccount = {
      ...mockAccount,
      type: BtcAccountType.P2tr,
      address: 'bc1p4rue37y0v9snd4z3fvw43d29u97qxf9j3fva72xy2t7hekg24dzsaz40mz',
    };

    it.each([
      'bc1p4rue37y0v9snd4z3fvw43d29u97qxf9j3fva72xy2t7hekg24dzsaz40mz',
      'tb1pwwjax3vpq6h69965hcr22vkpm4qdvyu2pz67wyj8eagp9vxkcz0q0ya20h',
    ])('is valid address; %s', (address) => {
      expect(() =>
        BtcP2trAccountStruct.assert({ ...p2trAccount, address }),
      ).not.toThrow();
    });

    it('throws an error if the address is invalid', () => {
      expect(() =>
        BtcP2trAccountStruct.assert({
          ...p2trAccount,
          address: 'invalidAddress',
        }),
      ).toThrow('At path: address -- Invalid p2tr address: Invalid address');
    });

    it('throws an error if there is no scope', () => {
      expect(() =>
        BtcP2trAccountStruct.assert({ ...p2trAccount, scopes: [] }),
      ).toThrow(
        'At path: scopes -- Expected a nonempty array but received an empty one',
      );
    });
  });
});
