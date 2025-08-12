import { TrxAddressStruct } from './types';

describe('types', () => {
  describe('TrxAddressStruct', () => {
    it.each([
      'TRjE1H8dxypKM1NZRdysbs9wo7huR4bdNz',
      'TPAe77oEGDLXuNjJhTyYeo5vMqLYdE3GN8U',
    ])('is valid address: %s', (address) => {
      expect(() => TrxAddressStruct.assert(address)).not.toThrow();
    });

    it.each([
      // Invalid lengths, too long (45 chars)
      'TRjE1H8dxypKM1NZRdysbs9wo7huR4bdNz1',
      // Too short (31 chars)
      'TRjE1H8dxypKM1NZRdywo7huR4bdNz',
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
