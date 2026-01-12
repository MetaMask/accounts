import type { KeyringInternalFeatures } from '@metamask/keyring-internal-api';
import { KeyringInternalFeature } from '@metamask/keyring-internal-api';
import type { SemVerVersion } from '@metamask/utils';

/**
 * Mapping of the Snap platform version to its `KeyringInternalFeatures` equivalent.
 *
 * NOTE: We use an array here to preserve ordering of each versions.
 */
export const PLATFORM_VERSION_TO_KEYRING_FEATURES = [
  // ! NOTE: This versions needs to be sorted in a descending order (highest platform version first).

  // Introduction of `KeyringRequest.origin`.
  ['7.0.0', new Set([KeyringInternalFeature.UseOrigin])],
] as const;

/**
 * Gets keyring's features for a given Snap.
 *
 * @param isSupportedVersion - Predicate to check if the version is supported.
 * @returns The Snap's keyring features.
 */
export function getKeyringFeaturesFromPlatform(
  isSupportedVersion: (version: SemVerVersion) => boolean,
): KeyringInternalFeatures {
  for (const [
    platformVersion,
    keyringFeatures,
  ] of PLATFORM_VERSION_TO_KEYRING_FEATURES) {
    // NOTE: We are type-casting, but we have a unit tests that make sure all
    // versions are following the semver spec.
    if (isSupportedVersion(platformVersion as SemVerVersion)) {
      return keyringFeatures;
    }
  }
  return new Set();
}
