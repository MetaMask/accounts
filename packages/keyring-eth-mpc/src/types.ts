import type { WasmLib as Dkls19WasmLib } from '@metamask/tss-dkls19-lib';

export type MPCKeyringOpts = {
  getRandomBytes: (size: number) => Uint8Array;
  dkls19Lib: Dkls19WasmLib;
};

export type ThresholdKeyId = string;
