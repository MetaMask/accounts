import type { ThresholdKey } from '@metamask/mfa-wallet-interface';
import type { MfaNetworkIdentity } from '@metamask/mfa-wallet-network';
import type { WasmLib as Dkls19WasmLib } from '@metamask/tss-dkls19-lib';
import type { Json } from '@metamask/utils';

export type MPCKeyringOpts = {
  getRandomBytes: (size: number) => Uint8Array;
  dkls19Lib: Dkls19WasmLib;
  cloudURL: string;
  relayerURL: string;
  initRole: InitRole;
  getToken?: (partyId: string) => string;
  webSocket?: unknown;
};

export type ThresholdKeyId = string;

type JsonSerializer<Value> = {
  toJson: (value: Value) => Json;
  fromJson: (value: Json) => Value;
};

export type InitRole = 'initiator' | 'responder';

export type MPCKeyringSerializer = {
  thresholdKey: JsonSerializer<ThresholdKey>;
  networkIdentity: JsonSerializer<MfaNetworkIdentity>;
};
