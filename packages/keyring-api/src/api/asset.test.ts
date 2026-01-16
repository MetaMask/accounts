import { is } from '@metamask/superstruct';

import { AssetStruct } from './asset';

describe('AssetStruct', () => {
  it.each([
    // Missing `fungible`
    { asset: {}, expected: false },
    // Valid non-fungible asset
    {
      asset: {
        fungible: false,
        id: 'eip155:1/erc721:0x06012c8cf97BEaD5deAe237070F9587f8E7A266d/771769',
      },
      expected: true,
    },
    // Missing `unit`, `amount`, and `rawAmount`
    { asset: { fungible: true, type: 'eip155:1/slip44:60' }, expected: false },
    // Missing `amount` and `rawAmount`
    {
      asset: { fungible: true, type: 'eip155:1/slip44:60', unit: 'ETH' },
      expected: false,
    },
    // Missing `unit` and `rawAmount`
    {
      asset: { fungible: true, type: 'eip155:1/slip44:60', amount: '0.01' },
      expected: false,
    },
    // Missing `rawAmount`
    {
      asset: {
        fungible: true,
        type: 'eip155:1/slip44:60',
        unit: 'ETH',
        amount: '0.01',
      },
      expected: false,
    },
    // Valid fungible asset
    {
      asset: {
        fungible: true,
        type: 'eip155:1/slip44:60',
        unit: 'ETH',
        amount: '0.01',
        rawAmount: '10000000000000000',
      },
      expected: true,
    },
  ])('returns $expected for is($asset, AssetStruct)', ({ asset, expected }) => {
    expect(is(asset, AssetStruct)).toBe(expected);
  });
});
