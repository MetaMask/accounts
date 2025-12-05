import { KeyringRpcV2Method, type KeyringAccount } from '@metamask/keyring-api';
import type { SnapId } from '@metamask/snaps-sdk';

import { KeyringInternalSnapClientV2 } from './KeyringInternalSnapClientV2';
import type { KeyringInternalSnapClientMessenger } from '../KeyringInternalSnapClientMessenger';

const MOCK_ACCOUNT: KeyringAccount = {
  id: '13f94041-6ae6-451f-a0fe-afdd2fda18a7',
  address: '0xE9A74AACd7df8112911ca93260fC5a046f8a64Ae',
  options: {},
  methods: [],
  scopes: ['eip155:0'],
  type: 'eip155:eoa',
};

describe('KeyringInternalSnapClientV2', () => {
  const snapId = 'local:localhost:3000' as SnapId;

  const accountsList: KeyringAccount[] = [MOCK_ACCOUNT];

  const messenger = {
    call: jest.fn(),
  };

  describe('getAccounts', () => {
    const request = {
      snapId,
      origin: 'metamask',
      handler: 'onKeyringRequest',
      request: {
        id: expect.any(String),
        jsonrpc: '2.0',
        method: KeyringRpcV2Method.GetAccounts,
      },
    };

    it('calls the getAccounts method and return the result', async () => {
      const client = new KeyringInternalSnapClientV2({
        messenger: messenger as unknown as KeyringInternalSnapClientMessenger,
        snapId,
      });

      messenger.call.mockResolvedValue(accountsList);
      const accounts = await client.getAccounts();
      expect(messenger.call).toHaveBeenCalledWith(
        'SnapController:handleRequest',
        request,
      );
      expect(accounts).toStrictEqual(accountsList);
    });

    it('calls the getAccounts method and return the result (withSnapId)', async () => {
      const client = new KeyringInternalSnapClientV2({
        messenger: messenger as unknown as KeyringInternalSnapClientMessenger,
      });

      messenger.call.mockResolvedValue(accountsList);
      const accounts = await client.withSnapId(snapId).getAccounts();
      expect(messenger.call).toHaveBeenCalledWith(
        'SnapController:handleRequest',
        request,
      );
      expect(accounts).toStrictEqual(accountsList);
    });

    it('calls the default snapId value ("undefined")', async () => {
      const client = new KeyringInternalSnapClientV2({
        messenger: messenger as unknown as KeyringInternalSnapClientMessenger,
      });

      messenger.call.mockResolvedValue(accountsList);
      await client.getAccounts();
      expect(messenger.call).toHaveBeenCalledWith(
        'SnapController:handleRequest',
        {
          ...request,
          snapId: 'undefined',
        },
      );
    });
  });
});
