import type {
  ConnectDynamicSettings,
  EthereumSignedTx,
  PROTO,
  Response,
  Manifest,
  EthereumSignTransaction,
  Params,
  EthereumSignMessage,
  EthereumSignTypedDataTypes,
  EthereumSignTypedData,
  TrezorConnectPublicAPI,
} from '@trezor/connect-web' with { 'resolution-mode': 'import' };

import type { TrezorBridge, ExtendedPublicKey } from './trezor-bridge';

type TrezorConnect = TrezorConnectPublicAPI<ConnectDynamicSettings>;

/**
 * Loads the Trezor Connect singleton.
 *
 * `@trezor/connect-web` is ESM-only since v10, so it is loaded with a dynamic
 * `import()`, which works from both the CJS and the ESM build of this package.
 *
 * @returns The Trezor Connect singleton.
 */
async function loadTrezorConnect(): Promise<TrezorConnect> {
  const { default: TrezorConnect } = await import('@trezor/connect-web');
  return TrezorConnect;
}

export class TrezorConnectBridge implements TrezorBridge {
  // Connect 10 no longer emits device events to third-party integrations, so the
  // model cannot be detected here.
  model?: string;

  trezorConnectInitiated = false;

  async init(
    settings: {
      manifest: Manifest;
    } & ConnectDynamicSettings,
  ): Promise<void> {
    if (this.trezorConnectInitiated) {
      return;
    }

    const TrezorConnect = await loadTrezorConnect();
    await TrezorConnect.init(settings);
    this.trezorConnectInitiated = true;
  }

  async dispose(): Promise<void> {
    // Closes the connection to Trezor Suite (desktop WebSocket or web popup).
    const TrezorConnect = await loadTrezorConnect();
    TrezorConnect.dispose();
  }

  async ethereumGetPublicKey(params: {
    path: string;
  }): Response<ExtendedPublicKey> {
    const TrezorConnect = await loadTrezorConnect();
    return TrezorConnect.ethereumGetPublicKey(params);
  }

  async ethereumSignTransaction(
    params: Params<EthereumSignTransaction>,
  ): Response<EthereumSignedTx> {
    const TrezorConnect = await loadTrezorConnect();
    return TrezorConnect.ethereumSignTransaction(params);
  }

  async ethereumSignMessage(
    params: Params<EthereumSignMessage>,
  ): Response<PROTO.MessageSignature> {
    const TrezorConnect = await loadTrezorConnect();
    return TrezorConnect.ethereumSignMessage(params);
  }

  async ethereumSignTypedData<T extends EthereumSignTypedDataTypes>(
    params: Params<EthereumSignTypedData<T>>,
  ): Response<PROTO.EthereumTypedDataSignature> {
    const TrezorConnect = await loadTrezorConnect();
    return TrezorConnect.ethereumSignTypedData(params);
  }
}
