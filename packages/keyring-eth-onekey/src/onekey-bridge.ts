import type {
  Params,
  EVMSignedTx,
  EVMSignTransactionParams,
  EVMSignMessageParams,
  EVMSignTypedDataParams,
  EVMGetPublicKeyParams,
} from '@onekeyfe/hd-core';
import type { EthereumMessageSignature } from '@onekeyfe/hd-transport';

type Unsuccessful = {
  success: false;
  payload: {
    error: string;
    code?: string | number;
  };
};
type Success<TData> = {
  success: true;
  payload: TData;
};
type Response<TData> = Promise<Success<TData> | Unsuccessful>;

/**
 * Hardware UI event payload
 */
export type HardwareUIEvent = {
  error: string;
  code?: string | number;
};

export type OneKeyBridge = {
  model?: string;

  init(): Promise<void>;

  dispose(): Promise<void>;

  updateTransportMethod(transportType: string): Promise<void>;

  // OneKeySdk.getPublicKey has two overloads
  // It is not possible to extract them from the library using utility types
  getPublicKey(
    params: Params<EVMGetPublicKeyParams>,
  ): Response<{ publicKey: string; chainCode: string }>;

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
