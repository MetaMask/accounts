import { is } from '@metamask/superstruct';

import {
  KeyringRpcMethod,
  isKeyringRpcMethod,
  CreateAccountsRequestStruct,
} from '.';

describe('isKeyringRpcMethod', () => {
  it.each(Object.values(KeyringRpcMethod))(
    'returns true for: "%s"',
    (method) => {
      expect(isKeyringRpcMethod(method)).toBe(true);
    },
  );

  it('returns false for unknown method', () => {
    expect(isKeyringRpcMethod('keyring_unknownMethod')).toBe(false);
  });
});

describe('CreateAccountsRequestStruct', () => {
  const options = {
    type: 'bip44:derive-index',
    entropySource: 'mock-entropy-source',
    groupIndex: 0,
  };

  it('accepts params wrapped in `options`', () => {
    const request = {
      jsonrpc: '2.0',
      id: '1',
      method: KeyringRpcMethod.CreateAccounts,
      params: { options },
    };
    expect(is(request, CreateAccountsRequestStruct)).toBe(true);
  });

  it('rejects unwrapped (flat) params', () => {
    const request = {
      jsonrpc: '2.0',
      id: '1',
      method: KeyringRpcMethod.CreateAccounts,
      params: options,
    };
    expect(is(request, CreateAccountsRequestStruct)).toBe(false);
  });
});
