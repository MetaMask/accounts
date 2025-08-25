import { BtcMethod, BtcScope, KeyringRpcMethod } from '@metamask/keyring-api';
import type {
  KeyringAccount,
  KeyringRequest,
  KeyringResponse,
  CaipChainId,
  CaipAssetType,
  CaipAssetTypeOrId,
  DiscoveredAccount,
} from '@metamask/keyring-api';
import type { JsonRpcRequest } from '@metamask/keyring-utils';

import { KeyringClient, KeyringPublicClient } from '.'; // Import from `index.ts` to test the public API

describe('KeyringClient', () => {
  const mockSender = {
    send: jest.fn(),
  };

  const keyringClient = new KeyringClient(mockSender);
  const publicClient = new KeyringPublicClient(mockSender);

  beforeEach(() => {
    mockSender.send.mockClear();
  });

  // -----------------------------------------------------------------------------------------------
  // Public methods (can be used by a companion dapp and MetaMask)

  describe.each([keyringClient, publicClient])(
    'Public methods',
    (client: KeyringClient | KeyringPublicClient) => {
      describe('listAccounts', () => {
        it('should send a request to list accounts and return the response', async () => {
          const expectedResponse: KeyringAccount[] = [
            {
              id: '49116980-0712-4fa5-b045-e4294f1d440e',
              address: '0xE9A74AACd7df8112911ca93260fC5a046f8a64Ae',
              options: {},
              methods: [],
              scopes: ['eip155:0'],
              type: 'eip155:eoa',
            },
          ];

          mockSender.send.mockResolvedValue(expectedResponse);
          const accounts = await client.listAccounts();
          expect(mockSender.send).toHaveBeenCalledWith({
            jsonrpc: '2.0',
            id: expect.any(String),
            method: 'keyring_listAccounts',
          });
          expect(accounts).toStrictEqual(expectedResponse);
        });
      });

      describe('getAccount', () => {
        it('should send a request to get an account by ID and return the response', async () => {
          const id = '49116980-0712-4fa5-b045-e4294f1d440e';
          const expectedResponse: KeyringAccount = {
            id: '49116980-0712-4fa5-b045-e4294f1d440e',
            address: '0xE9A74AACd7df8112911ca93260fC5a046f8a64Ae',
            options: {},
            methods: [],
            scopes: ['eip155:0'],
            type: 'eip155:eoa',
          };

          mockSender.send.mockResolvedValue(expectedResponse);
          const account = await client.getAccount(id);
          expect(mockSender.send).toHaveBeenCalledWith({
            jsonrpc: '2.0',
            id: expect.any(String),
            method: 'keyring_getAccount',
            params: { id },
          });
          expect(account).toStrictEqual(expectedResponse);
        });
      });

      describe('createAccount', () => {
        it('should send a request to create an account and return the response', async () => {
          const expectedResponse: KeyringAccount = {
            id: '49116980-0712-4fa5-b045-e4294f1d440e',
            address: '0xE9A74AACd7df8112911ca93260fC5a046f8a64Ae',
            options: {},
            methods: [],
            scopes: ['eip155:0'],
            type: 'eip155:eoa',
          };

          mockSender.send.mockResolvedValue(expectedResponse);
          const account = await client.createAccount();
          expect(mockSender.send).toHaveBeenCalledWith({
            jsonrpc: '2.0',
            id: expect.any(String),
            method: 'keyring_createAccount',
            params: { options: {} },
          });
          expect(account).toStrictEqual(expectedResponse);
        });

        describe('filterAccountChains', () => {
          it('should send a request to filter the chains supported by an account and return the response', async () => {
            const id = '49116980-0712-4fa5-b045-e4294f1d440e';
            const expectedResponse = ['eip155:1', 'eip155:137'];

            mockSender.send.mockResolvedValue(expectedResponse);
            const account = await client.filterAccountChains(
              '49116980-0712-4fa5-b045-e4294f1d440e',
              ['eip155:1', 'eip155:137', 'other:chain'],
            );
            expect(mockSender.send).toHaveBeenCalledWith({
              jsonrpc: '2.0',
              id: expect.any(String),
              method: 'keyring_filterAccountChains',
              params: { id, chains: ['eip155:1', 'eip155:137', 'other:chain'] },
            });
            expect(account).toStrictEqual(expectedResponse);
          });
        });

        describe('updateAccount', () => {
          it('should send a request to update an account', async () => {
            const account: KeyringAccount = {
              id: '49116980-0712-4fa5-b045-e4294f1d440e',
              address: '0xE9A74AACd7df8112911ca93260fC5a046f8a64Ae',
              options: {},
              methods: [],
              scopes: ['eip155:0'],
              type: 'eip155:eoa',
            };

            mockSender.send.mockResolvedValue(null);
            const response = await client.updateAccount(account);
            expect(mockSender.send).toHaveBeenCalledWith({
              jsonrpc: '2.0',
              id: expect.any(String),
              method: 'keyring_updateAccount',
              params: { account },
            });
            expect(response).toBeUndefined();
          });
        });

        describe('deleteAccount', () => {
          it('should send a request to delete an account', async () => {
            const id = '49116980-0712-4fa5-b045-e4294f1d440e';

            mockSender.send.mockResolvedValue(null);
            const response = await client.deleteAccount(id);
            expect(mockSender.send).toHaveBeenCalledWith({
              jsonrpc: '2.0',
              id: expect.any(String),
              method: 'keyring_deleteAccount',
              params: { id },
            });
            expect(response).toBeUndefined();
          });
        });

        describe('exportAccount', () => {
          it('should send a request to export an account', async () => {
            const id = '49116980-0712-4fa5-b045-e4294f1d440e';
            const expectedResponse = {
              privateKey: '0x000000000',
            };

            mockSender.send.mockResolvedValue(expectedResponse);
            const response = await client.exportAccount(id);
            expect(mockSender.send).toHaveBeenCalledWith({
              jsonrpc: '2.0',
              id: expect.any(String),
              method: 'keyring_exportAccount',
              params: { id },
            });
            expect(response).toStrictEqual(expectedResponse);
          });
        });

        describe('listRequests', () => {
          it('should send a request to list requests and return the response', async () => {
            const expectedResponse: KeyringRequest[] = [
              {
                id: '71621d8d-62a4-4bf4-97cc-fb8f243679b0',
                scope: 'eip155:1',
                origin: 'test',
                account: '46b5ccd3-4786-427c-89d2-cef626dffe9b',
                request: {
                  method: 'personal_sign',
                  params: ['0xe9a74aacd7df8112911ca93260fc5a046f8a64ae', '0x0'],
                },
              },
            ];

            mockSender.send.mockResolvedValue(expectedResponse);
            const response = await client.listRequests();
            expect(mockSender.send).toHaveBeenCalledWith({
              jsonrpc: '2.0',
              id: expect.any(String),
              method: 'keyring_listRequests',
            });
            expect(response).toStrictEqual(expectedResponse);
          });
        });

        describe('getRequest', () => {
          it('should send a request to get a request and return the response', async () => {
            const id = '71621d8d-62a4-4bf4-97cc-fb8f243679b0';
            const expectedResponse: KeyringRequest = {
              id,
              scope: 'eip155:1',
              origin: 'test',
              account: '46b5ccd3-4786-427c-89d2-cef626dffe9b',
              request: {
                method: 'personal_sign',
                params: ['0xe9a74aacd7df8112911ca93260fc5a046f8a64ae', '0x0'],
              },
            };

            mockSender.send.mockResolvedValue(expectedResponse);
            const response = await client.getRequest(id);
            expect(mockSender.send).toHaveBeenCalledWith({
              jsonrpc: '2.0',
              id: expect.any(String),
              method: 'keyring_getRequest',
              params: { id },
            });
            expect(response).toStrictEqual(expectedResponse);
          });
        });

        describe('approveRequest', () => {
          it('should send a request to approve a request', async () => {
            const id = '71621d8d-62a4-4bf4-97cc-fb8f243679b0';

            mockSender.send.mockResolvedValue(null);
            const response = await client.approveRequest(id);
            expect(mockSender.send).toHaveBeenCalledWith({
              jsonrpc: '2.0',
              id: expect.any(String),
              method: 'keyring_approveRequest',
              params: { id, data: {} },
            });
            expect(response).toBeUndefined();
          });
        });

        describe('rejectRequest', () => {
          it('should send a request to approve a request', async () => {
            const id = '71621d8d-62a4-4bf4-97cc-fb8f243679b0';

            mockSender.send.mockResolvedValue(null);
            const response = await client.rejectRequest(id);
            expect(mockSender.send).toHaveBeenCalledWith({
              jsonrpc: '2.0',
              id: expect.any(String),
              method: 'keyring_rejectRequest',
              params: { id },
            });
            expect(response).toBeUndefined();
          });
        });
      });
    },
  );

  // -----------------------------------------------------------------------------------------------
  // Private/Internal methods (meant to be used by MetaMask)

  const client = keyringClient;

  describe('discoverAccounts', () => {
    const scopes = [BtcScope.Mainnet, BtcScope.Testnet];
    const entropySource = '01JQCAKR17JARQXZ0NDP760N1K';

    it('returns an empty list of discovered accounts', async () => {
      const groupIndex = 0;
      const expectedResponse: DiscoveredAccount[] = [];

      mockSender.send.mockResolvedValue(expectedResponse);
      const accounts = await client.discoverAccounts(
        scopes,
        entropySource,
        groupIndex,
      );

      expect(mockSender.send).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        id: expect.any(String),
        method: 'keyring_discoverAccounts',
        params: { scopes, entropySource, groupIndex },
      });

      expect(accounts).toStrictEqual(expectedResponse);
    });
  });

  describe('listAccountTransactions', () => {
    it('returns an empty list of transactions', async () => {
      const id = '49116980-0712-4fa5-b045-e4294f1d440e';
      const expectedResponse = {
        data: [],
        next: null,
      };

      mockSender.send.mockResolvedValue(expectedResponse);
      const pagination = { limit: 10 };
      const transactions = await client.listAccountTransactions(id, pagination);

      expect(mockSender.send).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        id: expect.any(String),
        method: 'keyring_listAccountTransactions',
        params: { id, pagination },
      });

      expect(transactions).toStrictEqual(expectedResponse);
    });

    it('returns a single page of transactions', async () => {
      const id = '03a16e94-df42-46e6-affc-789bd58cf478';
      const pagination = { limit: 2 };
      const expectedResponse = {
        data: [
          {
            id: 'f5d8ee39a430901c91a5917b9f2dc19d6d1a0e9cea205b009ca73dd04470b9a6',
            account: id,
            chain: 'eip155:1',
            type: 'send',
            status: 'confirmed',
            timestamp: 1716367781,
            from: [],
            to: [],
            fees: [],
            events: [],
          },
          {
            id: 'ff6b24b2a7d8168890bd511e5c934dc94da31fe7e86d0aa46b601b45dbaab389',
            account: id,
            chain: 'eip155:1',
            type: 'receive',
            status: 'submitted',
            timestamp: null,
            from: [],
            to: [],
            fees: [],
            events: [],
          },
        ],
        next: null,
      };

      mockSender.send.mockResolvedValue(expectedResponse);
      const transactions = await client.listAccountTransactions(id, pagination);

      expect(mockSender.send).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        id: expect.any(String),
        method: 'keyring_listAccountTransactions',
        params: { id, pagination },
      });

      expect(transactions).toStrictEqual(expectedResponse);
    });

    it('returns a page of transactions with next', async () => {
      const id = '03a16e94-df42-46e6-affc-789bd58cf478';
      const pagination = { limit: 2 };
      const expectedResponse = {
        data: [
          {
            id: 'f5d8ee39a430901c91a5917b9f2dc19d6d1a0e9cea205b009ca73dd04470b9a6',
            account: id,
            chain: 'eip155:1',
            type: 'send',
            status: 'confirmed',
            timestamp: 1716367781,
            from: [],
            to: [],
            fees: [],
            events: [],
          },
          {
            id: 'ff6b24b2a7d8168890bd511e5c934dc94da31fe7e86d0aa46b601b45dbaab389',
            account: id,
            chain: 'eip155:1',
            type: 'receive',
            status: 'submitted',
            timestamp: null,
            from: [],
            to: [],
            fees: [],
            events: [],
          },
        ],
        next: 'some-cursor',
      };

      mockSender.send.mockResolvedValue(expectedResponse);
      const transactions = await client.listAccountTransactions(id, pagination);

      expect(mockSender.send).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        id: expect.any(String),
        method: 'keyring_listAccountTransactions',
        params: { id, pagination },
      });

      expect(transactions).toStrictEqual(expectedResponse);
    });

    it('throws an error when the fee has an invalid amount', async () => {
      const id = '03a16e94-df42-46e6-affc-789bd58cf478';
      const expectedResponse = {
        data: [
          {
            id: 'f5d8ee39a430901c91a5917b9f2dc19d6d1a0e9cea205b009ca73dd04470b9a6',
            account: id,
            chain: 'eip155:1',
            type: 'send',
            status: 'confirmed',
            timestamp: 1716367781,
            from: [],
            to: [],
            fees: [
              {
                type: 'priority',
                asset: {
                  fungible: true,
                  type: 'eip155:1/slip44:60',
                  unit: 'ETH',
                  amount: 'invalid-amount', // Should be a numeric string
                },
              },
            ],
            events: [],
          },
        ],
        next: null,
      };

      mockSender.send.mockResolvedValue(expectedResponse);
      await expect(
        client.listAccountTransactions(id, {
          limit: 2,
        }),
      ).rejects.toThrow(
        'At path: data.0.fees.0.asset.amount -- Expected a value of type `StringNumber`, but received: `"invalid-amount"`',
      );
    });

    it('throws an error when the fee has an invalid type', async () => {
      const id = '03a16e94-df42-46e6-affc-789bd58cf478';
      const expectedResponse = {
        data: [
          {
            id: 'f5d8ee39a430901c91a5917b9f2dc19d6d1a0e9cea205b009ca73dd04470b9a6',
            account: id,
            chain: 'eip155:1',
            type: 'send',
            status: 'confirmed',
            timestamp: 1716367781,
            from: [],
            to: [],
            fees: [
              {
                type: 'invalid-type', // Not a valid fee type
                asset: {
                  fungible: true,
                  type: 'eip155:1/slip44:60',
                },
                amount: '0',
                unit: 'ETH',
              },
            ],
            events: [],
          },
        ],
        next: null,
      };

      mockSender.send.mockResolvedValue(expectedResponse);
      await expect(
        client.listAccountTransactions(id, {
          limit: 2,
        }),
      ).rejects.toThrow(
        'At path: data.0.fees.0.type -- Expected one of `"base","priority"`, but received: "invalid-type"',
      );
    });
  });

  describe('listAccountAssets', () => {
    it('returns an empty list of assets', async () => {
      const id = '4eda78cd-aed8-42c1-a2a0-4c9b36e8282f';
      const expectedResponse: CaipAssetTypeOrId[] = [];

      mockSender.send.mockResolvedValue(expectedResponse);
      const assets = await client.listAccountAssets(id);

      expect(mockSender.send).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        id: expect.any(String),
        method: 'keyring_listAccountAssets',
        params: { id },
      });

      expect(assets).toStrictEqual(expectedResponse);
    });

    it('returns a non-empty assets list', async () => {
      const id = '4eda78cd-aed8-42c1-a2a0-4c9b36e8282f';
      const expectedResponse: CaipAssetTypeOrId[] = [
        // DAI Token
        'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f',
        // CryptoKitties Collection
        'eip155:1/erc721:0x06012c8cf97BEaD5deAe237070F9587f8E7A266d',
        // CryptoKitties Collectible #771769
        'eip155:1/erc721:0x06012c8cf97BEaD5deAe237070F9587f8E7A266d/771769',
      ];

      mockSender.send.mockResolvedValue(expectedResponse);
      const assets = await client.listAccountAssets(id);

      expect(mockSender.send).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        id: expect.any(String),
        method: 'keyring_listAccountAssets',
        params: { id },
      });

      expect(assets).toStrictEqual(expectedResponse);
    });

    it('throws an error if one asset is not CAIP-19 compliant', async () => {
      const id = '4eda78cd-aed8-42c1-a2a0-4c9b36e8282f';
      const expectedResponse = ['not:compliant'];

      mockSender.send.mockResolvedValue(expectedResponse);
      await expect(client.listAccountAssets(id)).rejects.toThrow(
        'At path: 0 -- Expected a value of type `CaipAssetTypeOrId`, but received: `"not:compliant"`',
      );
    });
  });

  describe('getAccountBalances', () => {
    it('returns a valid response', async () => {
      const assets: CaipAssetType[] = [
        'bip122:000000000019d6689c085ae165831e93/slip44:0',
      ];
      const id = '1617ea08-d4b6-48bf-ba83-901ef1e45ed7';
      const expectedResponse = {
        [assets[0] as string]: {
          amount: '1234',
          unit: 'sat',
        },
      };

      mockSender.send.mockResolvedValue(expectedResponse);
      const balances = await client.getAccountBalances(id, assets);

      expect(mockSender.send).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        id: expect.any(String),
        method: `${KeyringRpcMethod.GetAccountBalances}`,
        params: { id, assets },
      });

      expect(balances).toStrictEqual(expectedResponse);
    });

    it('throws an error because the amount has the wrong type', async () => {
      const assets: CaipAssetType[] = [
        'bip122:000000000019d6689c085ae165831e93/slip44:0',
      ];
      const id = '1617ea08-d4b6-48bf-ba83-901ef1e45ed7';
      const expectedResponse = {
        [assets[0] as string]: {
          amount: 1234, // Should be a `StringNumber`
          unit: 'sat',
        },
      };

      mockSender.send.mockResolvedValue(expectedResponse);
      await expect(client.getAccountBalances(id, assets)).rejects.toThrow(
        'At path: bip122:000000000019d6689c085ae165831e93/slip44:0.amount -- Expected a value of type `StringNumber`, but received: `1234`',
      );
    });

    it("throws an error because the amount isn't a StringNumber", async () => {
      const assets: CaipAssetType[] = [
        'bip122:000000000019d6689c085ae165831e93/slip44:0',
      ];
      const id = '1617ea08-d4b6-48bf-ba83-901ef1e45ed7';
      const expectedResponse = {
        [assets[0] as string]: {
          amount: 'not-a-string-number', // Should be a `StringNumber`
          unit: 'sat',
        },
      };

      mockSender.send.mockResolvedValue(expectedResponse);
      await expect(client.getAccountBalances(id, assets)).rejects.toThrow(
        'At path: bip122:000000000019d6689c085ae165831e93/slip44:0.amount -- Expected a value of type `StringNumber`, but received: `"not-a-string-number"`',
      );
    });
  });

  describe('resolveAccountAddress', () => {
    const scope: CaipChainId = 'bip122:000000000019d6689c085ae165831e93';
    const request: JsonRpcRequest = {
      id: '71621d8d-62a4-4bf4-97cc-fb8f243679b0',
      jsonrpc: '2.0',
      method: BtcMethod.SendTransfer,
      params: {
        recipients: {
          address: '0.1',
        },
        replaceable: true,
      },
    };

    it('should send a request to resolve an account address from a signing request and return the response', async () => {
      const expectedResponse = {
        address: `${scope}:tb1qspc3kwj3zfnltjpucn7ugahr8lhrgg86wzpvs3`,
      };

      mockSender.send.mockResolvedValue(expectedResponse);
      const account = await client.resolveAccountAddress(scope, request);
      expect(mockSender.send).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        id: expect.any(String),
        method: 'keyring_resolveAccountAddress',
        params: {
          scope,
          request,
        },
      });
      expect(account).toStrictEqual(expectedResponse);
    });

    it('should send a request to resolve an account address from a signing request and return null if the address cannot be resolved', async () => {
      const expectedResponse = null;

      mockSender.send.mockResolvedValue(expectedResponse);
      const account = await client.resolveAccountAddress(scope, request);
      expect(mockSender.send).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        id: expect.any(String),
        method: 'keyring_resolveAccountAddress',
        params: {
          scope,
          request,
        },
      });
      expect(account).toStrictEqual(expectedResponse);
    });

    it('should throw an exception if the response is malformed', async () => {
      const expectedResponse = {
        not: 'good',
      };

      mockSender.send.mockResolvedValue(expectedResponse);
      await expect(
        client.resolveAccountAddress(scope, request),
      ).rejects.toThrow(
        'At path: address -- Expected a value of type `CaipAccountId`, but received: `undefined`',
      );
    });
  });

  describe('submitRequest', () => {
    it('should send a request to submit a request', async () => {
      const request: KeyringRequest = {
        id: '71621d8d-62a4-4bf4-97cc-fb8f243679b0',
        scope: 'eip155:1',
        origin: 'test',
        account: '46b5ccd3-4786-427c-89d2-cef626dffe9b',
        request: {
          method: 'personal_sign',
          params: ['0xe9a74aacd7df8112911ca93260fc5a046f8a64ae', '0x0'],
        },
      };
      const expectedResponse: KeyringResponse = {
        pending: true,
        redirect: {
          message: 'Please continue to the dapp',
          url: 'https://example.com',
        },
      };

      mockSender.send.mockResolvedValue(expectedResponse);
      const response = await client.submitRequest(request);
      expect(mockSender.send).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        id: expect.any(String),
        method: 'keyring_submitRequest',
        params: request,
      });
      expect(response).toStrictEqual(expectedResponse);
    });
  });
});
