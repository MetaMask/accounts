import { isCaipAssetId, isCaipAssetType } from './caip';

describe('isCaipAssetType', () => {
  // Imported from: https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-19.md#test-cases
  it.each([
    'eip155:1/slip44:60',
    'bip122:000000000019d6689c085ae165831e93/slip44:0',
    'cosmos:cosmoshub-3/slip44:118',
    'bip122:12a765e31ffd4059bada1e25190f6e98/slip44:2',
    'cosmos:Binance-Chain-Tigris/slip44:714',
    'cosmos:iov-mainnet/slip44:234',
    'lip9:9ee11e9df416b18b/slip44:134',
    'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f',
    'eip155:1/erc721:0x06012c8cf97BEaD5deAe237070F9587f8E7A266d',
  ])('returns true for a valid asset type %s', (id) => {
    expect(isCaipAssetType(id)).toBe(true);
  });

  it.each([
    true,
    false,
    null,
    undefined,
    1,
    {},
    [],
    '',
    '!@#$%^&*()',
    'foo',
    'eip155',
    'eip155:',
    'eip155:1',
    'eip155:1:',
    'eip155:1:0x0000000000000000000000000000000000000000:2',
    'bip122',
    'bip122:',
    'bip122:000000000019d6689c085ae165831e93',
    'bip122:000000000019d6689c085ae165831e93/',
    'bip122:000000000019d6689c085ae165831e93/tooooooolong',
    'bip122:000000000019d6689c085ae165831e93/tooooooolong:asset',
    'eip155:1/erc721',
    'eip155:1/erc721:',
    'eip155:1/erc721:0x06012c8cf97BEaD5deAe237070F9587f8E7A266d/',
  ])('returns false for an invalid asset type %s', (id) => {
    expect(isCaipAssetType(id)).toBe(false);
  });
});

describe('isCaipAssetId', () => {
  // Imported from: https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-19.md#test-cases
  it.each([
    'eip155:1/erc721:0x06012c8cf97BEaD5deAe237070F9587f8E7A266d/771769',
    'hedera:mainnet/nft:0.0.55492/12',
  ])('returns true for a valid asset id %s', (id) => {
    expect(isCaipAssetId(id)).toBe(true);
  });

  it.each([
    true,
    false,
    null,
    undefined,
    1,
    {},
    [],
    '',
    '!@#$%^&*()',
    'foo',
    'eip155',
    'eip155:',
    'eip155:1',
    'eip155:1:',
    'eip155:1:0x0000000000000000000000000000000000000000:2',
    'bip122',
    'bip122:',
    'bip122:000000000019d6689c085ae165831e93',
    'bip122:000000000019d6689c085ae165831e93/',
    'bip122:000000000019d6689c085ae165831e93/tooooooolong',
    'bip122:000000000019d6689c085ae165831e93/tooooooolong:asset',
    'eip155:1/erc721',
    'eip155:1/erc721:',
    'eip155:1/erc721:0x06012c8cf97BEaD5deAe237070F9587f8E7A266d/',
  ])('returns false for an invalid asset id %s', (id) => {
    expect(isCaipAssetType(id)).toBe(false);
  });
});
