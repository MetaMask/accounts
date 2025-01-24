import { BtcScopes } from './constants';
import type { BtcP2wpkhAccount } from './types';
import {
  BtcMethod,
  BtcP2wpkhAccountStruct,
  BtcP2wpkhAddressStruct,
} from './types';
import { BtcAccountType } from '../api';

const MOCK_ACCOUNT = {
  id: '55583f38-d81b-48f8-8494-fc543c2b5c95',
  type: BtcAccountType.P2wpkh,
  address: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
  methods: [BtcMethod.SendBitcoin],
  options: {},
  scopes: [BtcScopes.Mainnet],
};

describe('types', () => {
  describe('BtcP2wpkhAddressStruct', () => {
    const errorPrefix = 'Could not decode P2WPKH address';

    it.each([
      'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
      'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
    ])('is valid address; %s', (address) => {
      expect(() => BtcP2wpkhAddressStruct.assert(address)).not.toThrow();
    });

    it.each([
      // Too short
      '',
      'bc1q',
      // Must have at least 6 characters after separator '1'
      'bc1q000',
    ])('throws an error if address is too short: %s', (address) => {
      expect(() => BtcP2wpkhAddressStruct.assert(address)).toThrow(
        `${errorPrefix}: ${address} too short`,
      );
    });

    it('throws an error if address is too long', () => {
      const address =
        'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4w508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4w508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4';
      expect(() => BtcP2wpkhAddressStruct.assert(address)).toThrow(
        `${errorPrefix}: Exceeds length limit`,
      );
    });

    it('throws an error if there no seperator', () => {
      const address = 'bc0qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4';
      expect(() => BtcP2wpkhAddressStruct.assert(address)).toThrow(
        `${errorPrefix}: No separator character for ${address}`,
      );
    });

    it('throws an error if there are multiple scopes', () => {
      const account: BtcP2wpkhAccount = {
        ...MOCK_ACCOUNT,
        scopes: [BtcScopes.Mainnet, BtcScopes.Testnet],
      };
      expect(() => BtcP2wpkhAccountStruct.assert(account)).toThrow(
        'At path: scopes -- Expected a array with a length of `1` but received one with a length of `2`',
      );
    });

    it('throws an error if there is no scope', () => {
      const account: BtcP2wpkhAccount = {
        ...MOCK_ACCOUNT,
        scopes: [],
      };
      expect(() => BtcP2wpkhAccountStruct.assert(account)).toThrow(
        'At path: scopes -- Expected a array with a length of `1` but received one with a length of `0`',
      );
    });
  });
});
