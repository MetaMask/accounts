/**
 * Ths test file was initially using "jsdom" test environment from jest, but newer version
 * of jest have changed the default test environment to "node".
 *
 * This allow to override the test environment only for this file:
 *
 * @jest-environment jsdom
 */

import type {
  ConnectDynamicSettings,
  TrezorConnectPublicAPI,
} from '@trezor/connect-web' with { 'resolution-mode': 'import' };

import { TrezorBridge } from './trezor-bridge';
import { TrezorConnectBridge } from './trezor-connect-bridge';
import { TREZOR_CONNECT_MANIFEST } from './trezor-keyring';

jest.mock('@trezor/connect-web', () => ({
  __esModule: true,
  default: {
    init: jest.fn(),
    dispose: jest.fn(),
    ethereumGetPublicKey: jest.fn(),
    ethereumSignTransaction: jest.fn(),
    ethereumSignMessage: jest.fn(),
    ethereumSignTypedData: jest.fn(),
  },
}));

describe('TrezorConnectBridge', function () {
  let bridge: TrezorBridge;
  // The mocked singleton the bridge loads, so spies target the object it calls.
  const TrezorConnect = jest.requireMock<{
    default: TrezorConnectPublicAPI<ConnectDynamicSettings>;
  }>('@trezor/connect-web').default;

  beforeEach(function () {
    bridge = new TrezorConnectBridge();
  });

  afterEach(function () {
    jest.resetAllMocks();
  });

  describe('init', function () {
    it('calls init with the given settings', async function () {
      const initSpy = jest
        .spyOn(TrezorConnect, 'init')
        .mockResolvedValue(undefined);

      await bridge.init({
        manifest: TREZOR_CONNECT_MANIFEST,
      });

      expect(initSpy).toHaveBeenCalledTimes(1);
      expect(initSpy).toHaveBeenCalledWith({
        manifest: TREZOR_CONNECT_MANIFEST,
      });
      expect(bridge.model).toBeUndefined();
    });

    it('does not call init again if already initialised', async function () {
      const initSpy = jest
        .spyOn(TrezorConnect, 'init')
        .mockResolvedValue(undefined);

      await bridge.init({
        manifest: TREZOR_CONNECT_MANIFEST,
      });

      await bridge.init({
        manifest: TREZOR_CONNECT_MANIFEST,
      });

      expect(initSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('dispose', function () {
    it('calls dispose', async function () {
      const disposeSpy = jest
        .spyOn(TrezorConnect, 'dispose')
        .mockReturnValue(undefined);

      await bridge.dispose();

      expect(disposeSpy).toHaveBeenCalledTimes(1);
      expect(disposeSpy).toHaveBeenCalledWith();
    });
  });

  describe('ethereumGetPublicKey', function () {
    it('calls ethereumGetPublicKey', async function () {
      const ethereumGetPublicKeySpy = jest
        .spyOn(TrezorConnect, 'ethereumGetPublicKey')
        .mockResolvedValue({ success: true, payload: {} as never });

      const params = {
        path: `m/44'/60'/0'/0`,
      };
      await bridge.ethereumGetPublicKey(params);

      expect(ethereumGetPublicKeySpy).toHaveBeenCalledTimes(1);
      expect(ethereumGetPublicKeySpy).toHaveBeenCalledWith(params);
    });
  });

  describe('ethereumSignTransaction', function () {
    it('calls ethereumSignTransaction', async function () {
      const ethereumSignTransactionSpy = jest
        .spyOn(TrezorConnect, 'ethereumSignTransaction')
        .mockResolvedValue({ success: true, payload: {} as never });

      const params = {
        path: `m/44'/60'/0'/0`,
        transaction: {
          chainId: 1,
          to: '0x0',
          value: '0',
          gasLimit: '0',
          nonce: '0',
          maxFeePerGas: '0',
          maxPriorityFeePerGas: '0',
        },
      };
      await bridge.ethereumSignTransaction(params);

      expect(ethereumSignTransactionSpy).toHaveBeenCalledTimes(1);
      expect(ethereumSignTransactionSpy).toHaveBeenCalledWith(params);
    });
  });

  describe('ethereumSignMessage', function () {
    it('calls ethereumSignMessage', async function () {
      const ethereumSignMessageSpy = jest
        .spyOn(TrezorConnect, 'ethereumSignMessage')
        .mockResolvedValue({ success: true, payload: {} as never });

      const params = {
        path: `m/44'/60'/0'/0`,
        message: '',
        hex: true,
      };
      await bridge.ethereumSignMessage(params);

      expect(ethereumSignMessageSpy).toHaveBeenCalledTimes(1);
      expect(ethereumSignMessageSpy).toHaveBeenCalledWith(params);
    });
  });

  describe('ethereumSignTypedData', function () {
    it('calls ethereumSignTypedData', async function () {
      const ethereumSignTypedDataSpy = jest
        .spyOn(TrezorConnect, 'ethereumSignTypedData')
        .mockResolvedValue({ success: true, payload: {} as never });

      const params = {
        path: `m/44'/60'/0'/0`,
        data: {
          types: {
            EIP712Domain: [],
          },
          primaryType: 'EIP712Domain' as const,
          domain: {},
          message: {},
        },
        metamask_v4_compat: true,
      };
      await bridge.ethereumSignTypedData(params);

      expect(ethereumSignTypedDataSpy).toHaveBeenCalledTimes(1);
      expect(ethereumSignTypedDataSpy).toHaveBeenCalledWith(params);
    });
  });
});
