import { BtcP2wpkhAddressStruct } from './types';

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
  });
});
