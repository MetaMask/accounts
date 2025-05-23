import {
  EthMethod,
  EthScope,
  type KeyringAccount,
} from '@metamask/keyring-api';
import type { KeyringRequestV1 } from '@metamask/keyring-internal-api';
import type { SnapId } from '@metamask/snaps-sdk';

import {
  KeyringInternalSnapClient,
  type KeyringInternalSnapClientMessenger,
} from './KeyringInternalSnapClient';

const MOCK_ACCOUNT: KeyringAccount = {
  id: '13f94041-6ae6-451f-a0fe-afdd2fda18a7',
  address: '0xE9A74AACd7df8112911ca93260fC5a046f8a64Ae',
  options: {},
  methods: [],
  scopes: ['eip155:0'],
  type: 'eip155:eoa',
};

describe('KeyringInternalSnapClient', () => {
  const snapId = 'local:localhost:3000' as SnapId;

  const accountsList: KeyringAccount[] = [MOCK_ACCOUNT];

  const messenger = {
    call: jest.fn(),
  };

  describe('listAccounts', () => {
    const request = {
      snapId,
      origin: 'metamask',
      handler: 'onKeyringRequest',
      request: {
        id: expect.any(String),
        jsonrpc: '2.0',
        method: 'keyring_listAccounts',
      },
    };

    it('calls the listAccounts method and return the result', async () => {
      const client = new KeyringInternalSnapClient({
        messenger: messenger as unknown as KeyringInternalSnapClientMessenger,
        snapId,
      });

      messenger.call.mockResolvedValue(accountsList);
      const accounts = await client.listAccounts();
      expect(messenger.call).toHaveBeenCalledWith(
        'SnapController:handleRequest',
        request,
      );
      expect(accounts).toStrictEqual(accountsList);
    });

    it('calls the listAccounts method and return the result (withSnapId)', async () => {
      const client = new KeyringInternalSnapClient({
        messenger: messenger as unknown as KeyringInternalSnapClientMessenger,
      });

      messenger.call.mockResolvedValue(accountsList);
      const accounts = await client.withSnapId(snapId).listAccounts();
      expect(messenger.call).toHaveBeenCalledWith(
        'SnapController:handleRequest',
        request,
      );
      expect(accounts).toStrictEqual(accountsList);
    });

    it('calls the default snapId value ("undefined")', async () => {
      const client = new KeyringInternalSnapClient({
        messenger: messenger as unknown as KeyringInternalSnapClientMessenger,
      });

      messenger.call.mockResolvedValue(accountsList);
      await client.listAccounts();
      expect(messenger.call).toHaveBeenCalledWith(
        'SnapController:handleRequest',
        {
          ...request,
          snapId: 'undefined',
        },
      );
    });
  });

  describe('submitRequestV1', () => {
    const keyringRequest: KeyringRequestV1 = {
      id: 'mock-request-id',
      scope: EthScope.Mainnet,
      account: MOCK_ACCOUNT.id,
      request: {
        method: EthMethod.PersonalSign,
        params: {},
      },
    };
    const request = {
      snapId,
      origin: 'metamask',
      handler: 'onKeyringRequest',
      request: {
        id: expect.any(String),
        jsonrpc: '2.0',
        method: 'keyring_submitRequest',
        params: keyringRequest,
      },
    };

    it('calls the submitRequestV1 method', async () => {
      const client = new KeyringInternalSnapClient({
        messenger: messenger as unknown as KeyringInternalSnapClientMessenger,
        snapId,
      });

      messenger.call.mockResolvedValue({
        pending: false,
        result: null,
      });
      await client.submitRequestV1(keyringRequest);
      expect(messenger.call).toHaveBeenCalledWith(
        'SnapController:handleRequest',
        request,
      );
    });
  });
});
