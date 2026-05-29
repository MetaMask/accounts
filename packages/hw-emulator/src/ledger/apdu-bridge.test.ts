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
    const signTxContinuation = Buffer.from([
      0xe0, 0x04, 0x80, 0x00, 0x01, 0x00,
    ]);
    const personalSignApdu = Buffer.from([0xe0, 0x08, 0x00, 0x00, 0x00]);

    function createMockWebSocket(): WsWebSocket {
      return { send: jest.fn() } as unknown as WsWebSocket;
    }

    beforeEach(() => {
      jest.useFakeTimers();
      jest
        .spyOn(ledgerHidFraming, 'createLedgerHidFramingSession')
        .mockReturnValue({
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
      // eslint-disable-next-line no-void, promise/always-return
      void bridge.waitForSigningReady(10_000).then(() => {
        readyResolved = true;
      });

      // eslint-disable-next-line no-void
      void bridge.handleHidSend(ws, { id: 1, data: [] });
      // eslint-disable-next-line no-void
      void bridge.handleHidSend(ws, { id: 2, data: [] });

      await jest.advanceTimersByTimeAsync(500);
      await Promise.resolve();

      expect(readyResolved).toBe(false);
    });

    it('exchanges each queued signing APDU with Speculos individually', async () => {
      const client = new SpeculosClient();
      const bridge = new ApduBridge(client, 9880);
      const ws = createMockWebSocket();

      const firstResponse = Buffer.from([0x90, 0x00]);
      const secondResponse = Buffer.from([0x41, 0x42, 0x90, 0x00]);

      let resolveFirst!: (response: Buffer) => void;
      const blockedFirst = new Promise<Buffer>((resolve) => {
        resolveFirst = resolve;
      });

      const exchangeMock = jest
        .spyOn(client, 'exchange')
        .mockReturnValueOnce(blockedFirst)
        .mockResolvedValueOnce(secondResponse);

      jest
        .spyOn(ledgerHidFraming, 'pushLedgerHidFrame')
        .mockReturnValueOnce(signTxContinuation)
        .mockReturnValueOnce(personalSignApdu);

      const firstSend = bridge.handleHidSend(ws, { id: 1, data: [] });
      const secondSend = bridge.handleHidSend(ws, { id: 2, data: [] });

      resolveFirst(firstResponse);

      await Promise.all([firstSend, secondSend]);

      expect(exchangeMock).toHaveBeenCalledTimes(2);
      expect(exchangeMock).toHaveBeenNthCalledWith(1, signTxContinuation);
      expect(exchangeMock).toHaveBeenNthCalledWith(2, personalSignApdu);
    });
  });
});
