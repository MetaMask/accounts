import type { WebSocket as WsWebSocket } from 'ws';
import { ApduBridge } from './apdu-bridge';
import { SpeculosClient } from './client';
import * as ledgerHidFraming from './ledger-hid-framing';

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
      await bridge.stop();
      expect(true).toBe(true);
    });
  });

  describe('injectNextErrorResponse', () => {
    it('does not throw', () => {
      const client = new SpeculosClient();
      const bridge = new ApduBridge(client, 9878);
      expect(() => bridge.injectNextErrorResponse(0x6d00)).not.toThrow();
    });
  });

  describe('handleHidSend signing-ready timer', () => {
    const signTxContinuation = Buffer.from([0xe0, 0x04, 0x80, 0x00, 0x01, 0x00]);
    const personalSignApdu = Buffer.from([0xe0, 0x08, 0x00, 0x00, 0x00]);

    function createMockWebSocket(): WsWebSocket {
      return { send: jest.fn() } as unknown as WsWebSocket;
    }

    beforeEach(() => {
      jest.useFakeTimers();
      jest.spyOn(ledgerHidFraming, 'createLedgerHidFramingSession').mockReturnValue({
        channel: 0,
        framing: {} as never,
        acc: null,
      });
      jest
        .spyOn(ledgerHidFraming, 'encodeLedgerHidResponse')
        .mockReturnValue([Buffer.alloc(1)]);
    });

    afterEach(() => {
      jest.restoreAllMocks();
      jest.useRealTimers();
    });

    it('does not emit signing-ready from a fallback timer on queued signing APDUs', async () => {
      const client = new SpeculosClient();
      const bridge = new ApduBridge(client, 9879);
      const ws = createMockWebSocket();

      const blockedExchange = new Promise<Buffer>(() => undefined);
      jest.spyOn(client, 'exchange').mockReturnValue(blockedExchange);

      jest
        .spyOn(ledgerHidFraming, 'pushLedgerHidFrame')
        .mockReturnValueOnce(signTxContinuation)
        .mockReturnValueOnce(personalSignApdu);

      let readyResolved = false;
      void bridge.waitForSigningReady(10_000).then(() => {
        readyResolved = true;
      });

      void bridge.handleHidSend(ws, { id: 1, data: [] });
      void bridge.handleHidSend(ws, { id: 2, data: [] });

      await jest.advanceTimersByTimeAsync(500);
      await Promise.resolve();

      expect(readyResolved).toBe(false);
    });
  });
});
