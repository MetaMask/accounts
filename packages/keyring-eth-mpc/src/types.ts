import type { CL24ThresholdKey } from '@metamask/mfa-wallet-cl24-lib';
import type { Dkls23TssLib } from '@metamask/mfa-wallet-dkls23-lib';
import type { MfaNetworkIdentity } from '@metamask/mfa-wallet-network';
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
  netCreds: MfaNetworkIdentity;
  serverNetId: string;
  tssSetup: Uint8Array | null;
};

export type MpcKeyringSetupParams = {
  mode: 'create' | 'import';
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
  networkIdentity: JsonSerializer<MfaNetworkIdentity>;
};
