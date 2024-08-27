import { is } from '@metamask/superstruct';

import { JsonRpcRequestStruct } from './JsonRpcRequest';

describe('JsonRpcRequestStruct', () => {
  it('should be a valid JsonRpcRequest with a numerical ID', () => {
    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'my_method',
      params: [1, 2, 3],
    };

    expect(is(request, JsonRpcRequestStruct)).toBe(true);
  });

  it('should be a valid JsonRpcRequest with a string ID', () => {
    const request = {
      jsonrpc: '2.0',
      id: 'request_id',
      method: 'my_method',
      params: [1, 2, 3],
    };

    expect(is(request, JsonRpcRequestStruct)).toBe(true);
  });

  it('should be a valid JsonRpcRequest with a null ID', () => {
    const request = {
      jsonrpc: '2.0',
      id: null,
      method: 'my_method',
      params: [1, 2, 3],
    };

    expect(is(request, JsonRpcRequestStruct)).toBe(true);
  });

  it('should be a valid JsonRpcRequest without params', () => {
    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'my_method',
    };

    expect(is(request, JsonRpcRequestStruct)).toBe(true);
  });

  it('should not be a valid JsonRpcRequest if params is undefined', () => {
    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'my_method',
      params: undefined,
    };

    expect(is(request, JsonRpcRequestStruct)).toBe(false);
  });
});
