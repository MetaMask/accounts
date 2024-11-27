import { is } from '@metamask/superstruct';

import { KeyringRequestStruct } from './request';

describe('KeyringRequest', () => {
  it.each([
    // Valid
    {
      request: {
        id: '47d782ac-15c8-4c81-8bfe-759ae1be4a3e',
        scope: 'eip155:1',
        account: 'd6311e3c-a4ec-43fa-b341-592ffefd9797',
        request: {
          method: 'eth_personalSign',
          params: {
            data: '0x00...',
          },
        },
      },
      expected: true,
    },
    {
      request: {
        id: '47d782ac-15c8-4c81-8bfe-759ae1be4a3e',
        scope: 'eip155:1',
        account: 'd6311e3c-a4ec-43fa-b341-592ffefd9797',
        request: {
          method: 'eth_somethingElseWithNoParameters',
        },
      },
      expected: true,
    },
    // Invalid:
    // Missing id
    {
      request: {
        scope: 'eip155:1',
        account: 'd6311e3c-a4ec-43fa-b341-592ffefd9797',
        request: {
          method: 'eth_personalSign',
          params: {
            data: '0x00...',
          },
        },
      },
      expected: false,
    },
    // Missing scope
    {
      request: {
        id: '47d782ac-15c8-4c81-8bfe-759ae1be4a3e',
        account: 'd6311e3c-a4ec-43fa-b341-592ffefd9797',
        request: {
          method: 'eth_personalSign',
          params: {
            data: '0x00...',
          },
        },
      },
      expected: false,
    },
    // Missing account
    {
      request: {
        id: '47d782ac-15c8-4c81-8bfe-759ae1be4a3e',
        scope: 'eip155:1',
        request: {
          method: 'eth_personalSign',
          params: {
            data: '0x00...',
          },
        },
      },
      expected: false,
    },
    // Missing request
    {
      request: {
        id: '47d782ac-15c8-4c81-8bfe-759ae1be4a3e',
        scope: 'eip155:1',
        account: 'd6311e3c-a4ec-43fa-b341-592ffefd9797',
      },
      expected: false,
    },
    // Missing request.method
    {
      request: {
        id: '47d782ac-15c8-4c81-8bfe-759ae1be4a3e',
        scope: 'eip155:1',
        account: 'd6311e3c-a4ec-43fa-b341-592ffefd9797',
        request: {
          params: {
            data: '0x00...',
          },
        },
      },
      expected: false,
    },
  ])(
    'returns $expected for is($data, KeyringRequestStruct)',
    ({ request, expected }) => {
      expect(is(request, KeyringRequestStruct)).toBe(expected);
    },
  );
});
