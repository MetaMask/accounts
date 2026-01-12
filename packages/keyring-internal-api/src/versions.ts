export enum KeyringInternalFeature {
  /**
   * Introduction of `KeyringRequest.origin`.
   *
   * Snap will now receive the `origin` as part of a `KeyringRequest` when `submitRequest` is invoked.
   * We also expect Snaps to display this `origin` in their confirmation screens (if any).
   */
  UseOrigin = 'use-origin',
}

/**
 * Type representing a set of keyring internal features.
 */
export type KeyringInternalFeatures = Set<KeyringInternalFeature>;
