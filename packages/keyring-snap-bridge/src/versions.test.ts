import { getKeyringVersionFromPlatform, KeyringVersion } from './versions';

describe('getKeyringVersionFromPlatform', () => {
  it('gets the keyring version v1 as default', () => {
    const isSupportedVersion = (): boolean => false;

    expect(getKeyringVersionFromPlatform(isSupportedVersion)).toBe(
      KeyringVersion.V1,
    );
  });

  it('gets the keyring version v2 if the platform version is 7.0.0', () => {
    const isSupportedVersion = (version: string): boolean => {
      return version === '7.0.0';
    };

    expect(getKeyringVersionFromPlatform(isSupportedVersion)).toBe(
      KeyringVersion.V2,
    );
  });
});
