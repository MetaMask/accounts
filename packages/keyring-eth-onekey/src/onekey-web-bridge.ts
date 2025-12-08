import { UI_REQUEST, UI_RESPONSE } from '@onekeyfe/hd-core';
import type {
  ConnectSettings,
  CoreApi,
  EVMSignedTx,
  EVMSignMessageParams,
  EVMSignTransactionParams,
  EVMSignTypedDataParams,
  Params,
  UiEvent,
  Unsuccessful,
} from '@onekeyfe/hd-core';
import { HardwareErrorCode } from '@onekeyfe/hd-shared';
import type { EthereumMessageSignature } from '@onekeyfe/hd-transport';
import hardwareWebSdk from '@onekeyfe/hd-web-sdk';

import type { OneKeyBridge } from './onekey-bridge';

export type OneKeyIframeBridgeOptions = {
  bridgeUrl: string;
};

export class OneKeyWebBridge implements OneKeyBridge {
  isSDKInitialized = false;

  sdk: CoreApi | undefined = undefined;

  model?: string | undefined;

  #onUIEvent?: ((event: Unsuccessful['payload']) => void) | undefined;

  #handleBlockErrorEvent(payload: Unsuccessful): void {
    const { code } = payload.payload;
    const errorCodes: number[] = [
      HardwareErrorCode.WebDeviceNotFoundOrNeedsPermission,
      HardwareErrorCode.BridgeNotInstalled,
      HardwareErrorCode.NewFirmwareForceUpdate,
      HardwareErrorCode.NotAllowInBootloaderMode,
      HardwareErrorCode.CallMethodNeedUpgradeFirmware,
      HardwareErrorCode.DeviceCheckPassphraseStateError,
      HardwareErrorCode.DeviceCheckUnlockTypeError,
      HardwareErrorCode.SelectDevice,
    ];

    if (code && typeof code === 'number' && errorCodes.includes(code)) {
      this.#onUIEvent?.(payload.payload);
    }
  }

  async updateTransportMethod(
    transportType: ConnectSettings['env'],
  ): Promise<void> {
    if (!this.sdk) {
      return;
    }
    await this.sdk.switchTransport(transportType);
  }

  setUiEventCallback(callback: (event: Unsuccessful['payload']) => void): void {
    this.#onUIEvent = callback;
  }

  async init(): Promise<void> {
    if (this.isSDKInitialized) {
      return;
    }

    const settings: Partial<ConnectSettings> = {
      debug: false,
      fetchConfig: false,
      connectSrc: 'https://jssdk.onekey.so/1.1.17/',
      env: 'webusb',
    };
    try {
      await hardwareWebSdk.HardwareWebSdk.init(
        settings,
        hardwareWebSdk.HardwareSDKLowLevel,
      );
      this.isSDKInitialized = true;
      this.sdk = hardwareWebSdk.HardwareWebSdk;

      this.sdk?.on('UI_EVENT', (originEvent: UiEvent) => {
        if (originEvent.type === UI_REQUEST.REQUEST_PIN) {
          this.sdk?.uiResponse({
            type: UI_RESPONSE.RECEIVE_PIN,
            payload: '@@ONEKEY_INPUT_PIN_IN_DEVICE',
          });
        }
        if (originEvent.type === UI_REQUEST.REQUEST_PASSPHRASE) {
          this.sdk?.uiResponse({
            type: UI_RESPONSE.RECEIVE_PASSPHRASE,
            payload: {
              value: '',
              passphraseOnDevice: true,
              save: false,
            },
          });
        }
      });
    } catch {
      this.isSDKInitialized = false;
    }
  }

  async destroy(): Promise<void> {
    this.isSDKInitialized = false;
    this.sdk = undefined;
  }

  async dispose(): Promise<void> {
    this.sdk?.dispose();
    return Promise.resolve();
  }

  getModel(): string | undefined {
    return this.model;
  }

  async getPublicKey(params: {
    path: string;
    coin: string;
  }): Promise<
    | { success: false; payload: { error: string; code?: string | number } }
    | { success: true; payload: { publicKey: string; chainCode: string } }
  > {
    if (!this.sdk) {
      return {
        success: false,
        payload: {
          error: 'SDK not initialized',
          code: HardwareErrorCode.NotInitialized,
        },
      };
    }
    const result = await this.sdk.evmGetPublicKey('', '', {
      ...params,
      skipPassphraseCheck: true,
    });

    if (result?.success) {
      return {
        success: true,
        payload: {
          publicKey: result.payload.pub,
          chainCode: result.payload.node.chain_code,
        },
      };
    }

    this.#handleBlockErrorEvent(result);
    return {
      success: false,
      payload: {
        error: result?.payload.error ?? '',
        code:
          typeof result?.payload?.code === 'number'
            ? result?.payload?.code
            : undefined,
      },
    };
  }

  async getPassphraseState(): Promise<
    | { success: false; payload: { error: string; code?: string | number } }
    | { success: true; payload: string | undefined }
  > {
    if (!this.sdk) {
      return {
        success: false,
        payload: {
          error: 'SDK not initialized',
          code: HardwareErrorCode.NotInitialized,
        },
      };
    }

    const result = await this.sdk.getPassphraseState('');
    if (!result?.success) {
      this.#handleBlockErrorEvent(result);
    }
    return result;
  }

  async ethereumSignTransaction(
    params: Params<EVMSignTransactionParams>,
  ): Promise<
    | { success: false; payload: { error: string; code?: string | number } }
    | { success: true; payload: EVMSignedTx }
  > {
    if (!this.sdk) {
      return {
        success: false,
        payload: {
          error: 'SDK not initialized',
          code: HardwareErrorCode.NotInitialized,
        },
      };
    }
    const result = await this.sdk.evmSignTransaction('', '', {
      ...params,
      skipPassphraseCheck: true,
    });
    if (!result?.success) {
      this.#handleBlockErrorEvent(result);
    }
    return result;
  }

  async ethereumSignMessage(
    params: Params<EVMSignMessageParams>,
  ): Promise<
    | { success: false; payload: { error: string; code?: string | number } }
    | { success: true; payload: EthereumMessageSignature }
  > {
    if (!this.sdk) {
      return {
        success: false,
        payload: {
          error: 'SDK not initialized',
          code: HardwareErrorCode.NotInitialized,
        },
      };
    }
    const result = await this.sdk.evmSignMessage('', '', {
      ...params,
      skipPassphraseCheck: true,
    });
    if (!result?.success) {
      this.#handleBlockErrorEvent(result);
    }
    return result;
  }

  async ethereumSignTypedData(
    params: Params<EVMSignTypedDataParams>,
  ): Promise<
    | { success: false; payload: { error: string; code?: string | number } }
    | { success: true; payload: EthereumMessageSignature }
  > {
    if (!this.sdk) {
      return {
        success: false,
        payload: {
          error: 'SDK not initialized',
          code: HardwareErrorCode.NotInitialized,
        },
      };
    }
    const result = await this.sdk.evmSignTypedData('', '', {
      ...params,
      skipPassphraseCheck: true,
    });
    if (!result?.success) {
      this.#handleBlockErrorEvent(result);
    }
    return result;
  }
}
