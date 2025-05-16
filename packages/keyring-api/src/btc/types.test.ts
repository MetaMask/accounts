import { BtcScope } from './constants';
import type { BtcP2wpkhAccount } from './types';
import { BtcMethod, BtcAccountStruct } from './types';
import { BtcAccountType } from '../api';

const MOCK_ACCOUNT = {
  id: '55583f38-d81b-48f8-8494-fc543c2b5c95',
  type: BtcAccountType.P2wpkh,
  address: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
  methods: [BtcMethod.SendBitcoin],
  options: {},
  scopes: [BtcScope.Mainnet],
};

describe('types', () => {
  describe('BtcAccountStruct', () => {
    it('throws an error if there are multiple scopes', () => {
      const account: BtcP2wpkhAccount = {
        ...MOCK_ACCOUNT,
        scopes: [BtcScope.Mainnet, BtcScope.Testnet],
      };
      expect(() => BtcAccountStruct.assert(account)).toThrow(
        'At path: scopes -- Expected a array with a length of `1` but received one with a length of `2`',
      );
    });

    it('throws an error if there is no scope', () => {
      const account: BtcP2wpkhAccount = {
        ...MOCK_ACCOUNT,
        scopes: [],
      };
      expect(() => BtcAccountStruct.assert(account)).toThrow(
        'At path: scopes -- Expected a array with a length of `1` but received one with a length of `0`',
      );
    });
  });
});
