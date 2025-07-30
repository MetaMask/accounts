/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/naming-convention */
import type {
  ConnectSettings,
  Params,
  EVMSignedTx,
  EVMSignTransactionParams,
  EVMSignMessageParams,
  EVMSignTypedDataParams,
  EVMGetPublicKeyParams,
  Features,
} from '@onekeyfe/hd-core';
import type { EthereumMessageSignature } from '@onekeyfe/hd-transport';

type Unsuccessful = {
  success: false;
  payload: {
    error: string;
    code?: string | number;
  };
};
type Success<T> = {
  success: true;
  payload: T;
};
type Response<T> = Promise<Success<T> | Unsuccessful>;

export type OneKeyBridge = {
  model?: string;

  on(event: string, callback: (event: any) => void): void;

  off(event: string): void;

  init(settings: Partial<ConnectSettings>): Promise<void>;

  dispose(): Promise<void>;

  updateTransportMethod(transportType: string): Promise<void>;

  getDeviceFeatures(): Response<Features>;

  // OneKeySdk.getPublicKey has two overloads
  // It is not possible to extract them from the library using utility types
  getPublicKey(
    params: Params<EVMGetPublicKeyParams>,
  ): Response<{ publicKey: string; chainCode: string }>;

  batchGetPublicKey(
    params: Params<any> & { bundle: EVMGetPublicKeyParams[] },
  ): Response<{ pub: string }[]>;

  getPassphraseState(): Response<string | undefined>;

  ethereumSignTransaction(
    params: Params<EVMSignTransactionParams>,
  ): Response<EVMSignedTx>;

  ethereumSignMessage(
    params: Params<EVMSignMessageParams>,
  ): Response<EthereumMessageSignature>;

  ethereumSignTypedData(
    params: Params<EVMSignTypedDataParams>,
  ): Response<EthereumMessageSignature>;
};
