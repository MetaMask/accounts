import { KeyringSnapRpcMethod, isKeyringSnapRpcMethod } from '.';

describe('isKeyringSnapRpcMethod', () => {
  it.each(Object.values(KeyringSnapRpcMethod))(
    'returns true for: "%s"',
    (method) => {
      expect(isKeyringSnapRpcMethod(method)).toBe(true);
    },
  );

  it('returns false for unknown method', () => {
    expect(isKeyringSnapRpcMethod('keyring_unknownMethod')).toBe(false);
  });
});
