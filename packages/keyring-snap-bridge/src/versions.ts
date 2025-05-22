import type { SemVerVersion } from '@metamask/utils';

export enum KeyringVersion {
  /** Default. */
  V1 = 'v1',

  /**
   * Introduction of `KeyringRequest.origin`.
   *
   * Snap will now receive the `origin` as part of a `KeyringRquest` when `submitRequest` is invoked.
   * We also expect Snaps to display this `origin` in their confirmation screens (if any).
   */
  V2 = 'v2',
}

/**
 * Mapping of the Snap platform version to its `KeyringVersion` equivalent.
 *
 * NOTE: This versions needs to be sorted in a descending order (highest platform version first).
 */
const PLATFORM_VERSION_TO_KEYRING_VERSION = {
  // Introduction of `KeyringRequest.origin`.
  '7.0.0': KeyringVersion.V2,
} as const;

/**
 * List of platform version that are mapped to a `KeyringVersion` equivalent.
 */
export const PLATFORM_VERSIONS = Object.keys(
  PLATFORM_VERSION_TO_KEYRING_VERSION,
) as (keyof typeof PLATFORM_VERSION_TO_KEYRING_VERSION)[];

/**
 * Gets keyring's version for a given Snap.
 *
 * @param isSupportedVersion - Predicate to check if the version is supported.
 * @returns The Snap's keyring version.
 */
export function getKeyringVersionFromPlatform(
  isSupportedVersion: (version: SemVerVersion) => boolean,
): KeyringVersion {
  for (const version of PLATFORM_VERSIONS) {
    // NOTE: We are type-casting, but we have a unit tests that make sure all
    // versions are following the semver spec.
    if (isSupportedVersion(version as SemVerVersion)) {
      return PLATFORM_VERSION_TO_KEYRING_VERSION[version];
    }
  }
  return KeyringVersion.V1;
}
