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

const BTC_P2PKH_MAINNET_ADDRESS = '1AXaVdPBb6zqrTMb6ebrBb9g3JmeAPGeCF';
const BTC_P2SH_MAINNET_ADDRESS = '3KQPirCGGbVyWJLGuWN6VPC7uLeiarYB7x';
const BTC_P2WPKH_MAINNET_ADDRESS = 'bc1q4degm5k044n9xv3ds7d8l6hfavydte6wn6sesw';
const BTC_P2TR_MAINNET_ADDRESS =
  'bc1pxfxst7zrkw39vzh0pchq5ey0q7z6u739cudhz5vmg89wa4kyyp9qzrf5sp';

const BTC_P2PKH_TESTNET_ADDRESS = 'mrDHfcAPosFsabxBKe2U3EdxX5Kph8Zd4f';
const BTC_P2SH_TESTNET_ADDRESS = '2N7AeKCw7p8uRRQjXPeHW7UPGhR8LYHEzBT';
const BTC_P2WPKH_TESTNET_ADDRESS = 'tb1qqecaw32rvyjgez706t5chpr8gan49wfuk94t3g';
const BTC_P2TR_TESTNET_ADDRESS =
  'tb1p6epn3ctassfp54lnztshnpfjekn7khyarrnm6f0yv738lgc53xxsgevs8k';

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
      address: BTC_P2PKH_MAINNET_ADDRESS,
    };

    it.each([BTC_P2PKH_MAINNET_ADDRESS, BTC_P2PKH_TESTNET_ADDRESS])(
      'is valid; %s',
      (address) => {
        expect(() =>
          BtcP2pkhAccountStruct.assert({ ...p2pkhAccount, address }),
        ).not.toThrow();
      },
    );

    it('throws an error if the address fails to be decoded', () => {
      expect(() =>
        BtcP2pkhAccountStruct.assert({
          ...p2pkhAccount,
          address: 'invalidAddress',
        }),
      ).toThrow(
        'At path: address -- Failed to decode p2pkh address: Invalid address',
      );
    });

    it('throws an error if the address type is invalid', () => {
      expect(() =>
        BtcP2pkhAccountStruct.assert({
          ...p2pkhAccount,
          address: BTC_P2WPKH_MAINNET_ADDRESS,
        }),
      ).toThrow('At path: address -- Invalid p2pkh address');
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
      address: BTC_P2SH_MAINNET_ADDRESS,
    };

    it.each([BTC_P2SH_MAINNET_ADDRESS, BTC_P2SH_TESTNET_ADDRESS])(
      'is valid; %s',
      (address) => {
        expect(() =>
          BtcP2shAccountStruct.assert({ ...p2shAccount, address }),
        ).not.toThrow();
      },
    );

    it('throws an error if the address fails to be decoded', () => {
      expect(() =>
        BtcP2shAccountStruct.assert({
          ...p2shAccount,
          address: 'invalidAddress',
        }),
      ).toThrow(
        'At path: address -- Failed to decode p2sh address: Invalid address',
      );
    });

    it('throws an error if the address type is invalid', () => {
      expect(() =>
        BtcP2shAccountStruct.assert({
          ...p2shAccount,
          address: BTC_P2PKH_MAINNET_ADDRESS,
        }),
      ).toThrow('At path: address -- Invalid p2sh address');
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
      address: BTC_P2WPKH_MAINNET_ADDRESS,
    };

    it.each([BTC_P2WPKH_MAINNET_ADDRESS, BTC_P2WPKH_TESTNET_ADDRESS])(
      'is valid; %s',
      (address) => {
        expect(() =>
          BtcP2wpkhAccountStruct.assert({ ...p2wpkhAccount, address }),
        ).not.toThrow();
      },
    );

    it('throws an error if the address fails to be decoded', () => {
      expect(() =>
        BtcP2wpkhAccountStruct.assert({
          ...p2wpkhAccount,
          address: 'invalidAddress',
        }),
      ).toThrow(
        'At path: address -- Failed to decode p2wpkh address: Invalid address',
      );
    });

    it('throws an error if the address type is invalid', () => {
      expect(() =>
        BtcP2wpkhAccountStruct.assert({
          ...p2wpkhAccount,
          address: BTC_P2PKH_MAINNET_ADDRESS,
        }),
      ).toThrow('At path: address -- Invalid p2wpkh address');
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
      address: BTC_P2TR_MAINNET_ADDRESS,
    };

    it.each([BTC_P2TR_MAINNET_ADDRESS, BTC_P2TR_TESTNET_ADDRESS])(
      'is valid address; %s',
      (address) => {
        expect(() =>
          BtcP2trAccountStruct.assert({ ...p2trAccount, address }),
        ).not.toThrow();
      },
    );

    it('throws an error if the address fails to be decoded', () => {
      expect(() =>
        BtcP2trAccountStruct.assert({
          ...p2trAccount,
          address: 'invalidAddress',
        }),
      ).toThrow(
        'At path: address -- Failed to decode p2tr address: Invalid address',
      );
    });

    it('throws an error if the address type is invalid', () => {
      expect(() =>
        BtcP2trAccountStruct.assert({
          ...p2trAccount,
          address: BTC_P2PKH_MAINNET_ADDRESS,
        }),
      ).toThrow('At path: address -- Invalid p2tr address');
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
