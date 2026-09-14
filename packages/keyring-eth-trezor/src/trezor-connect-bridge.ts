import * as TrezorConnectModule from '@trezor/connect-web';
import type {
  TrezorConnect as TrezorConnectType,
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

// @trezor/connect-web is CJS with __esModule:true; module.exports is { default: singleton, DEVICE_EVENT, ... }.
// In CJS (ts-jest), __importStar passes module.exports through as-is, so TrezorConnectModule
// IS module.exports and .default is the singleton.
// In native ESM, TrezorConnectModule.default = module.exports, so the singleton is one
// level deeper at .default.default. Detect ESM by checking if .default.default is truthy.
/* istanbul ignore next: only one branch is reachable per module system */
const rawTrezorModule = TrezorConnectModule as unknown as { default: unknown };
const rawTrezorDefault = rawTrezorModule.default as typeof TrezorConnectModule | undefined;
const trezorConnectExports = rawTrezorDefault?.default ? rawTrezorDefault : rawTrezorModule;
const TrezorConnect = trezorConnectExports.default as TrezorConnectType;
const { DEVICE_EVENT, DEVICE } = TrezorConnectModule;

import type { TrezorBridge, ExtendedPublicKey } from './trezor-bridge.js';

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
  }): Response<ExtendedPublicKey> {
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
