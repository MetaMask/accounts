import { is } from '@metamask/superstruct';

import { KeyringAccountDataStruct } from './export';

describe('KeyringAccountDataStruct', () => {
  const sym = Symbol();
  it.each([
    // Valid
    { data: { foo: 'bar' }, expected: true },
    { data: { foo: 'bar', bar: 1 }, expected: true },
    // Undefined is not allowed in JSON
    { data: { foo: undefined, bar: null }, expected: false },
    // Invalid
    { data: 0, expected: false },
    {
      data: '34a0b893b66e312a8b0f7dc4bc4c7930b67f8823513aff5444fb5c64aa060c5a',
      expected: false,
    },
    { data: sym, expected: false },
    // FIXME: Not sure why this one works, maybe the array is
    // mapped as: { 0: 0xdead, 1: 0xbeef, 2: '!' }?
    { data: [0xdead, 0xbeef, '!'], expected: true },
  ])(
    'returns $expected for is($data, KeyringAccountDataStruct)',
    ({ data, expected }) => {
      expect(is(data, KeyringAccountDataStruct)).toBe(expected);
    },
  );
});
