import type { WebSocket as WsWebSocket } from 'ws';
import { WebSocket as WsWebSocketClass } from 'ws';

import { ApduBridge } from './apdu-bridge';
import { SpeculosClient } from './client';
import * as ledgerHidFraming from './ledger-hid-framing';
import type { LedgerHidFramingSession } from './ledger-hid-framing';

// Capture every WebSocketServer instance created by the module under test so
// tests can emit server events directly. The real implementation is preserved.
jest.mock('ws', () => {
  const actual = jest.requireActual('ws');
  const instances: unknown[] = [];
  class CapturingWebSocketServer extends actual.WebSocketServer {
    constructor(...args: ConstructorParameters<typeof actual.WebSocketServer>) {
      super(...args);
      instances.push(this);
    }
  }
  return {
    ...actual,
    WebSocketServer: CapturingWebSocketServer,
    __testInstances: instances,
  };
});

/** The subset of a WebSocketServer used by the tests. */
type CapturedWsServer = {
  address: () => { port: number } | string | null;
  emit: (event: string | symbol, ...args: unknown[]) => boolean;
};

/**
 * Create a mock WebSocket connection.
 *
 * @returns The mock WebSocket.
 */
function createMockWebSocket(): WsWebSocket {
  return { send: jest.fn() } as unknown as WsWebSocket;
}

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

    it('rejects start when the port is already in use', async () => {
      const firstBridge = new ApduBridge(new SpeculosClient(), 0);
      await firstBridge.start();

      const firstAddress = getCapturedServers().at(-1)?.address();
      const port =
        firstAddress && typeof firstAddress === 'object'
          ? firstAddress.port
          : 0;

      const secondBridge = new ApduBridge(new SpeculosClient(), port);
      await expect(secondBridge.start()).rejects.toThrow('EADDRINUSE');

      await firstBridge.stop();
      // The failed bridge cleaned up its reference, so stop is a no-op.
      await secondBridge.stop();
    });

    it('routes post-listening server errors to console.error instead of the settled start promise', async () => {
      const bridge = new ApduBridge(new SpeculosClient(), 0);
      const logSpy = jest
        .spyOn(console, 'log')
        .mockImplementation(() => undefined);
      await bridge.start();
      const server = getCapturedServers().at(-1);
      expect(server).toBeDefined();

      const errorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      try {
        server?.emit('error', new Error('late server failure'));
        expect(errorSpy).toHaveBeenCalledWith(
          expect.stringContaining('late server failure'),
        );
      } finally {
        errorSpy.mockRestore();
        logSpy.mockRestore();
        await bridge.stop();
      }
    });

    it('replies with an error for non-JSON messages', async () => {
      const bridge = new ApduBridge(new SpeculosClient(), 0);
      await bridge.start();
      const address = getCapturedServers().at(-1)?.address();
      const port = address && typeof address === 'object' ? address.port : 0;
      expect(port).not.toBe(0);

      const ws = new WsWebSocketClass(`ws://127.0.0.1:${port}`);
      const received = new Promise<string>((resolve) => {
        ws.on('message', (data: Buffer) => {
          resolve(data.toString());
        });
      });
      ws.on('open', () => {
        ws.send('this is not json');
      });

      const message = await received;
      expect(message).toContain('APDU_ERROR');
      expect(message).toContain('Invalid JSON message');

      ws.close();
      await bridge.stop();
    });
  });

  describe('injectNextErrorResponse', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('does not throw', () => {
      const client = new SpeculosClient();
      const bridge = new ApduBridge(client, 9878);
      expect(() => bridge.injectNextErrorResponse(0x6d00)).not.toThrow();
    });

    it('applies the injected error to the next exchange by default', async () => {
      const { bridge, exchangeMock, encodeMock } = setupHandleHidSendTest([
        Buffer.from([0xe0, 0x02, 0x00, 0x00, 0x00]),
      ]);

      bridge.injectNextErrorResponse(0x6982);
      await bridge.handleHidSend(createMockWebSocket(), { id: 1, data: [] });

      expect(exchangeMock).toHaveBeenCalledTimes(1);
      expect(encodeMock.mock.calls[0]?.[1]).toStrictEqual(
        Buffer.from([0x69, 0x82]),
      );
    });

    it('keeps the injection queued until an APDU matches the matcher', async () => {
      const { bridge, exchangeMock, encodeMock } = setupHandleHidSendTest([
        Buffer.from([0xe0, 0x02, 0x00, 0x00, 0x00]),
        Buffer.from([0xe0, 0x08, 0x00, 0x00, 0x00]),
      ]);

      bridge.injectNextErrorResponse(0x6d00, (apdu) => apdu[1] === 0x08);

      // Non-matching exchange: real response passes through.
      await bridge.handleHidSend(createMockWebSocket(), { id: 1, data: [] });
      expect(encodeMock.mock.calls[0]?.[1]).toStrictEqual(
        Buffer.from([0x41, 0x42, 0x90, 0x00]),
      );

      // Matching exchange: injected error replaces the response.
      await bridge.handleHidSend(createMockWebSocket(), { id: 2, data: [] });
      expect(exchangeMock).toHaveBeenCalledTimes(2);
      expect(encodeMock.mock.calls[1]?.[1]).toStrictEqual(
        Buffer.from([0x6d, 0x00]),
      );
    });
  });

  describe('parseTxPayloadLength RLP prefix ranges', () => {
    const bridge = new ApduBridge(new SpeculosClient(), 0);

    /**
     * Build a first sign-transaction chunk payload with one derivation path.
     *
     * @param rlp - The RLP-encoded transaction bytes.
     * @returns The chunk payload (path count + path + RLP data).
     */
    const makeFirstChunk = (rlp: number[]): Buffer =>
      Buffer.from([1, 0xde, 0xad, 0xbe, 0xef, ...rlp]);

    it('treats a single-byte RLP value (0x00) as a 1-byte payload', () => {
      expect(bridge.parseTxPayloadLength(makeFirstChunk([0x00]))).toBe(6);
    });

    it('treats a single-byte RLP value (0x7f) as a 1-byte payload', () => {
      expect(bridge.parseTxPayloadLength(makeFirstChunk([0x7f]))).toBe(6);
    });

    it('does not skip into the next byte for single-byte values', () => {
      // With the old bug, 0x7f skipped the prefix and decoded the following
      // 0x01 as another single-byte value, overcounting by one.
      expect(bridge.parseTxPayloadLength(makeFirstChunk([0x7f, 0x01]))).toBe(6);
    });

    it('parses short string prefixes (0x80–0xb7)', () => {
      // Empty string: header 0x80, length 0 → 4 (path) + 1 + 1 + 0.
      expect(bridge.parseTxPayloadLength(makeFirstChunk([0x80]))).toBe(6);
      // 0xb7: header 1 byte, payload 55 bytes.
      expect(
        bridge.parseTxPayloadLength(makeFirstChunk([0xb7, ...filler(55)])),
      ).toBe(61);
    });

    it('parses long string prefixes (0xb8+)', () => {
      // 0xb8 with 1-byte length: header 2 bytes, payload 1 byte.
      expect(
        bridge.parseTxPayloadLength(makeFirstChunk([0xb8, 0x01, 0xaa])),
      ).toBe(8);
      // 0xb8 with 1-byte length 0xff: header 2 bytes, payload 255 bytes.
      expect(
        bridge.parseTxPayloadLength(
          makeFirstChunk([0xb8, 0xff, ...filler(255)]),
        ),
      ).toBe(262);
    });

    it('parses short list prefixes (0xc0–0xf7)', () => {
      // Empty list: header 0xc0, length 0.
      expect(bridge.parseTxPayloadLength(makeFirstChunk([0xc0]))).toBe(6);
      // 0xf7: header 1 byte, payload 55 bytes (0xf7 - 0xc0).
      expect(
        bridge.parseTxPayloadLength(makeFirstChunk([0xf7, ...filler(55)])),
      ).toBe(61);
    });

    it('parses long list prefixes (0xf8+)', () => {
      // 0xf8 with 1-byte length 0x64: header 2 bytes, payload 100 bytes.
      expect(
        bridge.parseTxPayloadLength(
          makeFirstChunk([0xf8, 0x64, ...filler(100)]),
        ),
      ).toBe(107);
    });

    it('returns null for incomplete length-of-length data', () => {
      // 0xf8 requires a length byte that is missing here.
      expect(bridge.parseTxPayloadLength(makeFirstChunk([0xf8]))).toBeNull();
    });
  });

  describe('handleHidSend per-connection sign-tx progress', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('tracks sign-transaction progress per WebSocket connection', async () => {
      const { bridge, exchangeMock } = setupHandleHidSendTest(
        [
          // ws1: first chunk with a 103-byte payload total (0xf8 0x64), 50 sent.
          makeSignTxChunk(0x00, 50, [0x00, 0xf8, 0x64]),
          // ws2: first chunk with a 203-byte payload total (0xf8 0xc8), 60 sent.
          makeSignTxChunk(0x00, 60, [0x00, 0xf8, 0xc8]),
          // ws1: continuation of 30 bytes (sent becomes 80).
          makeSignTxChunk(0x80, 30, []),
          // ws1: continuation of 25 bytes (sent becomes 105 >= 103 → last chunk).
          makeSignTxChunk(0x80, 25, []),
        ],

        Buffer.from([0x90, 0x00]),
      );

      const ws1 = createMockWebSocket();
      const ws2 = createMockWebSocket();

      await bridge.handleHidSend(ws1, { id: 1, data: [] });
      await bridge.handleHidSend(ws2, { id: 2, data: [] });
      await bridge.handleHidSend(ws1, { id: 3, data: [] });
      await bridge.handleHidSend(ws1, { id: 4, data: [] });

      // With per-connection state, ws1's last chunk completes its own 103-byte
      // payload and triggers the final empty-chunk acknowledgement exchange.
      expect(exchangeMock).toHaveBeenCalledTimes(5);

      expect(exchangeMock).toHaveBeenLastCalledWith(
        Buffer.from([0xe0, 0x04, 0x80, 0x00, 0x00]),
      );
    });
  });

  describe('handleHidSend signing-ready timer', () => {
    const signTxContinuation = Buffer.from([
      0xe0, 0x04, 0x80, 0x00, 0x01, 0x00,
    ]);
    const personalSignApdu = Buffer.from([0xe0, 0x08, 0x00, 0x00, 0x00]);

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

/**
 * Get the WebSocketServer instances captured by the ws module mock.
 *
 * @returns The captured server instances.
 */
function getCapturedServers(): CapturedWsServer[] {
  return jest.requireMock('ws').__testInstances;
}

/**
 * Produce a filler byte array.
 *
 * @param length - Number of bytes.
 * @returns An array of filler bytes.
 */
function filler(length: number): number[] {
  return Array.from({ length }, () => 0xab);
}

/**
 * Build a sign-transaction APDU chunk.
 *
 * @param p2 - 0x00 for a first chunk, 0x80 for a continuation.
 * @param dataLen - Payload length in bytes.
 * @param prefix - Leading payload bytes (path count + RLP prefix).
 * @returns The APDU buffer.
 */
function makeSignTxChunk(
  p2: number,
  dataLen: number,
  prefix: number[],
): Buffer {
  const payload = Buffer.concat([
    Buffer.from(prefix),
    Buffer.from(filler(Math.max(0, dataLen - prefix.length))),
  ]);
  if (payload.length !== dataLen) {
    throw new Error('invalid test chunk construction');
  }
  return Buffer.from([
    0xe0,
    0x04,
    p2,
    Math.floor(dataLen / 256),
    dataLen % 256,
    ...payload,
  ]);
}

/**
 * Set up a handleHidSend test with mocked framing and client exchange.
 *
 * @param apdus - The APDUs returned by pushLedgerHidFrame, in order.
 * @param exchangeResponse - The response returned by the client exchange mock.
 * @returns The bridge, the exchange mock, and the encode mock.
 */
function setupHandleHidSendTest(
  apdus: Buffer[],
  exchangeResponse: Buffer = Buffer.from([0x41, 0x42, 0x90, 0x00]),
): {
  bridge: ApduBridge;
  exchangeMock: jest.SpyInstance<Promise<Buffer>, [Buffer]>;
  encodeMock: jest.SpyInstance<Buffer[], [LedgerHidFramingSession, Buffer]>;
} {
  const client = new SpeculosClient();
  const bridge = new ApduBridge(client, 0);

  const pushMock = jest.spyOn(ledgerHidFraming, 'pushLedgerHidFrame');
  for (const apdu of apdus) {
    pushMock.mockReturnValueOnce(apdu);
  }
  jest
    .spyOn(ledgerHidFraming, 'createLedgerHidFramingSession')
    .mockReturnValue({
      channel: 0,
      framing: {} as never,
      acc: null,
    });
  const encodeMock = jest
    .spyOn(ledgerHidFraming, 'encodeLedgerHidResponse')
    .mockReturnValue([Buffer.alloc(1)]);
  const exchangeMock = jest
    .spyOn(client, 'exchange')
    .mockResolvedValue(exchangeResponse);

  return { bridge, exchangeMock, encodeMock };
}
