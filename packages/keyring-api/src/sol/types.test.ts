import { SolAddressStruct } from './types';

describe('types', () => {
  describe('SolAddressStruct', () => {
    it.each([
      '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV',
      'A5R99q8qeyUhgwYAdp5h8pAD1iteVjCzpCv7G6JRZLaQ',
    ])('is valid address: %s', (address) => {
      expect(() => SolAddressStruct.assert(address)).not.toThrow();
    });

    it.each([
      // Invalid lengths, too long (45 chars)
      '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV11',
      // Too short (31 chars)
      '7EcDhSYGxXyscszYEp35KHN8vvw',
      // Empty or invalid input
      '',
      // Eth style address
      '0x1234',
      'not-an-address',
    ])('rejects invalid address: %s', (address) => {
      expect(() => SolAddressStruct.assert(address)).toThrow(
        `Expected a value of type \`SolAddress\`, but received: \`"${address}"\``,
      );
    });
  });
});
