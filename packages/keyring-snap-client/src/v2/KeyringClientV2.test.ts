import {
  KeyringRpcV2Method,
  PrivateKeyEncoding,
  type KeyringAccount,
  type KeyringRequest,
} from '@metamask/keyring-api';
import type { Json } from '@metamask/utils';

import { KeyringClientV2 } from './KeyringClientV2';

describe('KeyringClient', () => {
  const mockSender = {
    send: jest.fn(),
  };

  beforeEach(() => {
    mockSender.send.mockClear();
  });

  describe('KeyringClientV2', () => {
    const client = new KeyringClientV2(mockSender);

    describe('getAccounts', () => {
      it('sends a request to get accounts and return the response', async () => {
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
        const accounts = await client.getAccounts();
        expect(mockSender.send).toHaveBeenCalledWith({
          jsonrpc: '2.0',
          id: expect.any(String),
          method: `${KeyringRpcV2Method.GetAccounts}`,
        });
        expect(accounts).toStrictEqual(expectedResponse);
      });
    });

    describe('getAccount', () => {
      it('sends a request to get an account by ID and return the response', async () => {
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
          method: `${KeyringRpcV2Method.GetAccount}`,
          params: { id },
        });
        expect(account).toStrictEqual(expectedResponse);
      });
    });

    describe('createAccounts', () => {
      it('sends a request to create an account and return the response', async () => {
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
        const account = await client.createAccounts();
        expect(mockSender.send).toHaveBeenCalledWith({
          jsonrpc: '2.0',
          id: expect.any(String),
          method: `${KeyringRpcV2Method.CreateAccounts}`,
          params: { options: {} },
        });
        expect(account).toStrictEqual(expectedResponse);
      });
    });

    describe('deleteAccount', () => {
      it('sends a request to delete an account', async () => {
        const id = '49116980-0712-4fa5-b045-e4294f1d440e';

        mockSender.send.mockResolvedValue(null);
        const response = await client.deleteAccount(id);
        expect(mockSender.send).toHaveBeenCalledWith({
          jsonrpc: '2.0',
          id: expect.any(String),
          method: `${KeyringRpcV2Method.DeleteAccount}`,
          params: { id },
        });
        expect(response).toBeUndefined();
      });
    });

    describe('exportAccount', () => {
      it('sends a request to export an account', async () => {
        const id = '49116980-0712-4fa5-b045-e4294f1d440e';
        const expectedResponse = {
          type: 'private-key',
          privateKey: '0x000000000',
          encoding: 'hexadecimal',
        };

        mockSender.send.mockResolvedValue(expectedResponse);
        const response = await client.exportAccount(id);
        expect(mockSender.send).toHaveBeenCalledWith({
          jsonrpc: '2.0',
          id: expect.any(String),
          method: `${KeyringRpcV2Method.ExportAccount}`,
          params: { id },
        });
        expect(response).toStrictEqual(expectedResponse);
      });

      it('sends a request to export an account with options', async () => {
        const id = '49116980-0712-4fa5-b045-e4294f1d440e';
        const expectedResponse = {
          type: 'private-key',
          privateKey: '0x000000000',
          encoding: 'hexadecimal',
        };
        const options = {
          type: 'private-key' as const,
          encoding: PrivateKeyEncoding.Hexadecimal,
        };

        mockSender.send.mockResolvedValue(expectedResponse);
        const response = await client.exportAccount(id, options);
        expect(mockSender.send).toHaveBeenCalledWith({
          jsonrpc: '2.0',
          id: expect.any(String),
          method: `${KeyringRpcV2Method.ExportAccount}`,
          params: {
            id,
            options,
          },
        });
        expect(response).toStrictEqual(expectedResponse);
      });
    });

    describe('submitRequest', () => {
      it('sends a request to submit a request', async () => {
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
        const expectedResponse: Json = {
          result: 'success',
        };

        mockSender.send.mockResolvedValue(expectedResponse);
        const response = await client.submitRequest(request);
        expect(mockSender.send).toHaveBeenCalledWith({
          jsonrpc: '2.0',
          id: expect.any(String),
          method: `${KeyringRpcV2Method.SubmitRequest}`,
          params: request,
        });
        expect(response).toStrictEqual(expectedResponse);
      });
    });
  });
});
