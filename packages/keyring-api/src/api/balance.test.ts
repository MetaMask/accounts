import { is } from '@metamask/superstruct';

import { BalanceStruct } from './balance';

describe('BalanceStruct', () => {
  it.each([
    // Valid
    { balance: { amount: '1.0', unit: 'ETH' }, expected: true },
    { balance: { amount: '0.1', unit: 'BTC' }, expected: true },
    // FIXME: Those are not valid for `StringNumberStruct`, but they should be:
    // { balance: { amount: '.1', unit: 'gwei' }, expected: true },
    // { balance: { amount: '.1', unit: 'wei' }, expected: true },
    // { balance: { amount: '1.', unit: 'sat' }, expected: true },
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
  ])(
    'returns $expected for is($balance, BalanceStruct)',
    ({ balance, expected }) => {
      expect(is(balance, BalanceStruct)).toBe(expected);
    },
  );
});
