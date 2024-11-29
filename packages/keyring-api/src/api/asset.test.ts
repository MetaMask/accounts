import { is } from '@metamask/superstruct';

import { AssetStruct } from './asset';

describe('AssetStruct', () => {
  it.each([
    // Missing `fungible`
    { asset: {}, expected: false },
    // Valid
    {
      asset: {
        fungible: false,
        id: 'eip155:1/erc721:0x06012c8cf97BEaD5deAe237070F9587f8E7A266d/771769',
      },
      expected: true,
    },
    // Missing `unit` and `amount`
    { asset: { fungible: true, type: 'eip155:1/slip44:60' }, expected: false },
    // Missing `amount`
    {
      asset: { fungible: true, type: 'eip155:1/slip44:60', unit: 'ETH' },
      expected: false,
    },
    // Missing `unit`
    {
      asset: { fungible: true, type: 'eip155:1/slip44:60', amount: '0.01' },
      expected: false,
    },
    // Valid
    {
      asset: {
        fungible: true,
        type: 'eip155:1/slip44:60',
        unit: 'ETH',
        amount: '0.01',
      },
      expected: true,
    },
  ])('returns $expected for is($asset, AssetStruct)', ({ asset, expected }) => {
    expect(is(asset, AssetStruct)).toBe(expected);
  });
});
