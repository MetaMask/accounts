import { isScopeEqual, isScopeEqualToAny } from '.';

const ETH_EOA = 'eip155:0';
const ETH_MAINNET = 'eip155:1';
const ETH_TESTNET = 'eip155:11155111';
const BTC_MAINNET = 'bip122:000000000019d6689c085ae165831e93';
const BTC_TESTNET = 'bip122:000000000933ea01ad0ee984209779ba';

describe('isScopeEqual', () => {
  it('returns true when both scopes are equal', () => {
    expect(isScopeEqual(ETH_MAINNET, ETH_MAINNET)).toBe(true);
    expect(isScopeEqual(ETH_TESTNET, ETH_TESTNET)).toBe(true);

    expect(isScopeEqual(BTC_MAINNET, BTC_MAINNET)).toBe(true);
    expect(isScopeEqual(BTC_TESTNET, BTC_TESTNET)).toBe(true);
  });

  it('returns false when both scopes are not equal', () => {
    expect(isScopeEqual(ETH_MAINNET, ETH_TESTNET)).toBe(false);
    expect(isScopeEqual(ETH_TESTNET, ETH_MAINNET)).toBe(false);

    expect(isScopeEqual(BTC_MAINNET, BTC_TESTNET)).toBe(false);
    expect(isScopeEqual(BTC_TESTNET, BTC_MAINNET)).toBe(false);
  });

  it('supports EVM EOA scopes', () => {
    expect(isScopeEqual(ETH_MAINNET, ETH_EOA)).toBe(true);
    expect(isScopeEqual(ETH_EOA, ETH_MAINNET)).toBe(true);

    expect(isScopeEqual(ETH_TESTNET, ETH_EOA)).toBe(true);
    expect(isScopeEqual(ETH_EOA, ETH_TESTNET)).toBe(true);

    expect(isScopeEqual(ETH_EOA, BTC_MAINNET)).toBe(false);
    expect(isScopeEqual(BTC_MAINNET, ETH_EOA)).toBe(false);
  });
});

describe('isScopeEqualToAny', () => {
  it('returns true when both scopes are equal', () => {
    expect(isScopeEqualToAny(ETH_MAINNET, [ETH_TESTNET, ETH_MAINNET])).toBe(
      true,
    );
    expect(isScopeEqualToAny(BTC_MAINNET, [BTC_MAINNET, BTC_TESTNET])).toBe(
      true,
    );
  });

  it('returns false when both scopes are not equal', () => {
    expect(isScopeEqualToAny(ETH_MAINNET, [ETH_TESTNET])).toBe(false);
    expect(isScopeEqualToAny(ETH_MAINNET, [])).toBe(false);
    expect(isScopeEqualToAny(BTC_MAINNET, [ETH_MAINNET])).toBe(false);
  });

  it('supports EVM EOA scopes', () => {
    expect(isScopeEqualToAny(ETH_EOA, [ETH_TESTNET, ETH_MAINNET])).toBe(true);
    expect(isScopeEqualToAny(ETH_MAINNET, [ETH_TESTNET, ETH_EOA])).toBe(true);

    expect(isScopeEqualToAny(BTC_MAINNET, [ETH_TESTNET, ETH_EOA])).toBe(false);
    expect(isScopeEqualToAny(ETH_EOA, [BTC_MAINNET, BTC_TESTNET])).toBe(false);
  });
});
