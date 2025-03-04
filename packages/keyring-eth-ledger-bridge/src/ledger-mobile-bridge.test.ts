import Transport from '@ledgerhq/hw-transport';
import { EIP712Message } from '@ledgerhq/types-live';
import { SignTypedDataVersion, TypedDataUtils } from '@metamask/eth-sig-util';

import { MetaMaskLedgerHwAppEth } from './ledger-hw-app';
import { LedgerMobileBridge } from './ledger-mobile-bridge';
import { LedgerTransportMiddleware } from './ledger-transport-middleware';

type MockDeviceModel = {
  id: string;
};

const DEVICE_ID = 'DEVICE_ID';

describe('LedgerMobileBridge', function () {
  let bridge: LedgerMobileBridge;
  let transportMiddleware: LedgerTransportMiddleware;
  let transportMiddlewareDisposeSpy: jest.SpyInstance;
  let transportMiddlewareSetTransportSpy: jest.SpyInstance;
  let transportMiddlewareGetEthAppSpy: jest.SpyInstance;

  const mockEthApp = {
    signEIP712Message: jest.fn(),
    signEIP712HashedMessage: jest.fn(),
    clearSignTransaction: jest.fn(),
    getAddress: jest.fn(),
    signPersonalMessage: jest.fn(),
    openEthApp: jest.fn(),
    closeApps: jest.fn(),
    getAppNameAndVersion: jest.fn(),
  };

  const mockTransport = {
    deviceModel: { id: '' } as MockDeviceModel, // `id` will be set by `beforeEach`
    send: jest.fn(),
    close: jest.fn(),
    decorateAppAPIMethods: jest.fn(),
  };

  beforeEach(async function () {
    mockTransport.deviceModel = {
      id: DEVICE_ID,
    };
    transportMiddleware = new LedgerTransportMiddleware();
    transportMiddlewareDisposeSpy = jest
      .spyOn(transportMiddleware, 'dispose')
      .mockImplementation(async () => Promise.resolve());
    transportMiddlewareSetTransportSpy = jest.spyOn(
      transportMiddleware,
      'setTransport',
    );
    transportMiddlewareGetEthAppSpy = jest
      .spyOn(transportMiddleware, 'getEthApp')
      .mockImplementation(
        () => mockEthApp as unknown as MetaMaskLedgerHwAppEth,
      );
    bridge = new LedgerMobileBridge(transportMiddleware);
  });

  afterEach(function () {
    jest.clearAllMocks();
  });

  describe('init', function () {
    it('does not throw error during init', async function () {
      let result = null;
      try {
        await bridge.init();
      } catch (error) {
        result = error;
      } finally {
        expect(result).toBeNull();
      }
    });
  });

  describe('destroy', function () {
    it('triggers middleware dispose', async function () {
      await bridge.updateTransportMethod(mockTransport as unknown as Transport);
      expect(bridge.isDeviceConnected).toBe(true);
      await bridge.destroy();
      expect(transportMiddlewareDisposeSpy).toHaveBeenCalledTimes(1);
      expect(bridge.isDeviceConnected).toBe(false);
    });

    it('does not throw error when it is not connected', async function () {
      let result = null;
      try {
        await bridge.destroy();
      } catch (error) {
        result = error;
      } finally {
        expect(result).toBeNull();
        expect(transportMiddlewareDisposeSpy).toHaveBeenCalledTimes(1);
        expect(bridge.isDeviceConnected).toBe(false);
      }
    });

    it('logs error when dispose throws error', async function () {
      const error = new Error('dispose error');
      transportMiddlewareDisposeSpy.mockRejectedValueOnce(error);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      await bridge.updateTransportMethod(mockTransport as unknown as Transport);
      await bridge.destroy();
      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith(error);
    });
  });

  describe('attemptMakeApp', function () {
    it('throw error not supported', async function () {
      await expect(bridge.attemptMakeApp()).rejects.toThrow(
        'Method not supported.',
      );
    });
  });

  describe('deviceSignMessage', function () {
    it('sends and processes a successful ledger-sign-personal-message message', async function () {
      const hdPath = "m/44'/60'/0'/0/0";
      const message = 'message';
      await bridge.deviceSignMessage({
        hdPath,
        message,
      });
      expect(transportMiddlewareGetEthAppSpy).toHaveBeenCalledTimes(1);
      expect(mockEthApp.signPersonalMessage).toHaveBeenCalledTimes(1);
      expect(mockEthApp.signPersonalMessage).toHaveBeenCalledWith(
        hdPath,
        message,
      );
    });
  });

  describe('getPublicKey', function () {
    it('sends and processes a successful ledger-unlock message', async function () {
      const hdPath = "m/44'/60'/0'/0/0";
      await bridge.getPublicKey({
        hdPath,
      });
      expect(transportMiddlewareGetEthAppSpy).toHaveBeenCalledTimes(1);
      expect(mockEthApp.getAddress).toHaveBeenCalledTimes(1);
      expect(mockEthApp.getAddress).toHaveBeenCalledWith(hdPath, false, true);
    });
  });

  describe('setOptions', function () {
    it('set options', async function () {
      const opts = {};
      await bridge.setOptions(opts);
      expect(await bridge.getOptions()).toStrictEqual(opts);
    });
  });

  describe('deviceSignTransaction', function () {
    it('sends and processes a successful ledger-sign-transaction message', async function () {
      const hdPath = "m/44'/60'/0'/0/0";
      const tx =
        'f86d8202b38477359400825208944592d8f8d7b001e72cb26a73e4fa1806a51ac79d880de0b6b3a7640000802ba0699ff162205967ccbabae13e07cdd4284258d46ec1051a70a51be51ec2bc69f3a04e6944d508244ea54a62ebf9a72683eeadacb73ad7c373ee542f1998147b220e';
      await bridge.deviceSignTransaction({
        hdPath,
        tx,
      });
      expect(transportMiddlewareGetEthAppSpy).toHaveBeenCalledTimes(1);
      expect(mockEthApp.clearSignTransaction).toHaveBeenCalledTimes(1);
      expect(mockEthApp.clearSignTransaction).toHaveBeenCalledWith(hdPath, tx, {
        externalPlugins: true,
        erc20: true,
        nft: true,
      });
    });

    it('returns undefined when tx format is not correct', async function () {
      const hdPath = "m/44'/60'/0'/0/0";
      const tx = '';
      expect(
        await bridge.deviceSignTransaction({
          hdPath,
          tx,
        }),
      ).toBeUndefined();
      expect(transportMiddlewareGetEthAppSpy).toHaveBeenCalledTimes(1);
      expect(mockEthApp.clearSignTransaction).toHaveBeenCalledTimes(1);
      expect(mockEthApp.clearSignTransaction).toHaveBeenCalledWith(hdPath, tx, {
        externalPlugins: true,
        erc20: true,
        nft: true,
      });
    });
  });

  describe('deviceSignTypedData', function () {
    it('sends and processes a successful ledger-sign-typed-data message', async function () {
      const hdPath = "m/44'/60'/0'/0/0";
      const message: EIP712Message = {
        domain: {
          chainId: 1,
          verifyingContract: '0xdsf',
        },
        primaryType: 'string',
        types: {
          EIP712Domain: [],
          string: [],
        },
        message: { test: 'test' },
      };
      await bridge.deviceSignTypedData({
        hdPath,
        message,
      });
      expect(transportMiddlewareGetEthAppSpy).toHaveBeenCalledTimes(1);
      expect(mockEthApp.signEIP712Message).toHaveBeenCalledTimes(1);
      expect(mockEthApp.signEIP712Message).toHaveBeenCalledWith(
        hdPath,
        message,
      );
    });

    it('falls back to signEIP712HashedMessage when signEIP712Message fails', async function () {
      const hdPath = "m/44'/60'/0'/0/0";
      const message: EIP712Message = {
        domain: {
          chainId: 1,
          name: 'Test Domain',
          version: '1',
          verifyingContract: '0x1234567890123456789012345678901234567890',
        },
        primaryType: 'Person',
        types: {
          EIP712Domain: [
            { name: 'name', type: 'string' },
            { name: 'version', type: 'string' },
            { name: 'chainId', type: 'uint256' },
            { name: 'verifyingContract', type: 'address' },
          ],
          Person: [
            { name: 'name', type: 'string' },
            { name: 'wallet', type: 'address' },
          ],
        },
        message: {
          name: 'Bob',
          wallet: '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
        },
      };

      const signEIP712MessageError = new Error(
        'Ledger device does not support this operation',
      );
      mockEthApp.signEIP712Message.mockRejectedValueOnce(
        signEIP712MessageError,
      );

      mockEthApp.signEIP712HashedMessage.mockResolvedValue({
        v: '0x1b',
        r: '0x1234',
        s: '0x5678',
      });

      const domainSeparatorHex = TypedDataUtils.hashStruct(
        'EIP712Domain',
        message.domain,
        message.types,
        SignTypedDataVersion.V4,
      ).toString('hex');
      const hashStructMessageHex = TypedDataUtils.hashStruct(
        message.primaryType,
        message.message,
        message.types,
        SignTypedDataVersion.V4,
      ).toString('hex');

      const result = await bridge.deviceSignTypedData({
        hdPath,
        message,
      });

      expect(mockEthApp.signEIP712Message).toHaveBeenCalledTimes(1);
      expect(mockEthApp.signEIP712Message).toHaveBeenCalledWith(
        hdPath,
        message,
      );

      expect(mockEthApp.signEIP712HashedMessage).toHaveBeenCalledTimes(1);
      expect(mockEthApp.signEIP712HashedMessage).toHaveBeenCalledWith(
        hdPath,
        domainSeparatorHex,
        hashStructMessageHex,
      );

      expect(result).toStrictEqual({
        v: '0x1b',
        r: '0x1234',
        s: '0x5678',
      });
    });

    it('throws error when both signEIP712Message and fallback method fail', async function () {
      const hdPath = "m/44'/60'/0'/0/0";
      const message: EIP712Message = {
        domain: {
          chainId: 1,
          name: 'Test Domain',
          version: '1',
          verifyingContract: '0x1234567890123456789012345678901234567890',
        },
        primaryType: 'Person',
        types: {
          EIP712Domain: [
            { name: 'name', type: 'string' },
            { name: 'version', type: 'string' },
            { name: 'chainId', type: 'uint256' },
            { name: 'verifyingContract', type: 'address' },
          ],
          Person: [
            { name: 'name', type: 'string' },
            { name: 'wallet', type: 'address' },
          ],
        },
        message: {
          name: 'Bob',
          wallet: '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
        },
      };

      const primaryError = new Error('Primary signing method failed');
      const fallbackError = new Error('Fallback signing method failed');

      mockEthApp.signEIP712Message.mockRejectedValueOnce(primaryError);
      mockEthApp.signEIP712HashedMessage.mockRejectedValueOnce(fallbackError);

      await expect(
        bridge.deviceSignTypedData({
          hdPath,
          message,
        }),
      ).rejects.toThrow(fallbackError);

      expect(mockEthApp.signEIP712Message).toHaveBeenCalledTimes(1);
      expect(mockEthApp.signEIP712HashedMessage).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateTransportMethod', function () {
    it('sets transport in transportMiddleware and set isDeviceConnected to true', async function () {
      await bridge.updateTransportMethod(mockTransport as unknown as Transport);
      expect(transportMiddlewareSetTransportSpy).toHaveBeenCalledTimes(1);
      expect(transportMiddlewareSetTransportSpy).toHaveBeenCalledWith(
        mockTransport,
      );
      expect(bridge.isDeviceConnected).toBe(true);
    });

    it('throws error when device id not set from transport', async function () {
      mockTransport.deviceModel = {
        id: '',
      };
      await expect(
        bridge.updateTransportMethod(mockTransport as unknown as Transport),
      ).rejects.toThrow(
        'Property `deviceModel.id` is not defined in `transport`.',
      );
    });

    it('throws error when transport.deviceModel is not set', async function () {
      // @ts-expect-error `deviceModel` must be null to validate this test case
      mockTransport.deviceModel = null;
      await expect(
        bridge.updateTransportMethod(mockTransport as unknown as Transport),
      ).rejects.toThrow(
        'Property `deviceModel` is not defined in `transport`.',
      );
    });

    it('throws error when middleware is not initialized', async function () {
      bridge = new LedgerMobileBridge(
        null as unknown as LedgerTransportMiddleware,
      );
      await expect(
        bridge.updateTransportMethod(mockTransport as unknown as Transport),
      ).rejects.toThrow('Instance `transportMiddleware` is not initialized.');
    });
  });

  describe('openEthApp', function () {
    it('sends the `openEthApp` transport command correctly', async function () {
      await bridge.openEthApp();
      expect(mockEthApp.openEthApp).toHaveBeenCalledTimes(1);
    });
  });

  describe('closeApps', function () {
    it('sends the `closeApps` transport command correctly', async function () {
      await bridge.closeApps();
      expect(mockEthApp.closeApps).toHaveBeenCalledTimes(1);
    });
  });

  describe('getAppNameAndVersion', function () {
    it('sends the `getAppNameAndVersion` transport command correctly', async function () {
      await bridge.getAppNameAndVersion();
      expect(mockEthApp.getAppNameAndVersion).toHaveBeenCalledTimes(1);
    });
  });

  describe('getOption', function () {
    it('returns the bridge instance options', async function () {
      const result = await bridge.getOptions();
      expect(result).toStrictEqual({});
    });
  });
});
