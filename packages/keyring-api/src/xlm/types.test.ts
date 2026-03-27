import { XlmAddressStruct } from './types';

describe('types', () => {
  describe('XlmAddressStruct', () => {
    it.each([
      'GDRF6HX6GXUA74N7LFSXVYPPINW5QRLFPQS4PNFG7HJF6DFQQNT2TI4F',
      'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
    ])('is valid address: %s', (address) => {
      expect(() => XlmAddressStruct.assert(address)).not.toThrow();
    });

    it.each([
      // Invalid lengths, too long (57 chars)
      'GDRF6HX6GXUA74N7LFSXVYPPINW5QRLFPQS4PNFG7HJF6DFQQNT2TI4F1',
      // Too short (54 chars after G)
      'GDRF6HX6GXUA74N7LFSXVYPPINW5QRLFPQS4PNFG7HJF6DFQQNT2TI4',
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
