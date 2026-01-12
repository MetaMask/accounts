import { is } from '@metamask/superstruct';

import { BalanceStruct } from './balance';

describe('BalanceStruct', () => {
  it.each([
    // Valid
    {
      balance: { amount: '1.0', unit: 'ETH', rawAmount: '1000000000000000000' },
      expected: true,
    },
    {
      balance: { amount: '0.1', unit: 'BTC', rawAmount: '10000000' },
      expected: true,
    },
    // Missing amount
    {
      balance: { unit: 'ETH', rawAmount: '1000000000000000000' },
      expected: false,
    },
    // Missing unit
    {
      balance: { amount: '1.0', rawAmount: '1000000000000000000' },
      expected: false,
    },
    // Missing rawAmount
    { balance: { amount: '1.0', unit: 'ETH' }, expected: false },
    // Invalid amount type
    {
      balance: { amount: 1, unit: 'ETH', rawAmount: '1000000000000000000' },
      expected: false,
    },
    {
      balance: { amount: true, unit: 'ETH', rawAmount: '1000000000000000000' },
      expected: false,
    },
    {
      balance: { amount: null, unit: 'ETH', rawAmount: '1000000000000000000' },
      expected: false,
    },
    // Invalid unit type
    {
      balance: { amount: '1.0', unit: 1, rawAmount: '1000000000000000000' },
      expected: false,
    },
    {
      balance: { amount: '1.0', unit: true, rawAmount: '1000000000000000000' },
      expected: false,
    },
    {
      balance: { amount: '1.0', unit: null, rawAmount: '1000000000000000000' },
      expected: false,
    },
    // Invalid rawAmount type
    { balance: { amount: '1.0', unit: 'ETH', rawAmount: 1 }, expected: false },
    {
      balance: { amount: '1.0', unit: 'ETH', rawAmount: true },
      expected: false,
    },
    {
      balance: { amount: '1.0', unit: 'ETH', rawAmount: null },
      expected: false,
    },
  ])(
    'returns $expected for is($balance, BalanceStruct)',
    ({ balance, expected }) => {
      expect(is(balance, BalanceStruct)).toBe(expected);
    },
  );
});
