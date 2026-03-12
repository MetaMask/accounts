import type { DeviceManagementKit } from '@ledgerhq/device-management-kit';
import { SignerEthBuilder } from '@ledgerhq/device-signer-kit-ethereum';
import { of } from 'rxjs';

import { LedgerMobileDMKTransportMiddleware } from './ledger-dmk-transport-middleware';

describe('LedgerMobileDMKTransportMiddleware', () => {
  const mockDiscovery = of({ id: 'device-id' });
  const mockSigner = { signer: true };

  let middleware: LedgerMobileDMKTransportMiddleware;
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

    middleware = new LedgerMobileDMKTransportMiddleware(
      mockSDK as unknown as DeviceManagementKit,
    );
  });

  describe('getSDK', () => {
    it('returns the wrapped SDK instance', () => {
      expect(middleware.getSDK()).toBe(mockSDK);
    });
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
        'Instance `sessionId` is not initialized.',
      );
    });
  });
});
