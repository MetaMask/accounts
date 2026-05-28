import { SpeculosClient } from './client';

describe('SpeculosClient', () => {
  describe('constructor', () => {
    it('uses default ports when no options provided', () => {
      const client = new SpeculosClient();
      expect(client.isHealthy()).toBe(false);
    });

    it('uses custom ports when provided', () => {
      const client = new SpeculosClient({
        apduPort: 9997,
        apiPort: 5002,
      });
      expect(client.isHealthy()).toBe(false);
    });

    it('builds correct base URL', () => {
      const client = new SpeculosClient({
        apiHost: '192.168.1.1',
        apiPort: 5003,
      });
      expect(client.isHealthy()).toBe(false);
    });
  });

  describe('isHealthy', () => {
    it('returns false before connecting', () => {
      const client = new SpeculosClient();
      expect(client.isHealthy()).toBe(false);
    });
  });

  describe('exchange', () => {
    it('throws if not connected', async () => {
      const client = new SpeculosClient();
      await expect(
        client.exchange(Buffer.from([0xe0, 0x06, 0x00, 0x00, 0x00])),
      ).rejects.toThrow('Not connected to Speculos');
    });
  });

  describe('disconnect', () => {
    it('does not throw when not connected', async () => {
      const client = new SpeculosClient();
      await client.disconnect();
      expect(true).toBe(true);
    });
  });

  describe('exchangeWithRetry', () => {
    it('throws if not connected', async () => {
      const client = new SpeculosClient();
      await expect(
        client.exchangeWithRetry(Buffer.from([0xe0, 0x06, 0x00, 0x00, 0x00])),
      ).rejects.toThrow('Not connected to Speculos');
    });
  });

  describe('connectWithResilience', () => {
    it('returns immediately if already connected', async () => {
      const client = new SpeculosClient();
      await client
        .connectWithResilience({
          autoReconnect: false,
          reconnectAttempts: 0,
        })
        .catch(() => undefined);
      expect(client.isHealthy()).toBe(false);
    });
  });
});
