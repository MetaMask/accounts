import { KeyringVersion } from '@metamask/keyring-internal-api';
import { isValidSemVerVersion, type SemVerVersion } from '@metamask/utils';

import {
  getKeyringVersionFromPlatform,
  PLATFORM_VERSION_TO_KEYRING_VERSION,
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

describe('PLATFORM_VERSION_TO_KEYRING_VERSION', () => {
  it.each(PLATFORM_VERSION_TO_KEYRING_VERSION)(
    'is a valid semver version: %s',
    // `PLATFORM_VERSION_TO_KEYRING_VERSION` items are flattened by `it.each`, no need
    // to destructure the tuple here.
    (version) => {
      expect(isValidSemVerVersion(version)).toBe(true);
    },
  );
});
