import type {
  ConnectDynamicSettings,
  EthereumSignedTx,
  Manifest,
  PROTO,
  Response,
  Params,
  EthereumSignMessage,
  EthereumSignTransaction,
  EthereumSignTypedDataTypes,
  EthereumSignTypedData,
} from '@trezor/connect-web' with { 'resolution-mode': 'import' };

// TrezorConnect.ethereumGetPublicKey has two overloads
// It is not possible to extract them from the library using utility types
export type ExtendedPublicKey = { publicKey: string; chainCode: string };

export interface TrezorBridge {
  model?: string;

  init(
    settings: {
      manifest: Manifest;
    } & ConnectDynamicSettings,
  ): Promise<void>;

  dispose(): Promise<void>;

  ethereumGetPublicKey(params: { path: string }): Response<ExtendedPublicKey>;

  ethereumSignTransaction(
    params: Params<EthereumSignTransaction>,
  ): Response<EthereumSignedTx>;

  ethereumSignMessage(
    params: Params<EthereumSignMessage>,
  ): Response<PROTO.MessageSignature>;

  ethereumSignTypedData<T extends EthereumSignTypedDataTypes>(
    params: Params<EthereumSignTypedData<T>>,
  ): Response<PROTO.EthereumTypedDataSignature>;
}
