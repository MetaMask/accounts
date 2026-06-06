import type { DeviceManagementKit } from '@ledgerhq/device-management-kit';
import { SignerEthBuilder } from '@ledgerhq/device-signer-kit-ethereum';
import { of } from 'rxjs';

import { LedgerDMKTransportMiddleware } from './ledger-dmk-transport-middleware';

describe('LedgerDMKTransportMiddleware', () => {
  const mockDiscovery = of({ id: 'device-id' });
  const mockSigner = { signer: true };

  let middleware: LedgerDMKTransportMiddleware;
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

    middleware = new LedgerDMKTransportMiddleware(
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

      middleware.setSessionId('other-session-id');
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
  });
});
