import { KeyringRpcV2Method, PrivateKeyEncoding } from '@metamask/keyring-api';
import type {
  KeyringType,
  CreateAccountsV2Request,
  GetAccountV2Request,
  GetAccountsV2Request,
  DeleteAccountV2Request,
  KeyringV2,
  ExportAccountV2Request,
  SubmitRequestV2Request,
} from '@metamask/keyring-api';
import type { JsonRpcRequest } from '@metamask/keyring-utils';

import { handleKeyringRequestV2 } from './rpc-handler';

describe('handleKeyringRequestV2', () => {
  const keyring = {
    getAccounts: jest.fn(),
    getAccount: jest.fn(),
    createAccounts: jest.fn(),
    deleteAccount: jest.fn(),
    exportAccount: jest.fn(),
    submitRequest: jest.fn(),
    // Not required by this test.
    type: 'Mocked Keyring' as KeyringType,
    capabilities: {
      scopes: [],
    },
    serialize: jest.fn(),
    deserialize: jest.fn(),
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('fails to execute an mal-formatted JSON-RPC request', async () => {
    const request = {
      jsonrpc: '2.0',
      id: '7c507ff0-365f-4de0-8cd5-eb83c30ebda4',
      // Missing method name.
    };

    await expect(
      handleKeyringRequestV2(keyring, request as unknown as JsonRpcRequest),
    ).rejects.toThrow(
      'At path: method -- Expected a string, but received: undefined',
    );
  });

  it('calls `keyring_v2_getAccounts`', async () => {
    const request: GetAccountsV2Request = {
      jsonrpc: '2.0',
      id: '7c507ff0-365f-4de0-8cd5-eb83c30ebda4',
      method: `${KeyringRpcV2Method.GetAccounts}`,
    };

    const mockedResult = 'GetAccounts result';
    keyring.getAccounts.mockResolvedValue(mockedResult);
    const result = await handleKeyringRequestV2(keyring, request);

    expect(keyring.getAccounts).toHaveBeenCalled();
    expect(result).toBe(mockedResult);
  });

  it('calls `keyring_v2_getAccount`', async () => {
    const request: GetAccountV2Request = {
      jsonrpc: '2.0',
      id: '7c507ff0-365f-4de0-8cd5-eb83c30ebda4',
      method: `${KeyringRpcV2Method.GetAccount}`,
      params: { id: '4f983fa2-4f53-4c63-a7c2-f9a5ed750041' },
    };

    const mockedResult = 'GetAccount result';
    keyring.getAccount.mockResolvedValue(mockedResult);
    const result = await handleKeyringRequestV2(keyring, request);

    expect(keyring.getAccount).toHaveBeenCalledWith(request.params.id);
    expect(result).toBe(mockedResult);
  });

  it('fails to call `keyring_v2_getAccount` without providing an account ID', async () => {
    const request: GetAccountV2Request = {
      jsonrpc: '2.0',
      id: '7c507ff0-365f-4de0-8cd5-eb83c30ebda4',
      method: `${KeyringRpcV2Method.GetAccount}`,
      // @ts-expect-error - Testing error case.
      params: {}, // Missing account ID.
    };

    await expect(handleKeyringRequestV2(keyring, request)).rejects.toThrow(
      'At path: params.id -- Expected a value of type `UuidV4`, but received: `undefined`',
    );
  });

  it('fails to call `keyring_v2_getAccount` when the `params` is not provided', async () => {
    // @ts-expect-error - Testing error case.
    const request: GetAccountV2Request = {
      jsonrpc: '2.0',
      id: '7c507ff0-365f-4de0-8cd5-eb83c30ebda4',
      method: `${KeyringRpcV2Method.GetAccount}`,
    };

    await expect(handleKeyringRequestV2(keyring, request)).rejects.toThrow(
      'At path: params -- Expected an object, but received: undefined',
    );
  });

  it('calls `keyring_v2_createAccounts`', async () => {
    const request: CreateAccountsV2Request = {
      jsonrpc: '2.0',
      id: '7c507ff0-365f-4de0-8cd5-eb83c30ebda4',
      method: `${KeyringRpcV2Method.CreateAccounts}`,
      params: {
        type: 'bip44:derive-index',
        groupIndex: 0,
        entropySource: 'mock-entropy-source',
      },
    };

    const mockedResult = 'CreateAccounts result';
    keyring.createAccounts.mockResolvedValue(mockedResult);
    const result = await handleKeyringRequestV2(keyring, request);

    expect(keyring.createAccounts).toHaveBeenCalledWith(request.params);
    expect(result).toBe(mockedResult);
  });

  it('calls `keyring_v2_deleteAccount`', async () => {
    const request: DeleteAccountV2Request = {
      jsonrpc: '2.0',
      id: '7c507ff0-365f-4de0-8cd5-eb83c30ebda4',
      method: `${KeyringRpcV2Method.DeleteAccount}`,
      params: { id: '4f983fa2-4f53-4c63-a7c2-f9a5ed750041' },
    };

    const mockedResult = 'DeleteAccount result';
    keyring.deleteAccount.mockResolvedValue(mockedResult);
    const result = await handleKeyringRequestV2(keyring, request);

    expect(keyring.deleteAccount).toHaveBeenCalledWith(request.params.id);
    expect(result).toBe(mockedResult);
  });

  it('calls `keyring_v2_exportAccount` (without options)', async () => {
    const request: ExportAccountV2Request = {
      jsonrpc: '2.0',
      id: '7c507ff0-365f-4de0-8cd5-eb83c30ebda4',
      method: `${KeyringRpcV2Method.ExportAccount}`,
      params: { id: '4f983fa2-4f53-4c63-a7c2-f9a5ed750041' },
    };

    const mockedResult = {
      privateKey: '0x0123',
    };
    keyring.exportAccount.mockResolvedValue(mockedResult);
    const result = await handleKeyringRequestV2(keyring, request);

    expect(keyring.exportAccount).toHaveBeenCalledWith(
      request.params.id,
      undefined,
    );
    expect(result).toStrictEqual(mockedResult);
  });

  it('calls `keyring_v2_exportAccount` (with options)', async () => {
    const request: ExportAccountV2Request = {
      jsonrpc: '2.0',
      id: '7c507ff0-365f-4de0-8cd5-eb83c30ebda4',
      method: `${KeyringRpcV2Method.ExportAccount}`,
      params: {
        id: '4f983fa2-4f53-4c63-a7c2-f9a5ed750041',
        options: {
          type: 'private-key',
          encoding: PrivateKeyEncoding.Hexadecimal,
        },
      },
    };

    const mockedResult = {
      privateKey: '0x0123',
    };
    keyring.exportAccount.mockResolvedValue(mockedResult);
    const result = await handleKeyringRequestV2(keyring, request);

    expect(keyring.exportAccount).toHaveBeenCalledWith(
      request.params.id,
      request.params.options,
    );
    expect(result).toStrictEqual(mockedResult);
  });

  it('throws an error if `keyring_v2_exportAccount` is not implemented', async () => {
    const request: ExportAccountV2Request = {
      jsonrpc: '2.0',
      id: '7c507ff0-365f-4de0-8cd5-eb83c30ebda4',
      method: `${KeyringRpcV2Method.ExportAccount}`,
      params: { id: '4f983fa2-4f53-4c63-a7c2-f9a5ed750041' },
    };

    const partialKeyring: KeyringV2 = {
      ...keyring,
    };
    delete partialKeyring.exportAccount;

    await expect(
      handleKeyringRequestV2(partialKeyring, request),
    ).rejects.toThrow(
      `Method not supported: ${KeyringRpcV2Method.ExportAccount}`,
    );
  });

  it('calls `keyring_v2_submitRequest`', async () => {
    const dappRequest = {
      id: 'c555de37-cf4b-4ff2-8273-39db7fb58f1c',
      scope: 'eip155:1',
      account: '4abdd17e-8b0f-4d06-a017-947a64823b3d',
      origin: 'metamask',
      request: {
        method: 'eth_method',
        params: [1, 2, 3],
      },
    };

    const request: SubmitRequestV2Request = {
      jsonrpc: '2.0',
      id: '7c507ff0-365f-4de0-8cd5-eb83c30ebda4',
      method: `${KeyringRpcV2Method.SubmitRequest}`,
      params: dappRequest,
    };

    const mockedResult = 'SubmitRequest result';
    keyring.submitRequest.mockResolvedValue(mockedResult);
    const result = await handleKeyringRequestV2(keyring, request);

    expect(keyring.submitRequest).toHaveBeenCalledWith(dappRequest);
    expect(result).toBe(mockedResult);
  });

  it('throws an error if an unknown method is called', async () => {
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: '7c507ff0-365f-4de0-8cd5-eb83c30ebda4',
      method: 'unknown_method',
    };

    await expect(handleKeyringRequestV2(keyring, request)).rejects.toThrow(
      'Method not supported: unknown_method',
    );
  });

  it('throws an "unknown error" if the error message is not a string', async () => {
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: '80c25a6b-4a76-44f4-88c5-7b3b76f72a74',
      method: `${KeyringRpcV2Method.GetAccounts}`,
    };

    const error = new Error();
    error.message = 1 as unknown as string;
    keyring.getAccounts.mockRejectedValue(error);
    await expect(handleKeyringRequestV2(keyring, request)).rejects.toThrow(
      'An unknown error occurred while handling the keyring (v2) request',
    );
  });
});
