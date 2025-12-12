/* eslint-disable @typescript-eslint/no-explicit-any */
import { UI_REQUEST, UI_RESPONSE } from '@onekeyfe/hd-core';
import { HardwareErrorCode } from '@onekeyfe/hd-shared';

import { OneKeyWebBridge } from './onekey-web-bridge';

// Mock the static import at module level
jest.mock('@onekeyfe/hd-web-sdk', () => {
  const mockHardwareWebSdk = {
    init: jest.fn(),
    on: jest.fn(),
    uiResponse: jest.fn(),
    dispose: jest.fn(),
    switchTransport: jest.fn(),
    evmGetPublicKey: jest.fn(),
    getPassphraseState: jest.fn(),
    evmSignTransaction: jest.fn(),
    evmSignMessage: jest.fn(),
    evmSignTypedData: jest.fn(),
  };

  const mockHardwareSDKLowLevel = {};

  return {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    __esModule: true,
    PascalCase: true,
    default: {
      HardwareWebSdk: mockHardwareWebSdk,
      HardwareSDKLowLevel: mockHardwareSDKLowLevel,
    },
  };
});

type MockHardwareWebSdk = {
  init: jest.Mock;
  on: jest.Mock;
  uiResponse: jest.Mock;
  dispose: jest.Mock;
  switchTransport: jest.Mock;
  evmGetPublicKey: jest.Mock;
  getPassphraseState: jest.Mock;
  evmSignTransaction: jest.Mock;
  evmSignMessage: jest.Mock;
  evmSignTypedData: jest.Mock;
};

const mockedModule = jest.requireMock('@onekeyfe/hd-web-sdk').default as {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  HardwareWebSdk: MockHardwareWebSdk;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  HardwareSDKLowLevel: Record<string, unknown>;
};

const {
  HardwareWebSdk: mockHardwareWebSdk,
  HardwareSDKLowLevel: mockHardwareSDKLowLevel,
} = mockedModule;

