import { KeyringRpcMethod, isKeyringRpcMethod } from './rpc';

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
