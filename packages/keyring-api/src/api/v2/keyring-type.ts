/**
 * Enum representing the different types of keyrings supported.
 */
export enum KeyringType {
  /**
   * Represents a hierarchical deterministic (HD) keyring.
   */
  Hd = 'hd',

  /**
   * Represents a keyring that directly stores private keys.
   */
  PrivateKey = 'private-key',

  /**
   * Represents a keyring that implements the QR protocol.
   *
   * See: https://eips.ethereum.org/EIPS/eip-4527
   */
  Qr = 'qr',

  /**
   * Represents keyring backed by a Snap.
   */
  Snap = 'snap',

  /**
   * Represents keyring backed by a Ledger hardware wallet.
   */
  Ledger = 'ledger',

  /**
   * Represents keyring backed by a Lattice hardware wallet.
   */
  Lattice = 'lattice',

  /**
   * Represents keyring backed by a Trezor hardware wallet.
   */
  Trezor = 'trezor',
}
