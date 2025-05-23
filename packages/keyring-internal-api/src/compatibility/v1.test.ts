import { EthMethod, EthScope } from '@metamask/keyring-api';

import { toKeyringRequestV1 } from './v1';

describe('v1', () => {
  describe('toKeyringRequestV1', () => {
    const request = {
      id: 'mock-request-id',
      scope: EthScope.Mainnet,
      account: '55583f38-d81b-48f8-8494-fc543c2b5c95',
      origin: 'test',
      request: {
        method: EthMethod.PersonalSign,
        params: {},
      },
    };
    const { origin, ...requestV1 } = request;

    it('converts a keyring request to a keyring request v1', () => {
      expect(toKeyringRequestV1(request)).toStrictEqual(requestV1);
    });
  });
});
