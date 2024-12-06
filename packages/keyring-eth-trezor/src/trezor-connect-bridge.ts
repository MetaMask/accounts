import TrezorConnect, { DEVICE_EVENT, DEVICE } from '@trezor/connect-web';
import type {
  EthereumSignedTx,
  PROTO,
  Response,
  Manifest,
  ConnectSettings,
  EthereumSignTransaction,
  Params,
  EthereumSignMessage,
  EthereumSignTypedDataTypes,
  EthereumSignTypedHash,
} from '@trezor/connect-web';

import type { TrezorBridge, TrezorConnectPublicKey } from './trezor-bridge';

export class TrezorConnectBridge implements TrezorBridge {
  model?: string;

  trezorConnectInitiated = false;

  async init(
    settings: {
      manifest: Manifest;
    } & Partial<ConnectSettings>,
  ): Promise<void> {
    TrezorConnect.on(DEVICE_EVENT, (event) => {
      if (event.type !== DEVICE.CONNECT) {
        return;
      }
      this.model = event.payload.features?.model;
    });

    if (this.trezorConnectInitiated) {
      return;
    }

    await TrezorConnect.init(settings);
    this.trezorConnectInitiated = true;
  }

  async dispose(): Promise<void> {
    // This removes the Trezor Connect iframe from the DOM
    // This method is not well documented, but the code it calls can be seen
    // here: https://github.com/trezor/connect/blob/dec4a56af8a65a6059fb5f63fa3c6690d2c37e00/src/js/iframe/builder.js#L181
    TrezorConnect.dispose();
    return Promise.resolve();
  }

  getPublicKey(params: {
    path: string;
    coin: string;
  }): Response<TrezorConnectPublicKey> {
    return TrezorConnect.getPublicKey(params);
  }

  ethereumSignTransaction(
    params: Params<EthereumSignTransaction>,
  ): Response<EthereumSignedTx> {
    return TrezorConnect.ethereumSignTransaction(params);
  }

  ethereumSignMessage(
    params: Params<EthereumSignMessage>,
  ): Response<PROTO.MessageSignature> {
    return TrezorConnect.ethereumSignMessage(params);
  }

  ethereumSignTypedData<T extends EthereumSignTypedDataTypes>(
    params: Params<EthereumSignTypedHash<T>>,
  ): Response<PROTO.EthereumTypedDataSignature> {
    return TrezorConnect.ethereumSignTypedData(params);
  }
}
