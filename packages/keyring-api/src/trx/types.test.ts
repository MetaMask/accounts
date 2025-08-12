import { TrxAddressStruct } from './types';

describe('types', () => {
  describe('TrxAddressStruct', () => {
    it.each([
      'TJ1111111111111111111111111111111111111111',
      'TJ2222222222222222222222222222222222222222',
    ])('is valid address: %s', (address) => {
      expect(() => TrxAddressStruct.assert(address)).not.toThrow();
    });

    it.each([
      // Invalid lengths, too long (45 chars)
      'TJ11111111111111111111111111111111111111111',
      // Too short (31 chars)
      'TJ111111111111111111111111111111111111111',
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
