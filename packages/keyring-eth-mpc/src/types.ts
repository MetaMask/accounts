import type { EthKeyring } from '@metamask/keyring-utils';

/** The MPC keyring setup modes. */
export const MpcKeyringSetupMode = {
  Create: 'create',
  Import: 'import',
} as const;
export type MpcKeyringSetupMode =
  `${(typeof MpcKeyringSetupMode)[keyof typeof MpcKeyringSetupMode]}`;

/**
 * The MPC keyring contract.
 */
export type MpcKeyring = EthKeyring & {
  /**
   * Run key generation or import.
   *
   * @param mode - The MPC setup mode.
   */
  init(mode?: MpcKeyringSetupMode): Promise<void>;

  /**
   * Rotate the MPC key shares.
   */
  rotateKeyShares(): Promise<void>;

  /**
   * Check the MPC key share state.
   *
   * @returns Whether the key share is up to date.
   */
  checkKeyShare(): Promise<boolean>;

  /**
   * Synchronize the MPC key share.
   */
  syncKeyShare(): Promise<void>;
};
