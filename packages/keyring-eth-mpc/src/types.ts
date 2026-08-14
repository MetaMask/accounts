import type { CL24ThresholdKey } from '@metamask/mfa-wallet-cl24-lib';
import type { AccessStructure } from '@metamask/mfa-wallet-interface';
import type { MfaNetworkIdentity } from '@metamask/mfa-wallet-network';
import type { Dkls19Lib } from '@metamask/mpc-libs-interface';
import type { Json } from '@metamask/utils';

export type MPCKeyringOpts = {
  getRandomBytes: (size: number) => Uint8Array;
  dkls19Lib: Dkls19Lib;
  cloudURL: string;
  relayerURL: string;
  getTransportToken?: () => Promise<string>;
  getVerifierToken: (profileId: string) => Promise<string>;
  webSocket?: unknown;
};

export type ThresholdKeyId = string;

export type CustodianType = 'user' | 'cloud';

export type Custodian = {
  partyId: string;
  type: CustodianType;
};

type JsonSerializer<Value> = {
  toJson: (value: Value) => Json;
  fromJson: (value: Json) => Value;
};

export type MPCKeyringState = {
  networkIdentity: MfaNetworkIdentity;
  keyShare: CL24ThresholdKey;
  keyId: ThresholdKeyId;
  dkls19Setup: Uint8Array;
  custodians: Custodian[];
  profileId: string;
};

export type MPCKeyringSetupParams =
  | {
      profileId: string;
      mode?: 'create';
    }
  | {
      profileId: string;
      mode: 'join';
      joinData: string;
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
  accessStructure: JsonSerializer<AccessStructure>;
  networkIdentity: JsonSerializer<MfaNetworkIdentity>;
};
