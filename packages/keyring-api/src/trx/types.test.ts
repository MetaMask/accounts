import { TrxAddressStruct } from './types';

describe('types', () => {
  describe('TrxAddressStruct', () => {
    it.each([
      'TT2T17KZhoDu47i2E4FWxfG79zdkEWkU9N',
      'TE2RzoSV3wFK99w6J9UnnZ4vLfXYoxvRwP',
    ])('is valid address: %s', (address) => {
      expect(() => TrxAddressStruct.assert(address)).not.toThrow();
    });

    it.each([
      // Invalid lengths, too long (45 chars)
      'TT2T17KZhoDu47i2E4FWxfG79zdkEWkU9NTT2T17KZhoD',
      // Too short (24 chars)
      'TT2T17KZhoDu47i2E4FWxfG7',
      // Empty or invalid input
      '',
      // Eth style address
      '0x1234',
      'not-an-address',
    ])('rejects invalid address: %s', (address) => {
      expect(() => TrxAddressStruct.assert(address)).toThrow(
        `Expected a value of type \`TrxAddress\`, but received: \`"${address}"\``,
      );
    });
  });
});
