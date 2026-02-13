import type { ThresholdKey } from '@metamask/mfa-wallet-interface';
import type { MfaNetworkIdentity } from '@metamask/mfa-wallet-network';
import type { WasmLib as Dkls19WasmLib } from '@metamask/tss-dkls19-lib';
import type { Json } from '@metamask/utils';

export type MPCKeyringOpts = {
  getRandomBytes: (size: number) => Uint8Array;
  dkls19Lib: Dkls19WasmLib;
  cloudURL: string;
  relayerURL: string;
  getTransportToken?: () => Promise<string>;
  getVerifierToken: (verifierId: string) => Promise<string>;
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

export type MPCKeyringSerializer = {
  thresholdKey: JsonSerializer<ThresholdKey>;
  networkIdentity: JsonSerializer<MfaNetworkIdentity>;
};
