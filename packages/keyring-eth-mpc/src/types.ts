import type { CL24ThresholdKey } from '@metamask/mfa-wallet-cl24-lib';
import type { Dkls23TssLib } from '@metamask/mfa-wallet-dkls23-lib';
import type { MfaNetworkIdentity } from '@metamask/mfa-wallet-network';
import type { Json } from '@metamask/utils';

export type ProfileTokenOpts = {
  '2fa'?: boolean;
  challenge?: Uint8Array;
};

export type Dkls23Lib = ConstructorParameters<typeof Dkls23TssLib>[0];

export type MPCKeyringOpts = {
  getRandomBytes: (size: number) => Uint8Array;
  dkls23Lib: Dkls23Lib;
  cloudURL: string;
  relayerURL: string;
  getTransportToken?: () => Promise<string>;
  getProfileToken: (opts?: ProfileTokenOpts) => Promise<string>;
  getBackupEncryptionKey: () => Promise<Uint8Array>;
  webSocket?: unknown;
};

export type MPCKeyringState = {
  keyShare: CL24ThresholdKey;
  netCreds: MfaNetworkIdentity;
  serverNetId: string;
  backupId: string;
  tssSetup: Uint8Array | null;
};

export type MPCKeyringSetupParams = {
  mode: 'create' | 'import';
};

type JsonSerializer<Value> = {
  toJson: (value: Value) => Json;
  fromJson: (value: Json) => Value;
};

export type MPCKeyringInitializedState = {
  status: 'initialized';
} & MPCKeyringState;

export type MPCKeyringUninitializedState = {
  status: 'uninitialized';
  setup: MPCKeyringSetupParams;
};

export type MPCKeyringStorageState =
  | MPCKeyringInitializedState
  | MPCKeyringUninitializedState;

export type MPCKeyringSerializer = {
  thresholdKey: JsonSerializer<CL24ThresholdKey>;
  networkIdentity: JsonSerializer<MfaNetworkIdentity>;
};
