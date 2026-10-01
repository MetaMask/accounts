import type { EthKeyring } from '@metamask/keyring-utils';

export type MpcKeyringSetupParams = {
  mode: 'create' | 'import';
};

/**
 * The MPC keyring contract.
 */
export type MpcKeyring = EthKeyring & {
  /**
   * Run key generation or import.
   *
   * @param mode - The MPC setup mode.
   */
  init(mode?: MpcKeyringSetupParams['mode']): Promise<void>;

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
