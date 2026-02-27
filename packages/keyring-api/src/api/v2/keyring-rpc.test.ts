import { KeyringRpcV2Method, isKeyringRpcV2Method } from './keyring-rpc';

describe('isKeyringRpcV2Method', () => {
  it.each(Object.values(KeyringRpcV2Method))(
    'returns true for: "%s"',
    (method) => {
      expect(isKeyringRpcV2Method(method)).toBe(true);
    },
  );

  it('returns false for unknown method', () => {
    expect(isKeyringRpcV2Method('keyring_unknownMethod')).toBe(false);
  });
});
