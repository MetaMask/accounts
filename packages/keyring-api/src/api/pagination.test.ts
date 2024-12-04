import { is } from '@metamask/superstruct';

import { PaginationStruct } from './pagination';

describe('PaginationStruct', () => {
  it.each([
    // Valid
    {
      pagination: {
        limit: 1,
        next: 'next-cursor',
      },
      expected: true,
    },
    {
      pagination: {
        limit: 1,
        next: null,
      },
      expected: true,
    },
    {
      pagination: {
        limit: 1,
      },
      expected: true,
    },
    // Missing `limit`
    { pagination: { next: 'next-cursor' }, expected: false },
  ])(
    'returns $expected for is($asset, PaginationStruct)',
    ({ pagination, expected }) => {
      expect(is(pagination, PaginationStruct)).toBe(expected);
    },
  );
});
