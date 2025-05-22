import { isValidSemVerVersion, type SemVerVersion } from '@metamask/utils';

import {
  getKeyringVersionFromPlatform,
  KeyringVersion,
  PLATFORM_VERSIONS,
} from './versions';

describe('getKeyringVersionFromPlatform', () => {
  it('gets the keyring version v1 as default', () => {
    const isSupportedVersion = (): boolean => false;

    expect(getKeyringVersionFromPlatform(isSupportedVersion)).toBe(
      KeyringVersion.V1,
    );
  });

  it('gets the keyring version v2 if the platform version is 7.0.0', () => {
    const isSupportedVersion = (version: SemVerVersion): boolean => {
      return version === '7.0.0';
    };

    expect(getKeyringVersionFromPlatform(isSupportedVersion)).toBe(
      KeyringVersion.V2,
    );
  });
});

describe('PLATFORM_VERSIONS', () => {
  it.each(PLATFORM_VERSIONS)(
    'is a valid semver version: %s',
    (version: string) => {
      expect(isValidSemVerVersion(version)).toBe(true);
    },
  );
});
