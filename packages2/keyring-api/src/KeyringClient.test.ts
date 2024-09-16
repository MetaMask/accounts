import {
  type KeyringAccount,
  type KeyringRequest,
  type KeyringResponse,
  KeyringClient,
  KeyringRpcMethod,
} from '.'; // Import from `index.ts` to test the public API

describe('KeyringClient', () => {
  const mockSender = {
    send: jest.fn(),
  };

  const keyring = new KeyringClient(mockSender);

  beforeEach(() => {
    mockSender.send.mockClear();
  });

  describe('listAccounts', () => {
    it('should send a request to list accounts and return the response', async () => {
      const expectedResponse: KeyringAccount[] = [
        {
          id: '49116980-0712-4fa5-b045-e4294f1d440e',
          address: '0xE9A74AACd7df8112911ca93260fC5a046f8a64Ae',
          options: {},
          methods: [],
          type: 'eip155:eoa',
        },
      ];

      mockSender.send.mockResolvedValue(expectedResponse);
      const accounts = await keyring.listAccounts();
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
      const expectedResponse = {
        id: '49116980-0712-4fa5-b045-e4294f1d440e',
        address: '0xE9A74AACd7df8112911ca93260fC5a046f8a64Ae',
        options: {},
        methods: [],
        type: 'eip155:eoa',
      };

      mockSender.send.mockResolvedValue(expectedResponse);
      const account = await keyring.getAccount(id);
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
      const expectedResponse = {
        id: '49116980-0712-4fa5-b045-e4294f1d440e',
        address: '0xE9A74AACd7df8112911ca93260fC5a046f8a64Ae',
        options: {},
        methods: [],
        type: 'eip155:eoa',
      };

      mockSender.send.mockResolvedValue(expectedResponse);
      const account = await keyring.createAccount();
      expect(mockSender.send).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        id: expect.any(String),
        method: 'keyring_createAccount',
        params: { options: {} },
      });
      expect(account).toStrictEqual(expectedResponse);
    });
  });

  describe('getAccountBalances', () => {
    it('returns a valid response', async () => {
      const assets = ['bip122:000000000019d6689c085ae165831e93/slip44:0'];
      const id = '1617ea08-d4b6-48bf-ba83-901ef1e45ed7';
      const expectedResponse = {
        [assets[0] as string]: {
          amount: '1234',
          unit: 'sat',
        },
      };

      mockSender.send.mockResolvedValue(expectedResponse);
      const balances = await keyring.getAccountBalances(id, assets);

      expect(mockSender.send).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        id: expect.any(String),
        method: `${KeyringRpcMethod.GetAccountBalances}`,
        params: { id, assets },
      });

      expect(balances).toStrictEqual(expectedResponse);
    });

    it('throws an error because the amount has the wrong type', async () => {
      const assets = ['bip122:000000000019d6689c085ae165831e93/slip44:0'];
      const id = '1617ea08-d4b6-48bf-ba83-901ef1e45ed7';
      const expectedResponse = {
        [assets[0] as string]: {
          amount: 1234, // Should be a `StringNumber`
          unit: 'sat',
        },
      };

      mockSender.send.mockResolvedValue(expectedResponse);
      await expect(keyring.getAccountBalances(id, assets)).rejects.toThrow(
        'At path: bip122:000000000019d6689c085ae165831e93/slip44:0.amount -- Expected a value of type `StringNumber`, but received: `1234`',
      );
    });

    it("throws an error because the amount isn't a StringNumber", async () => {
      const assets = ['bip122:000000000019d6689c085ae165831e93/slip44:0'];
      const id = '1617ea08-d4b6-48bf-ba83-901ef1e45ed7';
      const expectedResponse = {
        [assets[0] as string]: {
          amount: 'not-a-string-number', // Should be a `StringNumber`
          unit: 'sat',
        },
      };

      mockSender.send.mockResolvedValue(expectedResponse);
      await expect(keyring.getAccountBalances(id, assets)).rejects.toThrow(
        'At path: bip122:000000000019d6689c085ae165831e93/slip44:0.amount -- Expected a value of type `StringNumber`, but received: `"not-a-string-number"`',
      );
    });
  });

  describe('filterAccountChains', () => {
    it('should send a request to filter the chains supported by an account and return the response', async () => {
      const id = '49116980-0712-4fa5-b045-e4294f1d440e';
      const expectedResponse = ['eip155:1', 'eip155:137'];

      mockSender.send.mockResolvedValue(expectedResponse);
      const account = await keyring.filterAccountChains(
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
        type: 'eip155:eoa',
      };

      mockSender.send.mockResolvedValue(null);
      const response = await keyring.updateAccount(account);
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
      const response = await keyring.deleteAccount(id);
      expect(mockSender.send).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        id: expect.any(String),
        method: 'keyring_deleteAccount',
        params: { id },
      });
      expect(response).toBeUndefined();
    });
  });

  describe('exportAccounts', () => {
    it('should send a request to export an account', async () => {
      const id = '49116980-0712-4fa5-b045-e4294f1d440e';
      const expectedResponse = {
        privateKey: '0x000000000',
      };

      mockSender.send.mockResolvedValue(expectedResponse);
      const response = await keyring.exportAccount(id);
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
          account: '46b5ccd3-4786-427c-89d2-cef626dffe9b',
          request: {
            method: 'personal_sign',
            params: ['0xe9a74aacd7df8112911ca93260fc5a046f8a64ae', '0x0'],
          },
        },
      ];

      mockSender.send.mockResolvedValue(expectedResponse);
      const response = await keyring.listRequests();
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
        account: '46b5ccd3-4786-427c-89d2-cef626dffe9b',
        request: {
          method: 'personal_sign',
          params: ['0xe9a74aacd7df8112911ca93260fc5a046f8a64ae', '0x0'],
        },
      };

      mockSender.send.mockResolvedValue(expectedResponse);
      const response = await keyring.getRequest(id);
      expect(mockSender.send).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        id: expect.any(String),
        method: 'keyring_getRequest',
        params: { id },
      });
      expect(response).toStrictEqual(expectedResponse);
    });
  });

  describe('submitRequest', () => {
    it('should send a request to submit a request', async () => {
      const request: KeyringRequest = {
        id: '71621d8d-62a4-4bf4-97cc-fb8f243679b0',
        scope: 'eip155:1',
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
      const response = await keyring.submitRequest(request);
      expect(mockSender.send).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        id: expect.any(String),
        method: 'keyring_submitRequest',
        params: request,
      });
      expect(response).toStrictEqual(expectedResponse);
    });
  });

  describe('approveRequest', () => {
    it('should send a request to approve a request', async () => {
      const id = '71621d8d-62a4-4bf4-97cc-fb8f243679b0';

      mockSender.send.mockResolvedValue(null);
      const response = await keyring.approveRequest(id);
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
      const response = await keyring.rejectRequest(id);
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
