import { SnapKeyringRpcMethod, isSnapKeyringRpcMethod } from '.';

describe('isSnapKeyringRpcMethod', () => {
  it.each(Object.values(SnapKeyringRpcMethod))(
    'returns true for: "%s"',
    (method) => {
      expect(isSnapKeyringRpcMethod(method)).toBe(true);
    },
  );

  it('returns false for unknown method', () => {
    expect(isSnapKeyringRpcMethod('keyring_unknownMethod')).toBe(false);
  });
});
