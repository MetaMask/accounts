import { SolAddressStruct } from './types';

describe('types', () => {
  describe('SolAddressStruct', () => {
    it.each([
      '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV',
      'A5R99q8qeyUhgwYAdp5h8pAD1iteVjCzpCv7G6JRZLaQ',
    ])('is valid address; %s', (address) => {
      expect(() => SolAddressStruct.assert(address)).not.toThrow();
    });
  });
});
