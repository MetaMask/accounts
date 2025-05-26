export enum KeyringVersion {
  /** Default. */
  V1 = 'v1',

  /**
   * Introduction of `KeyringRequest.origin`.
   *
   * Snap will now receive the `origin` as part of a `KeyringRequest` when `submitRequest` is invoked.
   * We also expect Snaps to display this `origin` in their confirmation screens (if any).
   */
  V2 = 'v2',
}
