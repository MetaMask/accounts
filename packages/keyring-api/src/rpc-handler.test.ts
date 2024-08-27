import type { Keyring } from './api';
import type { GetAccountBalancesRequest } from './internal';
import { KeyringRpcMethod, isKeyringRpcMethod } from './internal/rpc';
import type { JsonRpcRequest } from './JsonRpcRequest';
import { handleKeyringRequest } from './rpc-handler';

describe('handleKeyringRequest', () => {
  const keyring = {
    listAccounts: jest.fn(),
    getAccount: jest.fn(),
    createAccount: jest.fn(),
    getAccountBalances: jest.fn(),
    filterAccountChains: jest.fn(),
    updateAccount: jest.fn(),
    deleteAccount: jest.fn(),
    exportAccount: jest.fn(),
    listRequests: jest.fn(),
    getRequest: jest.fn(),
    submitRequest: jest.fn(),
    approveRequest: jest.fn(),
    rejectRequest: jest.fn(),
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('calls `keyring_listAccounts`', async () => {
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: '7c507ff0-365f-4de0-8cd5-eb83c30ebda4',
      method: 'keyring_listAccounts',
    };

    keyring.listAccounts.mockResolvedValue('ListAccounts result');
    const result = await handleKeyringRequest(keyring, request);

    expect(keyring.listAccounts).toHaveBeenCalled();
    expect(result).toBe('ListAccounts result');
  });

  it('fails to execute an mal-formatted JSON-RPC request', async () => {
    const request = {
      jsonrpc: '2.0',
      id: '7c507ff0-365f-4de0-8cd5-eb83c30ebda4',
      // Missing method name.
    };

    await expect(
      handleKeyringRequest(keyring, request as unknown as JsonRpcRequest),
    ).rejects.toThrow(
      'At path: method -- Expected a string, but received: undefined',
    );
  });

  it('calls `keyring_getAccount`', async () => {
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: '7c507ff0-365f-4de0-8cd5-eb83c30ebda4',
      method: 'keyring_getAccount',
      params: { id: '4f983fa2-4f53-4c63-a7c2-f9a5ed750041' },
    };

    keyring.getAccount.mockResolvedValue('GetAccount result');
    const result = await handleKeyringRequest(keyring, request);

    expect(keyring.getAccount).toHaveBeenCalledWith(
      '4f983fa2-4f53-4c63-a7c2-f9a5ed750041',
    );
    expect(result).toBe('GetAccount result');
  });

  it('fails to call `keyring_getAccount` without providing an account ID', async () => {
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: '7c507ff0-365f-4de0-8cd5-eb83c30ebda4',
      method: 'keyring_getAccount',
      params: {}, // Missing account ID.
    };

    await expect(handleKeyringRequest(keyring, request)).rejects.toThrow(
      'At path: params.id -- Expected a value of type `UuidV4`, but received: `undefined`',
    );
  });

  it('fails to call `keyring_getAccount` when the `params` is not provided', async () => {
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: '7c507ff0-365f-4de0-8cd5-eb83c30ebda4',
      method: 'keyring_getAccount',
    };

    await expect(handleKeyringRequest(keyring, request)).rejects.toThrow(
      'At path: params -- Expected an object, but received: undefined',
    );
  });

  it('calls `keyring_createAccount`', async () => {
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: '7c507ff0-365f-4de0-8cd5-eb83c30ebda4',
      method: 'keyring_createAccount',
      params: { options: {} },
    };

    keyring.createAccount.mockResolvedValue('CreateAccount result');
    const result = await handleKeyringRequest(keyring, request);

    expect(keyring.createAccount).toHaveBeenCalledWith({});
    expect(result).toBe('CreateAccount result');
  });

  it('calls `keyring_filterAccountChains`', async () => {
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: '7c507ff0-365f-4de0-8cd5-eb83c30ebda4',
      method: 'keyring_filterAccountChains',
      params: {
        id: '4f983fa2-4f53-4c63-a7c2-f9a5ed750041',
        chains: ['chain1', 'chain2'],
      },
    };

    keyring.filterAccountChains.mockResolvedValue(
      'FilterSupportedChains result',
    );
    const result = await handleKeyringRequest(keyring, request);

    expect(keyring.filterAccountChains).toHaveBeenCalledWith(
      '4f983fa2-4f53-4c63-a7c2-f9a5ed750041',
      ['chain1', 'chain2'],
    );
    expect(result).toBe('FilterSupportedChains result');
  });

  it('calls `keyring_updateAccount`', async () => {
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: '7c507ff0-365f-4de0-8cd5-eb83c30ebda4',
      method: 'keyring_updateAccount',
      params: {
        account: {
          id: '4f983fa2-4f53-4c63-a7c2-f9a5ed750041',
          address: '0x0',
          options: {},
          methods: [],
          type: 'eip155:eoa',
        },
      },
    };

    keyring.updateAccount.mockResolvedValue('UpdateAccount result');
    const result = await handleKeyringRequest(keyring, request);

    expect(keyring.updateAccount).toHaveBeenCalledWith({
      id: '4f983fa2-4f53-4c63-a7c2-f9a5ed750041',
      address: '0x0',
      options: {},
      methods: [],
      type: 'eip155:eoa',
    });
    expect(result).toBe('UpdateAccount result');
  });

  it('calls `keyring_deleteAccount`', async () => {
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: '7c507ff0-365f-4de0-8cd5-eb83c30ebda4',
      method: 'keyring_deleteAccount',
      params: { id: '4f983fa2-4f53-4c63-a7c2-f9a5ed750041' },
    };

    keyring.deleteAccount.mockResolvedValue('DeleteAccount result');
    const result = await handleKeyringRequest(keyring, request);

    expect(keyring.deleteAccount).toHaveBeenCalledWith(
      '4f983fa2-4f53-4c63-a7c2-f9a5ed750041',
    );
    expect(result).toBe('DeleteAccount result');
  });

  it('calls `keyring_exportAccount`', async () => {
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: '7c507ff0-365f-4de0-8cd5-eb83c30ebda4',
      method: 'keyring_exportAccount',
      params: { id: '4f983fa2-4f53-4c63-a7c2-f9a5ed750041' },
    };
    const expected = {
      privateKey: '0x0123',
    };

    keyring.exportAccount.mockResolvedValue(expected);
    const result = await handleKeyringRequest(keyring, request);

    expect(keyring.exportAccount).toHaveBeenCalledWith(
      '4f983fa2-4f53-4c63-a7c2-f9a5ed750041',
    );
    expect(result).toStrictEqual(expected);
  });

  it('throws an error if `keyring_exportAccount` is not implemented', async () => {
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: '7c507ff0-365f-4de0-8cd5-eb83c30ebda4',
      method: 'keyring_exportAccount',
      params: { id: '4f983fa2-4f53-4c63-a7c2-f9a5ed750041' },
    };

    const partialKeyring: Keyring = {
      ...keyring,
    };
    delete partialKeyring.exportAccount;

    await expect(handleKeyringRequest(partialKeyring, request)).rejects.toThrow(
      'Method not supported: keyring_exportAccount',
    );
  });

  it('calls `keyring_listRequests`', async () => {
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: '7c507ff0-365f-4de0-8cd5-eb83c30ebda4',
      method: 'keyring_listRequests',
    };

    keyring.listRequests.mockResolvedValue('ListRequests result');
    const result = await handleKeyringRequest(keyring, request);

    expect(keyring.listRequests).toHaveBeenCalled();
    expect(result).toBe('ListRequests result');
  });

  it('throws an error if `keyring_listRequests` is not implemented', async () => {
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: '7c507ff0-365f-4de0-8cd5-eb83c30ebda4',
      method: 'keyring_listRequests',
    };

    const partialKeyring: Keyring = {
      ...keyring,
    };
    delete partialKeyring.listRequests;

    await expect(handleKeyringRequest(partialKeyring, request)).rejects.toThrow(
      'Method not supported: keyring_listRequests',
    );
  });

  it('calls `keyring_getRequest`', async () => {
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: '7c507ff0-365f-4de0-8cd5-eb83c30ebda4',
      method: 'keyring_getRequest',
      params: { id: '523713e3-f751-4a20-8788-c7a0ea92bef5' },
    };

    keyring.getRequest.mockResolvedValue('GetRequest result');
    const result = await handleKeyringRequest(keyring, request);

    expect(keyring.getRequest).toHaveBeenCalledWith(
      '523713e3-f751-4a20-8788-c7a0ea92bef5',
    );
    expect(result).toBe('GetRequest result');
  });

  it('throws an error if `keyring_getRequest` is not implemented', async () => {
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: '7c507ff0-365f-4de0-8cd5-eb83c30ebda4',
      method: 'keyring_getRequest',
      params: { id: '0cea396f-54e4-4fa9-bf33-8419da668add' },
    };

    const partialKeyring: Keyring = {
      ...keyring,
    };
    delete partialKeyring.getRequest;

    await expect(handleKeyringRequest(partialKeyring, request)).rejects.toThrow(
      'Method not supported: keyring_getRequest',
    );
  });

  it('calls `keyring_submitRequest`', async () => {
    const dappRequest = {
      id: 'c555de37-cf4b-4ff2-8273-39db7fb58f1c',
      scope: 'eip155:1',
      account: '4abdd17e-8b0f-4d06-a017-947a64823b3d',
      request: {
        method: 'eth_method',
        params: [1, 2, 3],
      },
    };

    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: '7c507ff0-365f-4de0-8cd5-eb83c30ebda4',
      method: 'keyring_submitRequest',
      params: dappRequest,
    };

    keyring.submitRequest.mockResolvedValue('SubmitRequest result');
    const result = await handleKeyringRequest(keyring, request);

    expect(keyring.submitRequest).toHaveBeenCalledWith(dappRequest);
    expect(result).toBe('SubmitRequest result');
  });

  it('calls `keyring_approveRequest`', async () => {
    const payload = {
      id: '59db4ff8-8eb3-4a75-8ef3-b80aff8fa780',
      data: { signature: '0x0123' },
    };
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: '7c507ff0-365f-4de0-8cd5-eb83c30ebda4',
      method: 'keyring_approveRequest',
      params: payload,
    };

    keyring.approveRequest.mockResolvedValue('ApproveRequest result');
    const result = await handleKeyringRequest(keyring, request);

    expect(keyring.approveRequest).toHaveBeenCalledWith(
      payload.id,
      payload.data,
    );
    expect(result).toBe('ApproveRequest result');
  });

  it('throws an error if `keyring_approveRequest` is not implemented', async () => {
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: '7c507ff0-365f-4de0-8cd5-eb83c30ebda4',
      method: 'keyring_approveRequest',
      params: { id: 'request_id', data: {} },
    };

    const partialKeyring: Keyring = {
      ...keyring,
    };
    delete partialKeyring.approveRequest;

    await expect(handleKeyringRequest(partialKeyring, request)).rejects.toThrow(
      'Method not supported: keyring_approveRequest',
    );
  });

  it('calls a method with a non-UUIDv4 string as the request ID', async () => {
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: 'request-id',
      method: 'keyring_listRequests',
    };

    keyring.listRequests.mockResolvedValue([]);
    expect(await handleKeyringRequest(keyring, request)).toStrictEqual([]);
  });

  it('calls the keyring with a number as the request ID', async () => {
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'keyring_listRequests',
    };

    keyring.listRequests.mockResolvedValue([]);
    expect(await handleKeyringRequest(keyring, request)).toStrictEqual([]);
  });

  it('calls the keyring with null as the request ID', async () => {
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: null,
      method: 'keyring_listRequests',
    };

    keyring.listRequests.mockResolvedValue([]);
    expect(await handleKeyringRequest(keyring, request)).toStrictEqual([]);
  });

  it('fails to call the keyring with a boolean as tne request ID', async () => {
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: true as any,
      method: 'keyring_listRequests',
    };

    keyring.listRequests.mockResolvedValue([]);
    await expect(handleKeyringRequest(keyring, request)).rejects.toThrow(
      'At path: id -- Expected the value to satisfy a union of `string | number | literal`, but received: true',
    );
  });

  it('calls `keyring_rejectRequest`', async () => {
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: '7c507ff0-365f-4de0-8cd5-eb83c30ebda4',
      method: 'keyring_rejectRequest',
      params: { id: 'e5efe6d2-b703-4740-baf5-eb0fc47ba4ad' },
    };

    keyring.rejectRequest.mockResolvedValue('RejectRequest result');
    const result = await handleKeyringRequest(keyring, request);

    expect(keyring.rejectRequest).toHaveBeenCalledWith(
      'e5efe6d2-b703-4740-baf5-eb0fc47ba4ad',
    );
    expect(result).toBe('RejectRequest result');
  });

  it('throws an error if `keyring_rejectRequest` is not implemented', async () => {
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: '7c507ff0-365f-4de0-8cd5-eb83c30ebda4',
      method: 'keyring_rejectRequest',
      params: { id: 'request_id' },
    };

    const partialKeyring: Keyring = {
      ...keyring,
    };
    delete partialKeyring.rejectRequest;

    await expect(handleKeyringRequest(partialKeyring, request)).rejects.toThrow(
      'Method not supported: keyring_rejectRequest',
    );
  });

  it('throws an error if an unknown method is called', async () => {
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: '7c507ff0-365f-4de0-8cd5-eb83c30ebda4',
      method: 'unknown_method',
    };

    await expect(handleKeyringRequest(keyring, request)).rejects.toThrow(
      'Method not supported: unknown_method',
    );
  });

  it('throws an "unknown error" if the error message is not a string', async () => {
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: '80c25a6b-4a76-44f4-88c5-7b3b76f72a74',
      method: 'keyring_listAccounts',
    };

    const error = new Error();
    error.message = 1 as unknown as string;
    keyring.listAccounts.mockRejectedValue(error);
    await expect(handleKeyringRequest(keyring, request)).rejects.toThrow(
      'An unknown error occurred while handling the keyring request',
    );
  });

  describe('getAccountBalances', () => {
    it('successfully calls `keyring_getAccountBalances`', async () => {
      const request: GetAccountBalancesRequest = {
        jsonrpc: '2.0',
        id: '2ac49e1a-4f5b-4dad-889c-73f3ca34fd3b',
        method: 'keyring_getAccountBalances',
        params: {
          id: '987910cc-2d23-48c2-a362-c37f0715793e',
          assets: ['bip122:000000000019d6689c085ae165831e93/slip44:0'],
        },
      };

      await handleKeyringRequest(keyring, request);
      expect(keyring.getAccountBalances).toHaveBeenCalledWith(
        request.params.id,
        request.params.assets,
      );
    });

    it('fails because the account ID is not provided', async () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: '2ac49e1a-4f5b-4dad-889c-73f3ca34fd3b',
        method: 'keyring_getAccountBalances',
        params: {
          assets: ['bip122:000000000019d6689c085ae165831e93/slip44:0'],
        },
      };

      await expect(handleKeyringRequest(keyring, request)).rejects.toThrow(
        'At path: params.id -- Expected a value of type `UuidV4`, but received: `undefined`',
      );
    });

    it('fails because the assets are not provided', async () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: '2ac49e1a-4f5b-4dad-889c-73f3ca34fd3b',
        method: 'keyring_getAccountBalances',
        params: {
          id: '987910cc-2d23-48c2-a362-c37f0715793e',
        },
      };

      await expect(handleKeyringRequest(keyring, request)).rejects.toThrow(
        'At path: params.assets -- Expected an array value, but received: undefined',
      );
    });

    it('fails because the assets are not strings', async () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: '2ac49e1a-4f5b-4dad-889c-73f3ca34fd3b',
        method: 'keyring_getAccountBalances',
        params: {
          id: '987910cc-2d23-48c2-a362-c37f0715793e',
          assets: [1, 2, 3],
        },
      };

      await expect(handleKeyringRequest(keyring, request)).rejects.toThrow(
        'At path: params.assets.0 -- Expected a value of type `CaipAssetType`, but received: `1`',
      );
    });

    it('fails because `keyring_getAccountBalances` is not implemented', async () => {
      const request: GetAccountBalancesRequest = {
        jsonrpc: '2.0',
        id: '2ac49e1a-4f5b-4dad-889c-73f3ca34fd3b',
        method: 'keyring_getAccountBalances',
        params: {
          id: '987910cc-2d23-48c2-a362-c37f0715793e',
          assets: ['bip122:000000000019d6689c085ae165831e93/slip44:0'],
        },
      };

      const { getAccountBalances, ...partialKeyring } = keyring;

      await expect(
        handleKeyringRequest(partialKeyring, request),
      ).rejects.toThrow('Method not supported: keyring_getAccountBalances');
    });
  });
});

describe('isKeyringRpcMethod', () => {
  it.each([
    [`${KeyringRpcMethod.ListAccounts}`, true],
    [`${KeyringRpcMethod.GetAccount}`, true],
    [`${KeyringRpcMethod.CreateAccount}`, true],
    [`${KeyringRpcMethod.FilterAccountChains}`, true],
    [`${KeyringRpcMethod.UpdateAccount}`, true],
    [`${KeyringRpcMethod.DeleteAccount}`, true],
    [`${KeyringRpcMethod.ListRequests}`, true],
    [`${KeyringRpcMethod.GetAccount}`, true],
    [`${KeyringRpcMethod.ApproveRequest}`, true],
    [`${KeyringRpcMethod.RejectRequest}`, true],
    [`keyring_invalid`, false],
  ])(`%s should be %s`, (method, expected) => {
    expect(isKeyringRpcMethod(method)).toBe(expected);
  });
});
