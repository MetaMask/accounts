import type {
  BlindSigningReportParams,
  ContextModule,
} from '@ledgerhq/context-module';
import type { DeviceManagementKit } from '@ledgerhq/device-management-kit';
import { SignerEthBuilder } from '@ledgerhq/device-signer-kit-ethereum';
import { of } from 'rxjs';

import { LedgerDmkTransportMiddleware } from './ledger-dmk-transport-middleware';

describe('LedgerDmkTransportMiddleware', () => {
  const mockDiscovery = of({ id: 'device-id' });
  const mockSigner = { signer: true };

  let middleware: LedgerDmkTransportMiddleware;
  let buildSpy: jest.SpyInstance;
  let mockSDK: {
    connect: jest.Mock;
    disconnect: jest.Mock;
    startDiscovering: jest.Mock;
  };

  beforeEach(() => {
    buildSpy = jest
      .spyOn(SignerEthBuilder.prototype, 'build')
      .mockReturnValue(
        mockSigner as unknown as ReturnType<SignerEthBuilder['build']>,
      );
    mockSDK = {
      connect: jest.fn().mockResolvedValue('test-session-id'),
      disconnect: jest.fn().mockResolvedValue(undefined),
      startDiscovering: jest.fn().mockReturnValue(mockDiscovery),
    };

    middleware = new LedgerDmkTransportMiddleware(
      mockSDK as unknown as DeviceManagementKit,
    );
  });

  describe('startDiscovering', () => {
    it('delegates discovery to the SDK', () => {
      const result = middleware.startDiscovering({});

      expect(mockSDK.startDiscovering).toHaveBeenCalledWith({});
      expect(result).toBe(mockDiscovery);
    });
  });

  describe('connect', () => {
    it('connects with the SDK and stores the session ID', async () => {
      const params = {
        device: { id: 'device-id' },
      } as unknown as Parameters<DeviceManagementKit['connect']>[0];

      const sessionId = await middleware.connect(params);

      expect(mockSDK.connect).toHaveBeenCalledWith(params);
      expect(sessionId).toBe('test-session-id');
      expect(middleware.getSessionId()).toBe('test-session-id');
    });

    it('disconnects the previous session when reconnecting', async () => {
      const params = {
        device: { id: 'device-id' },
      } as unknown as Parameters<DeviceManagementKit['connect']>[0];

      await middleware.connect(params);
      mockSDK.connect.mockResolvedValueOnce('new-session-id');

      const sessionId = await middleware.connect(params);

      expect(mockSDK.disconnect).toHaveBeenCalledWith({
        sessionId: 'test-session-id',
      });
      expect(sessionId).toBe('new-session-id');
      expect(middleware.getSessionId()).toBe('new-session-id');
    });

    it('does not disconnect a host-assigned session when reconnecting after setSessionId', async () => {
      const params = {
        device: { id: 'device-id' },
      } as unknown as Parameters<DeviceManagementKit['connect']>[0];

      await middleware.setSessionId('host-session-id');
      mockSDK.connect.mockResolvedValueOnce('new-session-id');

      const sessionId = await middleware.connect(params);

      expect(mockSDK.disconnect).not.toHaveBeenCalled();
      expect(sessionId).toBe('new-session-id');
      expect(middleware.getSessionId()).toBe('new-session-id');
    });
  });

  describe('getSessionId', () => {
    it('throws when called before connect or setSessionId', () => {
      expect(() => middleware.getSessionId()).toThrow(
        'Session ID not set. Call connect() or setSessionId() first.',
      );
    });
  });

  describe('getEthSigner', () => {
    it('builds a signer using the current session ID', async () => {
      await middleware.connect({
        device: { id: 'device-id' },
      } as unknown as Parameters<DeviceManagementKit['connect']>[0]);

      const signer = middleware.getEthSigner();

      expect(buildSpy).toHaveBeenCalledTimes(1);
      expect(signer).toBe(mockSigner);
    });

    it('memoizes the signer across calls for the same session', async () => {
      await middleware.connect({
        device: { id: 'device-id' },
      } as unknown as Parameters<DeviceManagementKit['connect']>[0]);

      const first = middleware.getEthSigner();
      const second = middleware.getEthSigner();

      expect(first).toBe(second);
      expect(buildSpy).toHaveBeenCalledTimes(1);
    });

    it('rebuilds the signer when the session ID changes', async () => {
      await middleware.connect({
        device: { id: 'device-id' },
      } as unknown as Parameters<DeviceManagementKit['connect']>[0]);
      middleware.getEthSigner();

      await middleware.setSessionId('other-session-id');
      middleware.getEthSigner();

      expect(buildSpy).toHaveBeenCalledTimes(2);
    });

    it('passes a custom context module to the signer builder', async () => {
      const contextModule = {
        getContexts: jest.fn(),
        getFieldContext: jest.fn(),
        getTypedDataFilters: jest.fn(),
        report: jest.fn(),
      } as unknown as ContextModule;
      const withContextModuleSpy = jest.spyOn(
        SignerEthBuilder.prototype,
        'withContextModule',
      );
      const customMiddleware = new LedgerDmkTransportMiddleware(
        mockSDK as unknown as DeviceManagementKit,
        contextModule,
      );
      await customMiddleware.setSessionId('session-id');

      customMiddleware.getEthSigner();

      expect(withContextModuleSpy).toHaveBeenCalledWith(contextModule);
    });

    it('uses the default context module when none is provided', async () => {
      const withContextModuleSpy = jest.spyOn(
        SignerEthBuilder.prototype,
        'withContextModule',
      );
      await middleware.setSessionId('session-id');

      middleware.getEthSigner();

      const contextModule = withContextModuleSpy.mock.calls[0]?.[0];
      expect(contextModule).toBeDefined();
      expect(
        await contextModule?.report({} as BlindSigningReportParams),
      ).toBeUndefined();
    });
  });

  describe('setSessionId', () => {
    it('releases a connect()-created session when replaced by a host session id', async () => {
      await middleware.connect({
        device: { id: 'device-id' },
      } as unknown as Parameters<DeviceManagementKit['connect']>[0]);

      await middleware.setSessionId('other-session-id');

      expect(mockSDK.disconnect).toHaveBeenCalledWith({
        sessionId: 'test-session-id',
      });
      expect(middleware.getSessionId()).toBe('other-session-id');
    });

    it('does not disconnect when the session ID is unchanged', async () => {
      await middleware.connect({
        device: { id: 'device-id' },
      } as unknown as Parameters<DeviceManagementKit['connect']>[0]);

      await middleware.setSessionId('test-session-id');

      expect(mockSDK.disconnect).not.toHaveBeenCalled();
    });

    it('does not disconnect host-assigned sessions when switching session ids', async () => {
      await middleware.setSessionId('first-session-id');

      await middleware.setSessionId('second-session-id');

      expect(mockSDK.disconnect).not.toHaveBeenCalled();
      expect(middleware.getSessionId()).toBe('second-session-id');
    });
  });

  describe('clearSession', () => {
    it('clears the session ID and signer cache without disconnecting', async () => {
      await middleware.connect({
        device: { id: 'device-id' },
      } as unknown as Parameters<DeviceManagementKit['connect']>[0]);
      middleware.getEthSigner();

      middleware.clearSession();

      expect(mockSDK.disconnect).not.toHaveBeenCalled();
      expect(() => middleware.getSessionId()).toThrow(
        'Session ID not set. Call connect() or setSessionId() first.',
      );
    });

    it('rebuilds the signer after clearSession and reconnect', async () => {
      await middleware.connect({
        device: { id: 'device-id' },
      } as unknown as Parameters<DeviceManagementKit['connect']>[0]);
      middleware.getEthSigner();

      middleware.clearSession();
      await middleware.setSessionId('other-session-id');
      middleware.getEthSigner();

      expect(buildSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('dispose', () => {
    it('disconnects the current session and clears it', async () => {
      await middleware.connect({
        device: { id: 'device-id' },
      } as unknown as Parameters<DeviceManagementKit['connect']>[0]);

      await middleware.dispose();

      expect(mockSDK.disconnect).toHaveBeenCalledWith({
        sessionId: 'test-session-id',
      });
      expect(() => middleware.getSessionId()).toThrow(
        'Session ID not set. Call connect() or setSessionId() first.',
      );
    });

    it('does nothing and does not throw when no session has been set', async () => {
      await middleware.dispose();
      expect(mockSDK.disconnect).not.toHaveBeenCalled();
    });

    it('disconnects a host-assigned session when no managed session exists', async () => {
      await middleware.setSessionId('host-session-id');

      await middleware.dispose();

      expect(mockSDK.disconnect).toHaveBeenCalledWith({
        sessionId: 'host-session-id',
      });
    });
  });
});
