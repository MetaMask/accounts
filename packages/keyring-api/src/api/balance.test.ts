import { is } from '@metamask/superstruct';

import { BalanceStruct } from './balance';

describe('BalanceStruct', () => {
  it.each([
    // Valid
    { balance: { amount: '1.0', unit: 'ETH' }, expected: true },
    { balance: { amount: '0.1', unit: 'BTC' }, expected: true },
    // Missing amount
    { balance: { unit: 'ETH' }, expected: false },
    // Missing unit
    { balance: { amount: '1.0' }, expected: false },
    // Invalid amount type
    { balance: { amount: 1, unit: 'ETH' }, expected: false },
    { balance: { amount: true, unit: 'ETH' }, expected: false },
    { balance: { amount: null, unit: 'ETH' }, expected: false },
    // Invalid unit type
    { balance: { amount: '1.0', unit: 1 }, expected: false },
    { balance: { amount: '1.0', unit: true }, expected: false },
    { balance: { amount: '1.0', unit: null }, expected: false },
    // With metadata
    {
      balance: { amount: '1.0', unit: 'ETH', metadata: { foo: 'bar' } },
      expected: true,
    },
    {
      balance: {
        amount: '1.0',
        unit: 'ETH',
        metadata: { count: 42, flag: true, nested: { x: 1 } },
      },
      expected: true,
    },
    // Without metadata (optional — key must be absent, not explicitly undefined)
    { balance: { amount: '1.0', unit: 'ETH', metadata: undefined }, expected: false },
    // Invalid metadata values
    { balance: { amount: '1.0', unit: 'ETH', metadata: 'string' }, expected: false },
    { balance: { amount: '1.0', unit: 'ETH', metadata: 42 }, expected: false },
    { balance: { amount: '1.0', unit: 'ETH', metadata: { key: undefined } }, expected: false },
  ])(
    'returns $expected for is($balance, BalanceStruct)',
    ({ balance, expected }) => {
      expect(is(balance, BalanceStruct)).toBe(expected);
    },
  );
});
