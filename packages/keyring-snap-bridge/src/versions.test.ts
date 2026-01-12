import { KeyringInternalFeature } from '@metamask/keyring-internal-api';
import { isValidSemVerVersion, type SemVerVersion } from '@metamask/utils';

import {
  getKeyringFeaturesFromPlatform,
  PLATFORM_VERSION_TO_KEYRING_FEATURES,
} from './versions';

describe('getKeyringFeaturesFromPlatform', () => {
  it('gets an empty feature set as default', () => {
    const isSupportedVersion = (): boolean => false;

    expect(getKeyringFeaturesFromPlatform(isSupportedVersion)).toStrictEqual(
      new Set(),
    );
  });

  it('gets the UseOrigin feature if the platform version is 7.0.0', () => {
    const isSupportedVersion = (version: SemVerVersion): boolean => {
      return version === '7.0.0';
    };

    expect(getKeyringFeaturesFromPlatform(isSupportedVersion)).toStrictEqual(
      new Set([KeyringInternalFeature.UseOrigin]),
    );
  });
});

describe('PLATFORM_VERSION_TO_KEYRING_FEATURES', () => {
  it.each(PLATFORM_VERSION_TO_KEYRING_FEATURES)(
    'is a valid semver version: %s',
    // `PLATFORM_VERSION_TO_KEYRING_FEATURES` items are flattened by `it.each`, no need
    // to destructure the tuple here.
    (version) => {
      expect(isValidSemVerVersion(version)).toBe(true);
    },
  );
});
