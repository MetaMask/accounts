import { XlmAddressStruct } from './types';

describe('types', () => {
  describe('XlmAddressStruct', () => {
    it.each([
      'GAKGOF5HPQSMKOJ6L4I2LNTLY6EERIRC7ZB6F7MOAXDLPZ7D5I4NZGNZ',
      'GDAMXWN25KO5HFBYY6GYVF56QQLJKKZJ5FTSBKFXVBVKQCV4AI5HAQOA',
    ])('is valid address: %s', (address) => {
      expect(() => XlmAddressStruct.assert(address)).not.toThrow();
    });

    it.each([
      // Invalid lengths, too long (57 chars)
      'GAKGOF5HPQSMKOJ6L4I2LNTLY6EERIRC7ZB6F7MOAXDLPZ7D5I4NZGNZ1',
      // Too short (54 chars after G)
      'GAKGOF5HPQSMKOJ6L4I2LNTLY6EERIRC7ZB6F7MOAXDLPZ7D5I4NZGN',
      // Empty or invalid input
      '',
      // Eth style address
      '0x1234',
      'not-an-address',
      // Muxed address (not supported)
      'MAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABWTA',
    ])('rejects invalid address: %s', (address) => {
      expect(() => XlmAddressStruct.assert(address)).toThrow(
        `Expected a value of type \`XlmAddress\`, but received: \`"${address}"\``,
      );
    });
  });
});
