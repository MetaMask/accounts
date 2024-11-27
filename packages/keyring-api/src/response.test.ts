import { is } from '@metamask/superstruct';

import { KeyringResponseStruct } from './response';

describe('KeyringResponseStruct', () => {
  it.each([
    // Valid
    {
      response: {
        pending: false,
        result: {},
      },
      expected: true,
    },
    {
      response: {
        pending: true,
        redirect: {
          message: 'success',
          url: 'http://dapp.example.com/continue',
        },
      },
      expected: true,
    },
    {
      response: {
        pending: true,
        redirect: {
          url: 'http://dapp.example.com/continue',
        },
      },
      expected: true,
    },
    {
      response: {
        pending: true,
        redirect: {
          message: 'success',
        },
      },
      expected: true,
    },
    {
      response: {
        pending: true,
      },
      expected: true,
    },
    // Invalid
    {
      response: {
        pending: true,
        result: {},
      },
      expected: false,
    },
    {
      response: {
        pending: false,
        redirect: {
          message: 'success',
          url: 'http://dapp.example.com/continue',
        },
      },
      expected: false,
    },
  ])(
    'returns $expected for is($data, KeyringResponseStruct)',
    ({ response, expected }) => {
      expect(is(response, KeyringResponseStruct)).toBe(expected);
    },
  );
});
