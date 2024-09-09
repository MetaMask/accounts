import type { KeyringAccount } from '@metamask/keyring-api';
import type { SnapController } from '@metamask/snaps-controllers';
import type { SnapId } from '@metamask/snaps-sdk';

import { KeyringSnapControllerClient } from './KeyringSnapControllerClient';

describe('KeyringSnapControllerClient', () => {
  const snapId = 'local:localhost:3000' as SnapId;

  const accountsList: KeyringAccount[] = [
    {
      id: '13f94041-6ae6-451f-a0fe-afdd2fda18a7',
      address: '0xE9A74AACd7df8112911ca93260fC5a046f8a64Ae',
      options: {},
      methods: [],
      type: 'eip155:eoa',
    },
  ];

  const controller = {
    handleRequest: jest.fn(),
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

    it('should call the listAccounts method and return the result', async () => {
      const client = new KeyringSnapControllerClient({
        controller: controller as unknown as SnapController,
        snapId,
      });

      controller.handleRequest.mockResolvedValue(accountsList);
      const accounts = await client.listAccounts();
      expect(controller.handleRequest).toHaveBeenCalledWith(request);
      expect(accounts).toStrictEqual(accountsList);
    });

    it('should call the listAccounts method and return the result (withSnapId)', async () => {
      const client = new KeyringSnapControllerClient({
        controller: controller as unknown as SnapController,
      });

      controller.handleRequest.mockResolvedValue(accountsList);
      const accounts = await client.withSnapId(snapId).listAccounts();
      expect(controller.handleRequest).toHaveBeenCalledWith(request);
      expect(accounts).toStrictEqual(accountsList);
    });

    it('should call the default snapId value ("undefined")', async () => {
      const client = new KeyringSnapControllerClient({
        controller: controller as unknown as SnapController,
      });

      controller.handleRequest.mockResolvedValue(accountsList);
      await client.listAccounts();
      expect(controller.handleRequest).toHaveBeenCalledWith({
        ...request,
        snapId: 'undefined',
      });
    });
  });

  describe('getController', () => {
    it('should return the controller', () => {
      const client = new KeyringSnapControllerClient({
        controller: controller as unknown as SnapController,
      });

      expect(client.getController()).toBe(controller);
    });
  });
});
