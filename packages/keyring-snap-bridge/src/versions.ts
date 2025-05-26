import { KeyringVersion } from '@metamask/keyring-internal-api';
import type { SemVerVersion } from '@metamask/utils';

/**
 * Mapping of the Snap platform version to its `KeyringVersion` equivalent.
 *
 * NOTE: We use an array here to preserve ordering of each versions.
 */
export const PLATFORM_VERSION_TO_KEYRING_VERSION = [
  // ! NOTE: This versions needs to be sorted in a descending order (highest platform version first).

  // Introduction of `KeyringRequest.origin`.
  ['7.0.0', KeyringVersion.V2],
] as const;

/**
 * Gets keyring's version for a given Snap.
 *
 * @param isSupportedVersion - Predicate to check if the version is supported.
 * @returns The Snap's keyring version.
 */
export function getKeyringVersionFromPlatform(
  isSupportedVersion: (version: SemVerVersion) => boolean,
): KeyringVersion {
  for (const [
    platformVersion,
    keyringVersion,
  ] of PLATFORM_VERSION_TO_KEYRING_VERSION) {
    // NOTE: We are type-casting, but we have a unit tests that make sure all
    // versions are following the semver spec.
    if (isSupportedVersion(platformVersion as SemVerVersion)) {
      return keyringVersion;
    }
  }
  return KeyringVersion.V1;
}