describe('OneKeyWebBridge', function () {
  let bridge: OneKeyWebBridge;

  beforeEach(function () {
    bridge = new OneKeyWebBridge();
    jest.clearAllMocks();
  });

  describe('init', function () {
    it('should initialize SDK and set up event handlers', async function () {
      mockHardwareWebSdk.init.mockResolvedValue(undefined);

      await bridge.init();

      expect(mockHardwareWebSdk.init).toHaveBeenCalledTimes(1);
      expect(mockHardwareWebSdk.init).toHaveBeenCalledWith(
        {
          debug: false,
          fetchConfig: false,
          connectSrc: 'https://jssdk.onekey.so/1.1.0/',
          env: 'webusb',
        },
        mockHardwareSDKLowLevel,
      );
      expect(bridge.isSDKInitialized).toBe(true);
      expect(bridge.sdk).toBe(mockHardwareWebSdk);
      expect(mockHardwareWebSdk.on).toHaveBeenCalledWith(
        'UI_EVENT',
        expect.any(Function),
      );
    });

    it('should not initialize again if already initialized', async function () {
      bridge.isSDKInitialized = true;

      await bridge.init();

      expect(mockHardwareWebSdk.init).not.toHaveBeenCalled();
    });

    it('should handle initialization failure', async function () {
      mockHardwareWebSdk.init.mockRejectedValue(new Error('Init failed'));

      await bridge.init();

      expect(bridge.isSDKInitialized).toBe(false);
      expect(bridge.sdk).toBeUndefined();
    });

    it('should handle PIN request in UI event', async function () {
      let uiEventCallback: any;
      mockHardwareWebSdk.on.mockImplementation(
        (event: string, callback: any) => {
          if (event === 'UI_EVENT') {
            uiEventCallback = callback;
          }
        },
      );
      mockHardwareWebSdk.init.mockResolvedValue(undefined);

      await bridge.init();

      // Simulate PIN request
      uiEventCallback({ type: UI_REQUEST.REQUEST_PIN });

      expect(mockHardwareWebSdk.uiResponse).toHaveBeenCalledWith({
        type: UI_RESPONSE.RECEIVE_PIN,
        payload: '@@ONEKEY_INPUT_PIN_IN_DEVICE',
      });
    });

    it('should handle passphrase request in UI event', async function () {
      let uiEventCallback: any;
      mockHardwareWebSdk.on.mockImplementation(
        (event: string, callback: any) => {
          if (event === 'UI_EVENT') {
            uiEventCallback = callback;
          }
        },
      );
      mockHardwareWebSdk.init.mockResolvedValue(undefined);

      await bridge.init();

      // Simulate passphrase request
      uiEventCallback({ type: UI_REQUEST.REQUEST_PASSPHRASE });

      expect(mockHardwareWebSdk.uiResponse).toHaveBeenCalledWith({
        type: UI_RESPONSE.RECEIVE_PASSPHRASE,
        payload: {
          value: '',
          passphraseOnDevice: true,
          save: false,
        },
      });
    });
  });

  describe('destroy', function () {
    it('should destroy SDK', async function () {
      bridge.sdk = mockHardwareWebSdk as any;
      bridge.isSDKInitialized = true;

      await bridge.destroy();

      expect(bridge.isSDKInitialized).toBe(false);
      expect(bridge.sdk).toBeUndefined();
    });
  });

  describe('dispose', function () {
    it('should call dispose on SDK', async function () {
      bridge.sdk = mockHardwareWebSdk as any;

      await bridge.dispose();

      expect(mockHardwareWebSdk.dispose).toHaveBeenCalledTimes(1);
    });

    it('should handle dispose when SDK is not initialized', async function () {
      bridge.sdk = undefined;

      // eslint-disable-next-line jest/no-restricted-matchers
      await expect(bridge.dispose()).resolves.toBeUndefined();
    });
  });

  describe('updateTransportMethod', function () {
    it('should switch transport when SDK is initialized', async function () {
      bridge.sdk = mockHardwareWebSdk as any;

      await bridge.updateTransportMethod('webusb');

      expect(mockHardwareWebSdk.switchTransport).toHaveBeenCalledTimes(1);
      expect(mockHardwareWebSdk.switchTransport).toHaveBeenCalledWith('webusb');
    });

    it('should not switch transport when SDK is not initialized', async function () {
      bridge.sdk = undefined;

      await bridge.updateTransportMethod('webusb');

      expect(mockHardwareWebSdk.switchTransport).not.toHaveBeenCalled();
    });
  });

  describe('getPublicKey', function () {
    it('should call evmGetPublicKey', async function () {
      const expectedResult = {
        success: true,
        payload: {
          pub: '0x123',
          // eslint-disable-next-line @typescript-eslint/naming-convention
          node: { chain_code: 'abc123' },
        },
      };
      mockHardwareWebSdk.evmGetPublicKey.mockResolvedValue(expectedResult);
      bridge.sdk = mockHardwareWebSdk as any;

      const params = {
        path: "m/44'/60'/0'/0/0",
        coin: 'eth',
      };
      const result = await bridge.getPublicKey(params);

      expect(mockHardwareWebSdk.evmGetPublicKey).toHaveBeenCalledTimes(1);
      expect(mockHardwareWebSdk.evmGetPublicKey).toHaveBeenCalledWith('', '', {
        ...params,
        skipPassphraseCheck: true,
      });
      expect(result).toStrictEqual({
        success: true,
        payload: {
          publicKey: '0x123',
          chainCode: 'abc123',
        },
      });
    });

    it('should handle error without code', async function () {
      const errorResult = {
        success: false,
        payload: {
          error: 'Some error',
        },
      };
      mockHardwareWebSdk.evmGetPublicKey.mockResolvedValue(errorResult);
      bridge.sdk = mockHardwareWebSdk as any;

      const result = await bridge.getPublicKey({
        path: "m/44'/60'/0'/0/0",
        coin: 'eth',
      });

      expect(result).toStrictEqual({
        success: false,
        payload: {
          error: 'Some error',
          code: undefined,
        },
      });
    });

    it('should return error when SDK is not initialized', async function () {
      bridge.sdk = undefined;

      const result = await bridge.getPublicKey({
        path: "m/44'/60'/0'/0/0",
        coin: 'eth',
      });

      expect(result).toStrictEqual({
        success: false,
        payload: {
          error: 'SDK not initialized',
          code: HardwareErrorCode.NotInitialized,
        },
      });
    });
  });

  describe('getPassphraseState', function () {
    it('should call getPassphraseState', async function () {
      const expectedResult = {
        success: true,
        payload: 'some-state',
      };
      mockHardwareWebSdk.getPassphraseState.mockResolvedValue(expectedResult);
      bridge.sdk = mockHardwareWebSdk as any;

      const result = await bridge.getPassphraseState();

      expect(mockHardwareWebSdk.getPassphraseState).toHaveBeenCalledTimes(1);
      expect(mockHardwareWebSdk.getPassphraseState).toHaveBeenCalledWith('');
      expect(result).toBe(expectedResult);
    });

    it('should return error when SDK is not initialized', async function () {
      bridge.sdk = undefined;

      const result = await bridge.getPassphraseState();

      expect(result).toStrictEqual({
        success: false,
        payload: {
          error: 'SDK not initialized',
          code: HardwareErrorCode.NotInitialized,
        },
      });
    });
  });

  describe('ethereumSignTransaction', function () {
    it('should call evmSignTransaction', async function () {
      const expectedResult = {
        success: true,
        payload: { signature: '0xsignature' },
      };
      mockHardwareWebSdk.evmSignTransaction.mockResolvedValue(expectedResult);
      bridge.sdk = mockHardwareWebSdk as any;

      const params = {
        path: "m/44'/60'/0'/0/0",
        transaction: {
          to: '0x123',
          value: '0x0',
          gasLimit: '0x5208',
          gasPrice: '0x1',
          nonce: '0x0',
          data: '0x',
          chainId: 1,
        },
      };
      const result = await bridge.ethereumSignTransaction(params);

      expect(mockHardwareWebSdk.evmSignTransaction).toHaveBeenCalledTimes(1);
      expect(mockHardwareWebSdk.evmSignTransaction).toHaveBeenCalledWith(
        '',
        '',
        {
          ...params,
          skipPassphraseCheck: true,
        },
      );
      expect(result).toBe(expectedResult);
    });

    it('should return error when SDK is not initialized', async function () {
      bridge.sdk = undefined;

      const params = {
        path: "m/44'/60'/0'/0/0",
        transaction: {
          to: '0x123',
          value: '0x0',
          gasLimit: '0x5208',
          gasPrice: '0x1',
          nonce: '0x0',
          data: '0x',
          chainId: 1,
        },
      };
      const result = await bridge.ethereumSignTransaction(params);

      expect(result).toStrictEqual({
        success: false,
        payload: {
          error: 'SDK not initialized',
          code: HardwareErrorCode.NotInitialized,
        },
      });
    });
  });

  describe('ethereumSignMessage', function () {
    it('should call evmSignMessage', async function () {
      const expectedResult = {
        success: true,
        payload: { signature: '0xsignature' },
      };
      mockHardwareWebSdk.evmSignMessage.mockResolvedValue(expectedResult);
      bridge.sdk = mockHardwareWebSdk as any;

      const params = {
        path: "m/44'/60'/0'/0/0",
        messageHex: '48656c6c6f20576f726c64',
      };
      const result = await bridge.ethereumSignMessage(params);

      expect(mockHardwareWebSdk.evmSignMessage).toHaveBeenCalledTimes(1);
      expect(mockHardwareWebSdk.evmSignMessage).toHaveBeenCalledWith('', '', {
        ...params,
        skipPassphraseCheck: true,
      });
      expect(result).toBe(expectedResult);
    });

    it('should return error when SDK is not initialized', async function () {
      bridge.sdk = undefined;

      const params = {
        path: "m/44'/60'/0'/0/0",
        messageHex: '48656c6c6f20576f726c64',
      };
      const result = await bridge.ethereumSignMessage(params);

      expect(result).toStrictEqual({
        success: false,
        payload: {
          error: 'SDK not initialized',
          code: HardwareErrorCode.NotInitialized,
        },
      });
    });
  });

  describe('ethereumSignTypedData', function () {
    it('should call evmSignTypedData', async function () {
      const expectedResult = {
        success: true,
        payload: { signature: '0xsignature' },
      };
      mockHardwareWebSdk.evmSignTypedData.mockResolvedValue(expectedResult);
      bridge.sdk = mockHardwareWebSdk as any;

      const params = {
        path: "m/44'/60'/0'/0/0",
        data: {
          types: {
            EIP712Domain: [{ name: 'name', type: 'string' }],
          },
          primaryType: 'EIP712Domain',
          domain: { name: 'Test' },
          message: {},
        },
        metamaskV4Compat: true,
      };
      const result = await bridge.ethereumSignTypedData(params);

      expect(mockHardwareWebSdk.evmSignTypedData).toHaveBeenCalledTimes(1);
      expect(mockHardwareWebSdk.evmSignTypedData).toHaveBeenCalledWith('', '', {
        ...params,
        skipPassphraseCheck: true,
      });
      expect(result).toBe(expectedResult);
    });

    it('should return error when SDK is not initialized', async function () {
      bridge.sdk = undefined;

      const params = {
        path: "m/44'/60'/0'/0/0",
        data: {
          types: {
            EIP712Domain: [{ name: 'name', type: 'string' }],
          },
          primaryType: 'EIP712Domain',
          domain: { name: 'Test' },
          message: {},
        },
        metamaskV4Compat: true,
      };
      const result = await bridge.ethereumSignTypedData(params);

      expect(result).toStrictEqual({
        success: false,
        payload: {
          error: 'SDK not initialized',
          code: HardwareErrorCode.NotInitialized,
        },
      });
    });
  });

  describe('model management', function () {
    it('should return model', function () {
      bridge.model = 'OneKey Pro';
      expect(bridge.getModel()).toBe('OneKey Pro');
    });

    it('should return undefined when model is not set', function () {
      expect(bridge.getModel()).toBeUndefined();
    });
  });

  describe('error handling branch coverage', function () {
    it('should handle getPassphraseState error and call handleBlockErrorEvent', async function () {
      const errorResult = {
        success: false,
        payload: {
          error: 'Passphrase error',
          code: HardwareErrorCode.DeviceCheckPassphraseStateError,
        },
      };
      mockHardwareWebSdk.getPassphraseState.mockResolvedValue(errorResult);
      bridge.sdk = mockHardwareWebSdk as any;

      const callback = jest.fn();
      const bridgeWithCallback = new OneKeyWebBridge();
      bridgeWithCallback.setUiEventCallback(callback);
      bridgeWithCallback.sdk = mockHardwareWebSdk as any;

      await bridgeWithCallback.getPassphraseState();
      expect(callback).toHaveBeenCalledWith(errorResult.payload);
    });

    it('should handle ethereumSignTransaction error and call handleBlockErrorEvent', async function () {
      const errorResult = {
        success: false,
        payload: {
          error: 'Sign error',
          code: HardwareErrorCode.BridgeNotInstalled,
        },
      };
      mockHardwareWebSdk.evmSignTransaction.mockResolvedValue(errorResult);

      const callback = jest.fn();
      const bridgeWithCallback = new OneKeyWebBridge();
      bridgeWithCallback.setUiEventCallback(callback);
      bridgeWithCallback.sdk = mockHardwareWebSdk as any;

      const params = {
        path: "m/44'/60'/0'/0/0",
        transaction: {
          to: '0x123',
          value: '0x0',
          gasLimit: '0x5208',
          gasPrice: '0x1',
          nonce: '0x0',
          data: '0x',
          chainId: 1,
        },
      };

      await bridgeWithCallback.ethereumSignTransaction(params);
      expect(callback).toHaveBeenCalledWith(errorResult.payload);
    });

    it('should handle ethereumSignMessage error and call handleBlockErrorEvent', async function () {
      const errorResult = {
        success: false,
        payload: {
          error: 'Sign message error',
          code: HardwareErrorCode.NewFirmwareForceUpdate,
        },
      };
      mockHardwareWebSdk.evmSignMessage.mockResolvedValue(errorResult);

      const callback = jest.fn();
      const bridgeWithCallback = new OneKeyWebBridge();
      bridgeWithCallback.setUiEventCallback(callback);
      bridgeWithCallback.sdk = mockHardwareWebSdk as any;

      const params = {
        path: "m/44'/60'/0'/0/0",
        messageHex: '48656c6c6f',
      };

      await bridgeWithCallback.ethereumSignMessage(params);
      expect(callback).toHaveBeenCalledWith(errorResult.payload);
    });

    it('should handle ethereumSignTypedData error and call handleBlockErrorEvent', async function () {
      const errorResult = {
        success: false,
        payload: {
          error: 'Sign typed data error',
          code: HardwareErrorCode.NotAllowInBootloaderMode,
        },
      };
      mockHardwareWebSdk.evmSignTypedData.mockResolvedValue(errorResult);

      const callback = jest.fn();
      const bridgeWithCallback = new OneKeyWebBridge();
      bridgeWithCallback.setUiEventCallback(callback);
      bridgeWithCallback.sdk = mockHardwareWebSdk as any;

      const params = {
        path: "m/44'/60'/0'/0/0",
        data: {
          types: {
            EIP712Domain: [{ name: 'name', type: 'string' }],
          },
          primaryType: 'EIP712Domain',
          domain: { name: 'Test' },
          message: {},
        },
        metamaskV4Compat: true,
      };

      await bridgeWithCallback.ethereumSignTypedData(params);
      expect(callback).toHaveBeenCalledWith(errorResult.payload);
    });
  });
});
