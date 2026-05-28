import { ApduBridge } from './apdu-bridge';
import { SpeculosClient } from './client';

describe('ApduBridge', () => {
  describe('constructor', () => {
    it('creates an instance with client and port', () => {
      const client = new SpeculosClient();
      const bridge = new ApduBridge(client, 9876);
      expect(bridge.getPort()).toBe(9876);
    });

    it('returns the client', () => {
      const client = new SpeculosClient();
      const bridge = new ApduBridge(client, 9876);
      expect(bridge.getClient()).toBe(client);
    });
  });

  describe('start and stop', () => {
    it('starts and stops the WebSocket server', async () => {
      const client = new SpeculosClient();
      const bridge = new ApduBridge(client, 0);
      await bridge.start();
      expect(bridge.getPort()).toBe(0);
      await bridge.stop();
    });

    it('stop resolves when not started', async () => {
      const client = new SpeculosClient();
      const bridge = new ApduBridge(client, 9877);
      await expect(bridge.stop()).resolves.toBeUndefined();
    });
  });

  describe('injectNextErrorResponse', () => {
    it('does not throw', () => {
      const client = new SpeculosClient();
      const bridge = new ApduBridge(client, 9878);
      expect(() => bridge.injectNextErrorResponse(0x6d00)).not.toThrow();
    });
  });
});
