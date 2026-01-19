import type { ThresholdKey } from '@metamask/mfa-wallet-interface';
import type { WasmLib as Dkls19WasmLib } from '@metamask/tss-dkls19-lib';
import type { Json } from '@metamask/utils';

import type { NetworkIdentity, NetworkManager } from './network';

export type MPCKeyringOpts = {
  getRandomBytes: (size: number) => Uint8Array;
  dkls19Lib: Dkls19WasmLib;
  cloudURL: string;
  networkManager: NetworkManager;
  serializer: MPCKeyringSerializer;
  initRole: InitRole;
};

export type ThresholdKeyId = string;

export type MPCKeyringSerializer = {
  networkIdentityToJSON: (identity: NetworkIdentity) => Json;
  networkIdentityFromJSON: (identity: Json) => NetworkIdentity;
  thresholdKeyToJSON: (key: ThresholdKey) => Json;
  thresholdKeyFromJSON: (key: Json) => ThresholdKey;
};

export type InitRole = 'initiator' | 'responder';
