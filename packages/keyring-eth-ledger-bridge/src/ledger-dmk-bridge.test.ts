import {
  CloseAppCommand,
  CommandResultStatus,
  DeviceActionStatus,
  DeviceExchangeError,
  DeviceManagementKit,
  DeviceManagementKitBuilder,
  DeviceStatus,
  OpenAppCommand,
} from '@ledgerhq/device-management-kit';
import { TransportStatusError } from '@ledgerhq/hw-transport';
import { EIP712Message } from '@ledgerhq/types-live';
import { BehaviorSubject, of, Subject } from 'rxjs';

import { LedgerDMKBridge } from './ledger-dmk-bridge';
import { LedgerMobileDMKTransportMiddleware } from './ledger-dmk-transport-middleware';

jest.mock('./ledger-dmk-transport-middleware');

const mockTransportFactory = jest.fn();

describe('LedgerDMKBridge', () => {
  let bridge: LedgerDMKBridge;
  let addTransportSpy: jest.SpyInstance;
  let buildSpy: jest.SpyInstance;
  let mockTransportMiddleware: jest.Mocked<LedgerMobileDMKTransportMiddleware>;
  let mockSDK: {
    connect: jest.Mock;
    sendCommand: jest.Mock;
    startDiscovering: jest.Mock;
    getDeviceSessionState: jest.Mock;
  };
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
      connect: jest.fn().mockResolvedValue('test-session-id'),
      sendCommand: jest.fn().mockResolvedValue({
        status: CommandResultStatus.Success,
        data: mockSendCommandResult,
      }),
      startDiscovering: jest.fn().mockReturnValue(of({ id: 'device-id' })),
      getDeviceSessionState: jest
        .fn()
        .mockReturnValue(new BehaviorSubject({ deviceStatus: DeviceStatus.CONNECTED })),
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

    addTransportSpy = jest
      .spyOn(DeviceManagementKitBuilder.prototype, 'addTransport')
      .mockImplementation(
        function mockAddTransport(this: DeviceManagementKitBuilder) {
          return this;
        },
      );

    buildSpy = jest
      .spyOn(DeviceManagementKitBuilder.prototype, 'build')
      .mockReturnValue(mockSDK as unknown as DeviceManagementKit);

    // Create mock transport middleware
    mockTransportMiddleware = {
      connect: jest.fn().mockResolvedValue('test-session-id'),
      setSessionId: jest.fn(),
      getSessionId: jest.fn().mockReturnValue('test-session-id'),
      getSDK: jest
        .fn()
        .mockReturnValue(mockSDK as unknown as DeviceManagementKit),
      dispose: jest.fn().mockResolvedValue(undefined),
      getEthSigner: jest.fn().mockReturnValue(mockEthSigner),
      startDiscovering: jest.fn().mockReturnValue(of({ id: 'device-id' })),
    } as unknown as jest.Mocked<LedgerMobileDMKTransportMiddleware>;

    // Mock the constructor to return our mock
    (
      LedgerMobileDMKTransportMiddleware as unknown as jest.Mock
    ).mockImplementation(() => mockTransportMiddleware);

    bridge = new LedgerDMKBridge({ transportFactory: mockTransportFactory });
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

    it('registers the injected transport factory', () => {
      expect(addTransportSpy).toHaveBeenCalledWith(mockTransportFactory);
    });

    it('creates transport middleware with SDK', () => {
      expect(LedgerMobileDMKTransportMiddleware).toHaveBeenCalledTimes(1);
    });

    it('exports LedgerMobileDMKBridge as deprecated alias', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, n/global-require
      const mod = require('./ledger-dmk-bridge');
      expect(mod.LedgerMobileDMKBridge).toBe(mod.LedgerDMKBridge);
    });
  });

  describe('isDeviceConnected', () => {
    it('returns false when bridge is not connected', () => {
      expect(bridge.isDeviceConnected).toBe(false);
    });

    it('returns true after updateSessionId', async () => {
      await bridge.updateSessionId('test-session-id');
      expect(bridge.isDeviceConnected).toBe(true);
    });

    it('returns true after connect', async () => {
      const params = {
        device: { id: 'device-id' },
      } as unknown as Parameters<
        LedgerMobileDMKTransportMiddleware['connect']
      >[0];
      await bridge.connect(params);
      expect(bridge.isDeviceConnected).toBe(true);
    });

    it('returns false after destroy', async () => {
      await bridge.updateSessionId('test-session-id');
      await bridge.destroy();
      expect(bridge.isDeviceConnected).toBe(false);
    });

    it('is a read-only getter', () => {
      const descriptor = Object.getOwnPropertyDescriptor(
        Object.getPrototypeOf(bridge),
        'isDeviceConnected',
      );
      // eslint-disable-next-line jest/unbound-method
      expect(descriptor?.get).toBeInstanceOf(Function);
      // eslint-disable-next-line jest/unbound-method
      expect(descriptor?.set).toBeUndefined();
    });
  });

  describe('onSessionStateChange', () => {
    it('is an Observable', () => {
      expect(bridge.onSessionStateChange).toBeDefined();
      expect(typeof bridge.onSessionStateChange.subscribe).toBe('function');
    });

    it('emits { connected: true } when session is connected', async () => {
      const sessionState$ = new Subject();
      mockSDK.getDeviceSessionState.mockReturnValue(sessionState$);

      await bridge.updateSessionId('session-1');

      const emitted: { connected: boolean }[] = [];
      bridge.onSessionStateChange.subscribe((state) => emitted.push(state));

      sessionState$.next({ deviceStatus: DeviceStatus.CONNECTED });

      expect(emitted).toStrictEqual([{ connected: true }]);
    });

    it('emits { connected: false } when session observable errors', async () => {
      const sessionState$ = new Subject();
      mockSDK.getDeviceSessionState.mockReturnValue(sessionState$);

      await bridge.updateSessionId('session-1');

      const emitted: { connected: boolean }[] = [];
      bridge.onSessionStateChange.subscribe({
        next: (state) => emitted.push(state),
        error: () => undefined,
      });

      sessionState$.error(new Error('disconnected'));

      expect(emitted).toStrictEqual([{ connected: false }]);
      expect(bridge.isDeviceConnected).toBe(false);
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
      expect(result.transportFactory).toBe(mockTransportFactory);
    });
  });

  describe('setOptions', () => {
    it('sets options', async () => {
      const opts = { transportFactory: jest.fn() };
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
    it('accepts the mobile transport type', async () => {
      expect(await bridge.updateTransportMethod('mobile')).toBe(true);
    });

    it('remains compatible with legacy transport names', async () => {
      expect(await bridge.updateTransportMethod('webhid')).toBe(true);
    });
  });

  describe('startDiscovering', () => {
    it('delegates device discovery to the transport middleware', () => {
      const discovery = bridge.startDiscovering({});

      expect(mockTransportMiddleware.startDiscovering.mock.calls).toStrictEqual(
        [[{}]],
      );
      expect(discovery).toBeDefined();
    });
  });

  describe('connect', () => {
    it('connects through the transport middleware and marks the device as connected', async () => {
      const params = {
        device: { id: 'device-id' },
      } as unknown as Parameters<
        LedgerMobileDMKTransportMiddleware['connect']
      >[0];
      const result = await bridge.connect(params);

      expect(mockTransportMiddleware.connect.mock.calls).toStrictEqual([
        [params],
      ]);
      expect(result).toBe('test-session-id');
      expect(bridge.isDeviceConnected).toBe(true);
    });
  });

  describe('attemptMakeApp', () => {
    it('returns true when Ethereum app is running', async () => {
      const result = await bridge.attemptMakeApp();
      expect(result).toBe(true);
    });

    it('throws when a non-Ethereum app is running', async () => {
      mockSDK.sendCommand.mockResolvedValueOnce({
        status: CommandResultStatus.Success,
        data: {
          name: 'Bitcoin',
          version: '1.0.0',
        },
      });

      await expect(bridge.attemptMakeApp()).rejects.toThrow(
        "Expected Ethereum app but 'Bitcoin' is running",
      );
    });

    it('throws when getAppNameAndVersion fails', async () => {
      mockSDK.sendCommand.mockResolvedValueOnce({
        status: 'error',
        error: new Error('device busy'),
      });

      await expect(bridge.attemptMakeApp()).rejects.toThrow('device busy');
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

    it('wraps non-DeviceExchangeError signer errors in TransportStatusError', async () => {
      const error = new Error('device action failed');
      mockEthSigner.getAddress.mockReturnValueOnce({
        observable: of({
          status: DeviceActionStatus.Error,
          error,
        }),
      });

      await expect(
        bridge.getPublicKey({ hdPath: "m/44'/60'/0'/0/0" }),
      ).rejects.toThrow(TransportStatusError);
    });

    it('translates DeviceExchangeError to TransportStatusError', async () => {
      const dmkError = Object.create(DeviceExchangeError.prototype) as Error & {
        _tag: string;
        errorCode: string;
        message: string;
      };
      dmkError._tag = 'EthAppCommandError';
      dmkError.errorCode = '6985';
      dmkError.message = 'Conditions not satisfied';

      mockEthSigner.getAddress.mockReturnValueOnce({
        observable: of({
          status: DeviceActionStatus.Error,
          error: dmkError,
        }),
      });

      await expect(
        bridge.getPublicKey({ hdPath: "m/44'/60'/0'/0/0" }),
      ).rejects.toThrow(TransportStatusError);
    });

    it('throws when a device action completes without a terminal status', async () => {
      jest.resetModules();
      let isolatedTest: Promise<void> | undefined;

      jest.isolateModules(() => {
        jest.doMock('rxjs/operators', () => ({
          filter:
            () =>
            (source: unknown): unknown =>
              source,
        }));
        jest.doMock('@ledgerhq/device-management-kit', () => {
          const actual = jest.requireActual('@ledgerhq/device-management-kit');

          return {
            ...actual,
            DeviceManagementKitBuilder: jest.fn().mockImplementation(() => ({
              addTransport: jest.fn().mockReturnThis(),
              build: jest.fn().mockReturnValue({}),
            })),
          };
        });
        jest.doMock('./ledger-dmk-transport-middleware', () => ({
          LedgerMobileDMKTransportMiddleware: jest
            .fn()
            .mockImplementation(() => ({
              dispose: jest.fn(),
              getEthSigner: jest.fn().mockReturnValue({
                getAddress: jest.fn().mockReturnValue({
                  observable: of({ status: 'pending' }),
                }),
              }),
              getSessionId: jest.fn().mockReturnValue('test-session-id'),
              setSessionId: jest.fn(),
            })),
          LedgerDMKTransportMiddleware: jest.fn().mockImplementation(() => ({
            dispose: jest.fn(),
            getEthSigner: jest.fn().mockReturnValue({
              getAddress: jest.fn().mockReturnValue({
                observable: of({ status: 'pending' }),
              }),
            }),
            getSessionId: jest.fn().mockReturnValue('test-session-id'),
            setSessionId: jest.fn(),
          })),
        }));

        isolatedTest = (async (): Promise<void> => {
          // eslint-disable-next-line @typescript-eslint/no-require-imports, n/global-require
          const Bridge = require('./ledger-dmk-bridge').LedgerDMKBridge;

          await expect(
            new Bridge({ transportFactory: jest.fn() }).getPublicKey({
              hdPath: "m/44'/60'/0'/0/0",
            }),
          ).rejects.toThrow('Ledger device action ended without completion.');
        })();
      });

      await isolatedTest;

      jest.resetModules();
    });
  });

  afterAll(() => {
    jest.resetModules();
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

    it('normalizes hex string v values', async () => {
      mockEthSigner.signTransaction.mockReturnValueOnce({
        observable: of({
          status: DeviceActionStatus.Completed,
          output: {
            v: '0x1c',
            r: '0xr-value',
            s: '0xs-value',
          },
        }),
      });

      const result = await bridge.deviceSignTransaction({
        hdPath: "m/44'/60'/0'/0/0",
        tx: 'f86d8202b38477359400825208',
      });

      expect(result.v).toBe('1c');
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

    it('preserves signature parts that are already missing a hex prefix', async () => {
      mockEthSigner.signMessage.mockReturnValueOnce({
        observable: of({
          status: DeviceActionStatus.Completed,
          output: {
            v: 27,
            r: 'r-value',
            s: 's-value',
          },
        }),
      });

      const result = await bridge.deviceSignMessage({
        hdPath: "m/44'/60'/0'/0/0",
        message: 'test message',
      });

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

    it('rethrows SDK command errors when available', async () => {
      const error = new Error('command failed');
      mockSDK.sendCommand.mockResolvedValueOnce({
        status: 'error',
        error,
      });

      await expect(bridge.getAppNameAndVersion()).rejects.toThrow(error);
    });
  });

  describe('getAppConfiguration', () => {
    it('uses the DMK signer GetAppConfiguration command', async () => {
      mockSDK.sendCommand.mockResolvedValueOnce({
        status: CommandResultStatus.Success,
        data: {
          blindSigningEnabled: true,
          web3ChecksEnabled: true,
          web3ChecksOptIn: true,
          version: '1.10.0',
        },
      });

      await bridge.getAppConfiguration();

      expect(mockSDK.sendCommand.mock.calls[0]?.[0].command.name).toBe(
        'getAppConfiguration',
      );
    });

    it('returns arbitraryDataEnabled=1 when flags bit 0 is set (blind signing enabled)', async () => {
      mockSDK.sendCommand.mockResolvedValueOnce({
        status: CommandResultStatus.Success,
        data: {
          blindSigningEnabled: true,
          version: '1.10.0',
        },
      });

      const result = await bridge.getAppConfiguration();

      expect(result).toStrictEqual({
        arbitraryDataEnabled: 1,
        erc20ProvisioningNecessary: 0,
        starkEnabled: 0,
        starkv2Supported: 0,
        version: '1.10.0',
      });
    });

    it('returns arbitraryDataEnabled=0 when flags bit 0 is clear (blind signing disabled)', async () => {
      mockSDK.sendCommand.mockResolvedValueOnce({
        status: CommandResultStatus.Success,
        data: {
          blindSigningEnabled: false,
          version: '1.10.0',
        },
      });

      const result = await bridge.getAppConfiguration();

      expect(result.arbitraryDataEnabled).toBe(0);
      expect(result.version).toBe('1.10.0');
    });

    it('defaults arbitraryDataEnabled to 0 when blindSigningEnabled is false', async () => {
      mockSDK.sendCommand.mockResolvedValueOnce({
        status: CommandResultStatus.Success,
        data: {
          version: '1.10.0',
        },
      });

      const result = await bridge.getAppConfiguration();

      expect(result.arbitraryDataEnabled).toBe(0);
    });

    it('treats truthy blindSigningEnabled as enabled', async () => {
      mockSDK.sendCommand.mockResolvedValueOnce({
        status: CommandResultStatus.Success,
        data: {
          blindSigningEnabled: 'unexpected',
          version: '1.10.0',
        },
      });

      const result = await bridge.getAppConfiguration();

      expect(result.arbitraryDataEnabled).toBe(1);
    });

    it('throws on SDK command failure', async () => {
      mockSDK.sendCommand.mockResolvedValueOnce({
        status: 'error',
        error: new Error('eth app not found'),
      });

      await expect(bridge.getAppConfiguration()).rejects.toThrow(
        'eth app not found',
      );
    });

    it('translates DMK command errors to TransportStatusError', async () => {
      mockSDK.sendCommand.mockResolvedValueOnce({
        status: 'error',
        error: createMockDeviceExchangeError('6985'),
      });

      let caughtError: unknown;
      try {
        await bridge.getAppConfiguration();
      } catch (error) {
        caughtError = error;
      }

      expect(caughtError).toBeInstanceOf(TransportStatusError);
      expect((caughtError as TransportStatusError).statusCode).toBe(0x6985);
    });

    it('throws generic error for non-Error SDK failures', async () => {
      mockSDK.sendCommand.mockResolvedValueOnce({
        status: 'error',
        error: 'string error',
      });

      await expect(bridge.getAppConfiguration()).rejects.toThrow(
        'Ledger command failed.',
      );
    });
  });

  describe('constructor with dmk option', () => {
    it('uses the provided DMK instance', () => {
      const externalDmk = mockSDK as unknown as DeviceManagementKit;
      const dmkBridge = new LedgerDMKBridge({ dmk: externalDmk });
      expect(dmkBridge.dmk).toBe(externalDmk);
    });

    it('does not call dispose on destroy when dmk is provided', async () => {
      const externalDmk = mockSDK as unknown as DeviceManagementKit;
      const dmkBridge = new LedgerDMKBridge({ dmk: externalDmk });
      await dmkBridge.destroy();
      expect(mockTransportMiddleware.dispose).not.toHaveBeenCalled();
    });

    it('throws when neither dmk nor transportFactory is provided', () => {
      expect(
        () => new LedgerDMKBridge({}),
      ).toThrow(
        'LedgerDMKBridge requires either a transportFactory or a dmk instance.',
      );
    });
  });

  describe('dmk getter', () => {
    it('returns the DMK instance', () => {
      expect(bridge.dmk).toBeDefined();
    });
  });

  describe('openEthApp', () => {
    it('sends OpenAppCommand via DMK', async () => {
      await bridge.updateSessionId('test-session-id');
      await bridge.openEthApp();
      expect(mockSDK.sendCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'test-session-id',
          command: expect.any(OpenAppCommand),
        }),
      );
    });

    it('throws on command failure', async () => {
      await bridge.updateSessionId('test-session-id');
      mockSDK.sendCommand.mockResolvedValueOnce({
        status: 'error',
        error: new Error('open app failed'),
      });
      await expect(bridge.openEthApp()).rejects.toThrow('open app failed');
    });
  });

  describe('closeApps', () => {
    it('sends CloseAppCommand via DMK', async () => {
      await bridge.updateSessionId('test-session-id');
      await bridge.closeApps();
      expect(mockSDK.sendCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'test-session-id',
          command: expect.any(CloseAppCommand),
        }),
      );
    });

    it('throws on command failure', async () => {
      await bridge.updateSessionId('test-session-id');
      mockSDK.sendCommand.mockResolvedValueOnce({
        status: 'error',
        error: new Error('close app failed'),
      });
      await expect(bridge.closeApps()).rejects.toThrow('close app failed');
    });
  });

  describe('session monitoring', () => {
    it('detects disconnect via NOT_CONNECTED deviceStatus', async () => {
      const sessionState$ = new Subject();
      mockSDK.getDeviceSessionState.mockReturnValue(sessionState$);

      await bridge.updateSessionId('session-1');

      const emitted: { connected: boolean }[] = [];
      bridge.onSessionStateChange.subscribe({
        next: (state) => emitted.push(state),
        error: () => undefined,
        complete: () => undefined,
      });

      sessionState$.next({ deviceStatus: DeviceStatus.NOT_CONNECTED });
      sessionState$.complete();

      expect(emitted).toContainEqual({ connected: false });
      expect(bridge.isDeviceConnected).toBe(false);
    });

    it('detects disconnect via observable completion', async () => {
      const sessionState$ = new Subject();
      mockSDK.getDeviceSessionState.mockReturnValue(sessionState$);

      await bridge.updateSessionId('session-1');

      const emitted: { connected: boolean }[] = [];
      bridge.onSessionStateChange.subscribe({
        next: (state) => emitted.push(state),
        error: () => undefined,
        complete: () => undefined,
      });

      sessionState$.next({ deviceStatus: DeviceStatus.CONNECTED });
      sessionState$.complete();

      expect(emitted).toContainEqual({ connected: false });
    });

    it('filters duplicate state changes', async () => {
      const sessionState$ = new Subject();
      mockSDK.getDeviceSessionState.mockReturnValue(sessionState$);

      await bridge.updateSessionId('session-1');

      const emitted: { connected: boolean }[] = [];
      bridge.onSessionStateChange.subscribe({
        next: (state) => emitted.push(state),
        error: () => undefined,
        complete: () => undefined,
      });

      sessionState$.next({ deviceStatus: DeviceStatus.CONNECTED });
      sessionState$.next({ deviceStatus: DeviceStatus.CONNECTED });

      expect(emitted).toStrictEqual([{ connected: true }]);
    });
  });
});

function createMockDeviceExchangeError<TErrorCode = string>(
  errorCode: TErrorCode,
): DeviceExchangeError<TErrorCode> {
  return {
    _tag: 'EthAppCommandError',
    message: `DMK error: ${String(errorCode)}`,
    errorCode,
    originalError: undefined,
  } as unknown as DeviceExchangeError<TErrorCode>;
}
