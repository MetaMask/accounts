/* eslint-disable @typescript-eslint/naming-convention */

import {
  CommandResultStatus,
  DeviceActionStatus,
  DeviceManagementKit,
  DeviceManagementKitBuilder,
} from '@ledgerhq/device-management-kit';
import { EIP712Message } from '@ledgerhq/types-live';
import { of } from 'rxjs';

import { LedgerDMKBridge } from './ledger-dmk-bridge';
import { LedgerDMKTransportMiddleware } from './ledger-dmk-transport-middleware';

// Mock the transport middleware
jest.mock('./ledger-dmk-transport-middleware');

describe('LedgerDMKBridge', () => {
  let bridge: LedgerDMKBridge;
  let buildSpy: jest.SpyInstance;
  let mockTransportMiddleware: jest.Mocked<LedgerDMKTransportMiddleware>;
  let mockSDK: { sendCommand: jest.Mock };
  let mockEthSigner: {
    getAddress: jest.Mock;
    signMessage: jest.Mock;
    signTransaction: jest.Mock;
    signTypedData: jest.Mock;
  };

  const mockSendCommandResult = {
    name: 'Ethereum',
    version: '2.4.0',
    flags: 1, // Blind signing enabled by default
  };

  beforeEach(() => {
    mockSDK = {
      sendCommand: jest.fn().mockResolvedValue({
        status: CommandResultStatus.Success,
        data: mockSendCommandResult,
      }),
    };

    mockEthSigner = {
      getAddress: jest.fn().mockReturnValue({
        observable: of({
          status: DeviceActionStatus.Completed,
          output: {
            publicKey: '0xpublicKey',
            address: '0xaddress',
            chainCode: '0xchainCode',
          },
        }),
      }),
      signTransaction: jest.fn().mockReturnValue({
        observable: of({
          status: DeviceActionStatus.Completed,
          output: {
            v: 27,
            r: '0xr-value',
            s: '0xs-value',
          },
        }),
      }),
      signMessage: jest.fn().mockReturnValue({
        observable: of({
          status: DeviceActionStatus.Completed,
          output: {
            v: 27,
            r: '0xr-value',
            s: '0xs-value',
          },
        }),
      }),
      signTypedData: jest.fn().mockReturnValue({
        observable: of({
          status: DeviceActionStatus.Completed,
          output: {
            v: 27,
            r: '0xr-value',
            s: '0xs-value',
          },
        }),
      }),
    };

    buildSpy = jest
      .spyOn(DeviceManagementKitBuilder.prototype, 'build')
      .mockReturnValue(mockSDK as unknown as DeviceManagementKit);

    // Create mock transport middleware
    mockTransportMiddleware = {
      setSessionId: jest.fn(),
      getSessionId: jest.fn().mockReturnValue('test-session-id'),
      getSDK: jest
        .fn()
        .mockReturnValue(mockSDK as unknown as DeviceManagementKit),
      dispose: jest.fn().mockResolvedValue(undefined),
      getEthSigner: jest.fn().mockReturnValue(mockEthSigner),
    } as unknown as jest.Mocked<LedgerDMKTransportMiddleware>;

    // Mock the constructor to return our mock
    (LedgerDMKTransportMiddleware as unknown as jest.Mock).mockImplementation(
      () => mockTransportMiddleware,
    );

    bridge = new LedgerDMKBridge();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('initializes with default options', () => {
      expect(bridge).toBeDefined();
      expect(bridge.isDeviceConnected).toBe(false);
    });

    it('initializes DMK with DeviceManagementKitBuilder', () => {
      expect(buildSpy).toHaveBeenCalledTimes(1);
    });

    it('creates transport middleware with SDK', () => {
      expect(LedgerDMKTransportMiddleware).toHaveBeenCalledTimes(1);
    });
  });

  describe('init', () => {
    it('does not throw error during init', async () => {
      let result: Error | null = null;
      try {
        await bridge.init();
      } catch (error) {
        result = error as Error;
      }
      expect(result).toBeNull();
    });
  });

  describe('destroy', () => {
    it('triggers middleware dispose', async () => {
      await bridge.updateSessionId('test-session-id');
      expect(bridge.isDeviceConnected).toBe(true);
      await bridge.destroy();
      expect(mockTransportMiddleware.dispose.mock.calls).toHaveLength(1);
      expect(bridge.isDeviceConnected).toBe(false);
    });

    it('does not throw error when dispose fails', async () => {
      const error = new Error('dispose error');
      mockTransportMiddleware.dispose.mockRejectedValueOnce(error);
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      await bridge.destroy();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to dispose DMK transport middleware:',
        error,
      );
      expect(bridge.isDeviceConnected).toBe(false);
    });
  });

  describe('getOptions', () => {
    it('returns the bridge instance options', async () => {
      const result = await bridge.getOptions();
      expect(result).toStrictEqual({});
    });
  });

  describe('setOptions', () => {
    it('sets options', async () => {
      const opts = { key: 'value' };
      await bridge.setOptions(opts);
      expect(await bridge.getOptions()).toStrictEqual(opts);
    });
  });

  describe('updateSessionId', () => {
    it('sets session ID in transport middleware and sets isDeviceConnected to true', async () => {
      const sessionId = 'test-session-id';
      const result = await bridge.updateSessionId(sessionId);
      expect(mockTransportMiddleware.setSessionId.mock.calls).toStrictEqual([
        [sessionId],
      ]);
      expect(bridge.isDeviceConnected).toBe(true);
      expect(result).toBe(true);
    });
  });

  describe('updateTransportMethod', () => {
    it('throws error indicating method is not supported', async () => {
      await expect(bridge.updateTransportMethod()).rejects.toThrow(
        'updateTransportMethod is not supported in DMK bridge. Use updateSessionId instead.',
      );
    });
  });

  describe('attemptMakeApp', () => {
    it('returns true', async () => {
      const result = await bridge.attemptMakeApp();
      expect(result).toBe(true);
    });
  });

  describe('getPublicKey', () => {
    it('calls the DMK signer getAddress with hdPath', async () => {
      const hdPath = "m/44'/60'/0'/0/0";
      const result = await bridge.getPublicKey({ hdPath });

      expect(mockTransportMiddleware.getEthSigner.mock.calls).toHaveLength(1);
      expect(mockEthSigner.getAddress.mock.calls).toStrictEqual([
        [
          hdPath,
          {
            checkOnDevice: false,
            returnChainCode: true,
          },
        ],
      ]);
      expect(result).toStrictEqual({
        publicKey: '0xpublicKey',
        address: '0xaddress',
        chainCode: '0xchainCode',
      });
    });
  });

  describe('deviceSignTransaction', () => {
    it('calls the DMK signer signTransaction with hdPath and tx', async () => {
      const hdPath = "m/44'/60'/0'/0/0";
      const tx = 'f86d8202b38477359400825208';
      const result = await bridge.deviceSignTransaction({ hdPath, tx });

      expect(mockTransportMiddleware.getEthSigner.mock.calls).toHaveLength(1);
      expect(mockEthSigner.signTransaction.mock.calls).toStrictEqual([
        [hdPath, Uint8Array.from(Buffer.from(tx, 'hex'))],
      ]);
      expect(result).toStrictEqual({
        v: '1b',
        r: 'r-value',
        s: 's-value',
      });
    });
  });

  describe('deviceSignMessage', () => {
    it('calls the DMK signer signMessage with hdPath and message', async () => {
      const hdPath = "m/44'/60'/0'/0/0";
      const message = 'test message';
      const result = await bridge.deviceSignMessage({ hdPath, message });

      expect(mockTransportMiddleware.getEthSigner.mock.calls).toHaveLength(1);
      expect(mockEthSigner.signMessage.mock.calls).toStrictEqual([
        [hdPath, message],
      ]);
      expect(result).toStrictEqual({
        v: 27,
        r: 'r-value',
        s: 's-value',
      });
    });
  });

  describe('deviceSignTypedData', () => {
    it('calls the DMK signer signTypedData with hdPath and message', async () => {
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
      const result = await bridge.deviceSignTypedData({ hdPath, message });

      expect(mockTransportMiddleware.getEthSigner.mock.calls).toHaveLength(1);
      expect(mockEthSigner.signTypedData.mock.calls).toStrictEqual([
        [hdPath, message],
      ]);
      expect(result).toStrictEqual({
        v: 27,
        r: 'r-value',
        s: 's-value',
      });
    });
  });

  describe('getAppNameAndVersion', () => {
    it('calls sdk sendCommand and returns app name and version', async () => {
      const result = await bridge.getAppNameAndVersion();

      expect(result).toStrictEqual({
        appName: 'Ethereum',
        version: '2.4.0',
      });
    });
  });

  describe('getAppConfiguration', () => {
    it('returns app configuration with version from SDK', async () => {
      const result = await bridge.getAppConfiguration();

      expect(result).toStrictEqual({
        arbitraryDataEnabled: 1,
        erc20ProvisioningNecessary: 0,
        starkEnabled: 0,
        starkv2Supported: 0,
        version: '2.4.0',
      });
    });

    it('parses flags to determine arbitraryDataEnabled', async () => {
      mockSDK.sendCommand.mockResolvedValueOnce({
        status: CommandResultStatus.Success,
        data: {
          name: 'Ethereum',
          version: '2.4.0',
          flags: 0,
        },
      });

      const result = await bridge.getAppConfiguration();

      expect(result.arbitraryDataEnabled).toBe(0);
      expect(result.version).toBe('2.4.0');
    });

    it('returns arbitraryDataEnabled when flags indicate blind signing support', async () => {
      mockSDK.sendCommand.mockResolvedValueOnce({
        status: CommandResultStatus.Success,
        data: {
          name: 'Ethereum',
          version: '2.4.0',
          flags: 1,
        },
      });

      const result = await bridge.getAppConfiguration();

      expect(result.arbitraryDataEnabled).toBe(1);
      expect(result.version).toBe('2.4.0');
    });
  });
});
