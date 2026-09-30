import type { EthKeyring } from '@metamask/keyring-utils';

export type MpcKeyringSetupParams = {
  mode: 'create' | 'import';
};

/**
 * The V1 MPC keyring contract.
 *
 * The full implementation is not shipped yet: clients provide their own
 * implementation, which the V2 `MpcKeyring` (from
 * `@metamask/eth-mpc-keyring/v2`) adapts to the unified V2 `Keyring`
 * interface.
 */
export type MpcKeyringV1 = EthKeyring & {
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
