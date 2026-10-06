import type { EthKeyring } from '@metamask/keyring-utils';
import type { CL24ThresholdKey } from '@metamask/mfa-wallet-cl24';
import type { Dkls23TssLib } from '@metamask/mfa-wallet-dkls23';
import type { CentrifugeIdentity } from '@metamask/mfa-wallet-network';
import type { Json } from '@metamask/utils';

export type ProfileTokenOpts = {
  twoFactor?: boolean;
  challenge?: Uint8Array;
};

export type Dkls23Lib = ConstructorParameters<typeof Dkls23TssLib>[0];

export type MpcKeyringOpts = {
  getRandomBytes: (size: number) => Uint8Array;
  dkls23Lib: Dkls23Lib;
  cloudURL: string;
  relayerURL: string;
  getTransportToken?: () => Promise<string>;
  getProfileToken: (opts?: ProfileTokenOpts) => Promise<string>;
  getBackupEncryptionKey: () => Promise<Uint8Array>;
  webSocket?: unknown;
};

export type MpcKeyringState = {
  keyShare: CL24ThresholdKey;
  shareEpoch: number;
  netCreds: CentrifugeIdentity;
  serverNetId: string;
  tssSetup: Uint8Array | null;
};

/** The MPC keyring setup modes. */
export const MpcKeyringSetupMode = {
  Create: 'create',
  Import: 'import',
} as const;

export type MpcKeyringSetupMode =
  `${(typeof MpcKeyringSetupMode)[keyof typeof MpcKeyringSetupMode]}`;

export type MpcKeyringSetupParams = {
  mode: MpcKeyringSetupMode;
};

type JsonSerializer<Value> = {
  toJson: (value: Value) => Json;
  fromJson: (value: Json) => Value;
};

export type MpcKeyringInitializedState = {
  status: 'initialized';
} & MpcKeyringState;

export type MpcKeyringUninitializedState = {
  status: 'uninitialized';
  setup: MpcKeyringSetupParams;
};

export type MpcKeyringStorageState =
  | MpcKeyringInitializedState
  | MpcKeyringUninitializedState;

export type MpcKeyringSerializer = {
  thresholdKey: JsonSerializer<CL24ThresholdKey>;
  networkIdentity: JsonSerializer<CentrifugeIdentity>;
};

/**
 * The MPC keyring contract implemented by the V1 keyring class and consumed
 * by the V2 adapter.
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
