import type { MetaMaskInpageProvider } from '@metamask/providers';

import type { KeyringAccount } from './api';
import { KeyringSnapRpcClient } from './KeyringSnapRpcClient';

describe('KeyringSnapRpcClient', () => {
  const origin = 'mocked-metamask';

  const accountsList: KeyringAccount[] = [
    {
      id: '13f94041-6ae6-451f-a0fe-afdd2fda18a7',
      address: '0xE9A74AACd7df8112911ca93260fC5a046f8a64Ae',
      options: {},
      methods: [],
      type: 'eip155:eoa',
    },
  ];

  const provider = {
    request: jest.fn(),
  };

  describe('listAccounts', () => {
    it('should call the listAccounts method and return the result', async () => {
      const client = new KeyringSnapRpcClient(
        origin,
        provider as unknown as MetaMaskInpageProvider,
      );
      const request = {
        method: 'wallet_invokeKeyring',
        params: {
          snapId: 'mocked-metamask',
          request: {
            id: expect.any(String),
            jsonrpc: '2.0',
            method: 'keyring_listAccounts',
          },
        },
      };

      provider.request.mockResolvedValue(accountsList);
      const accounts = await client.listAccounts();
      expect(provider.request).toHaveBeenCalledWith(request);
      expect(accounts).toStrictEqual(accountsList);
    });
  });
});
