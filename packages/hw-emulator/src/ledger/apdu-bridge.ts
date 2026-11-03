// eslint-disable-next-line import-x/no-nodejs-modules
import { EventEmitter } from 'node:events';
import { WebSocketServer } from 'ws';
import type { WebSocket as WsWebSocket } from 'ws';

import { SpeculosClient } from './client';
import type { DeviceInteraction } from './device-interaction';
import {
  createLedgerHidFramingSession,
  encodeLedgerHidResponse,
  pushLedgerHidFrame,
} from './ledger-hid-framing';
import type { LedgerHidFramingSession } from './ledger-hid-framing';

/** Ledger application class byte shared by all Ethereum app APDUs. */
const LEDGER_CLA = 0xe0;

/** Ethereum app instruction byte for GET_APP_CONFIGURATION. */
const INS_GET_APP_CONFIGURATION = 0x06;

/** Ethereum app instruction byte for signing a transaction. */
const INS_SIGN_TRANSACTION = 0x04;

/** Ethereum app instruction byte for signing a personal message. */
const INS_SIGN_PERSONAL_MESSAGE = 0x08;

/** Ethereum app instruction byte for the v2 message-signing flow. */
const INS_SIGN_MESSAGE_V2 = 0x1a;

/** Ethereum app instruction byte for typed-data (EIP-712) signing. */
const INS_SIGN_TYPED_DATA = 0x20;

/** Ethereum app instruction byte for the v2 typed-data signing flow. */
const INS_SIGN_TYPED_DATA_V2 = 0x22;

/** P1 byte marking the first chunk of a multi-chunk signing APDU. */
const P1_FIRST_CHUNK = 0x00;

/** P1 byte marking a continuation chunk of a multi-chunk signing APDU. */
const P1_CONTINUATION_CHUNK = 0x80;

/** APDU header size in bytes: CLA, INS, P1, P2 and the payload length. */
const APDU_HEADER_LENGTH = 5;

/** SW1/SW2 byte pair spelling the APDU success status word 0x9000. */
const STATUS_WORD_OK_SW1 = 0x90;
/** Second status word byte of the 0x9000 success pair. */
const STATUS_WORD_OK_SW2 = 0x00;

/**
 * Empty continuation APDU sent after the final sign-transaction chunk to
 * collect the signing acknowledgement from the device.
 */
// eslint-disable-next-line no-restricted-globals
const EMPTY_SIGN_TX_CONTINUATION_APDU = Buffer.from([
  LEDGER_CLA,
  INS_SIGN_TRANSACTION,
  P1_CONTINUATION_CHUNK,
  0x00,
  0x00,
]);

/**
 * App-configuration flags byte value with the blind-signing bit (bit 0) set,
 * i.e. the value that marks data (blind) signing as enabled.
 */
const BLIND_SIGNING_FLAGS_ENABLED = 0x01;

/** Delay before signalling that the device is ready for signing input, in milliseconds. */
const SIGNING_READY_DELAY_MS = 500;

/** Delay between observing a signing APDU and approving it on the device screen, in milliseconds. */
const SIGNING_APPROVAL_DELAY_MS = 1500;

/** Grace period before force-closing the WebSocket server, in milliseconds. */
const FORCE_CLOSE_TIMEOUT_MS = 1000;

/**
 * Minimum sign-transaction first-chunk payload: the path-count byte, one
 * 4-byte derivation path component, and at least one RLP byte
 * (1 + (1 × 4) + 1).
 */
const MIN_SIGN_TX_FIRST_CHUNK_DATA_LENGTH = 6;

/**
 * Per-connection state tracking the HID framing session and the
 * sign-transaction upload progress. Progress lives here — not on the bridge
 * instance — so concurrent WebSocket connections cannot corrupt each other's
 * counters.
 */
type WsConnectionState = {
  framingSession: LedgerHidFramingSession | null;
  /** Total RLP payload length expected for the sign-transaction in flight, or null. */
  signTxTotalDataLen: number | null;
  /** Number of payload bytes sent so far for the sign-transaction in flight. */
  signTxDataSent: number;
};

/**
 * Result of decoding an RLP length prefix.
 */
type RlpDecodeResult = {
  /** Number of bytes in the RLP header. */
  headerSize: number;
  /** Decoded payload length. */
  length: number;
};

/**
 * A parsed bridge protocol message. All fields are optional; malformed
 * messages are treated according to which fields are present.
 */
type BridgeMessage = {
  id?: number | undefined;
  type?: string | undefined;
  data?: unknown;
};

/**
 * Predicate constraining which APDU an injected error response applies to.
 */
export type InjectedErrorMatcher = (apdu: Buffer) => boolean;

/**
 * Check whether a value is an array of numbers (APDU/HID frame payloads).
 *
 * @param value - The value to check.
 * @returns True if the value is a number array.
 */
function isNumberArray(value: unknown): value is number[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'number')
  );
}

/**
 * Parse a raw WebSocket message into a bridge protocol message.
 *
 * @param raw - The raw message string.
 * @returns The parsed message, or null if it is not valid JSON.
 */
function parseBridgeMessage(raw: string): BridgeMessage | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) {
    return null;
  }
  const record = parsed as Record<string, unknown>;
  return {
    id: typeof record.id === 'number' ? record.id : undefined,
    type: typeof record.type === 'string' ? record.type : undefined,
    data: record.data,
  };
}

/**
 * WebSocket bridge that relays HID-framed APDUs between browser WebHID mock and Speculos.
 */
export class ApduBridge {
  #wss: WebSocketServer | null = null;

  readonly #client: SpeculosClient;

  readonly #port: number;

  readonly #emitter = new EventEmitter();

  readonly #signingReadyEmitter = new EventEmitter();

  readonly #connectionState = new WeakMap<WsWebSocket, WsConnectionState>();

  #injectedErrorStatusCode: number | null = null;

  #injectedErrorMatcher: InjectedErrorMatcher | null = null;

  #signingLockChain: Promise<void> = Promise.resolve();

  #signingLockDepth = 0;

  /**
   * @param client - The Speculos client for APDU communication.
   * @param port - The port to listen on for WebSocket connections.
   */
  constructor(client: SpeculosClient, port: number) {
    this.#client = client;
    this.#port = port;
    this.#emitter.setMaxListeners(20);
  }

  /**
   * Wait for a signing APDU to be sent to Speculos.
   *
   * @param timeout - Maximum wait time in milliseconds.
   * @returns The signing APDU buffer.
   */
  async waitForSigningApdu(timeout = 30000): Promise<Buffer> {
    let timer: ReturnType<typeof setTimeout>;
    return new Promise((resolve, reject) => {
      const handler = (apdu: Buffer): void => {
        clearTimeout(timer);
        resolve(apdu);
      };
      timer = setTimeout(() => {
        this.#emitter.removeListener('signing-apdu', handler);
        reject(new Error('Timeout waiting for signing APDU'));
      }, timeout);
      this.#emitter.once('signing-apdu', handler);
    });
  }

  /**
   * Wait for a signing APDU and then approve the transaction via device interaction.
   *
   * @param interaction - The device interaction handler.
   * @param timeout - Maximum wait time in milliseconds.
   * @returns The signing APDU buffer.
   */
  async waitForSigningApduAndApprove(
    interaction: DeviceInteraction,
    timeout = 30000,
  ): Promise<Buffer> {
    const apdu = await this.waitForSigningApdu(timeout);
    await new Promise((resolve) =>
      setTimeout(resolve, SIGNING_APPROVAL_DELAY_MS),
    );
    await interaction.approveTransaction();
    return apdu;
  }

  /**
   * Wait for a signing APDU and then approve personal signing.
   *
   * @param interaction - The device interaction handler.
   * @param timeout - Maximum wait time in milliseconds.
   * @returns The signing APDU buffer.
   */
  async waitForSigningApduAndApproveSigning(
    interaction: DeviceInteraction,
    timeout = 30000,
  ): Promise<Buffer> {
    const apdu = await this.waitForSigningApdu(timeout);
    await new Promise((resolve) =>
      setTimeout(resolve, SIGNING_APPROVAL_DELAY_MS),
    );
    await interaction.approveSigning();
    return apdu;
  }

  /**
   * Wait for a signing APDU and then approve blind signing.
   *
   * @param interaction - The device interaction handler.
   * @param timeout - Maximum wait time in milliseconds.
   * @param scrollCount - Number of review screens to scroll through.
   * @returns The signing APDU buffer.
   */
  async waitForSigningApduAndApproveBlindSigning(
    interaction: DeviceInteraction,
    timeout = 30000,
    scrollCount?: number,
  ): Promise<Buffer> {
    const apdu = await this.waitForSigningApdu(timeout);
    await this.waitForSigningReady(timeout);
    await interaction.approveBlindSigning(scrollCount);
    return apdu;
  }

  /**
   * Wait for the Ledger to show the signing review UI.
   *
   * @param timeout - Maximum wait time in milliseconds.
   * @returns A promise that resolves when signing is ready.
   */
  async waitForSigningReady(timeout = 30000): Promise<void> {
    let timer: ReturnType<typeof setTimeout>;
    return new Promise((resolve, reject) => {
      const handler = (): void => {
        clearTimeout(timer);
        resolve();
      };
      timer = setTimeout(() => {
        this.#signingReadyEmitter.removeListener('signing-ready', handler);
        reject(new Error('Timeout waiting for signing ready'));
      }, timeout);
      this.#signingReadyEmitter.once('signing-ready', handler);
    });
  }

  /**
   * Get the underlying SpeculosClient.
   *
   * @returns The client instance.
   */
  getClient(): SpeculosClient {
    return this.#client;
  }

  /**
   * Inject an error status code to return instead of the real response for an
   * upcoming APDU exchange.
   *
   * IMPORTANT: by default the injection is NOT tied to a specific request —
   * it applies to whatever APDU exchange completes next on any WebSocket
   * connection. Pass a `matcher` to constrain which APDU the error applies
   * to; the injection then stays queued until an exchange satisfies the
   * matcher (and is simply never consumed if none ever does).
   *
   * @param statusCode - 16-bit APDU status word to return (e.g. 0x6982).
   * @param matcher - Optional predicate over the APDU buffer; when provided,
   * only an APDU satisfying it consumes the injection.
   */
  injectNextErrorResponse(
    statusCode: number,
    matcher?: InjectedErrorMatcher,
  ): void {
    this.#injectedErrorStatusCode = statusCode;
    this.#injectedErrorMatcher = matcher ?? null;
  }

  /**
   * Create a fresh per-connection state object.
   *
   * @returns The new connection state.
   */
  #createConnectionState(): WsConnectionState {
    return {
      framingSession: null,
      signTxTotalDataLen: null,
      signTxDataSent: 0,
    };
  }

  /**
   * Get (or lazily create) the per-connection state for a WebSocket.
   *
   * @param ws - The WebSocket connection.
   * @returns The connection state.
   */
  #getConnectionState(ws: WsWebSocket): WsConnectionState {
    let state = this.#connectionState.get(ws);
    if (!state) {
      state = this.#createConnectionState();
      this.#connectionState.set(ws, state);
    }
    return state;
  }

  /**
   * Acquire the signing lock so concurrent signing APDUs are serialized.
   *
   * @returns A release function and whether this caller waited behind another signing flow.
   */
  async #acquireSigningLock(): Promise<{
    release: () => void;
    wasQueued: boolean;
  }> {
    const wasQueued = this.#signingLockDepth > 0;
    this.#signingLockDepth += 1;

    let releaseLock!: () => void;
    const previousLock = this.#signingLockChain;
    this.#signingLockChain = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    await previousLock;

    return {
      wasQueued,
      release: (): void => {
        this.#signingLockDepth -= 1;
        releaseLock();
      },
    };
  }

  /**
   * Start the WebSocket server.
   *
   * @returns A promise that resolves when listening.
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wss = new WebSocketServer({ port: this.#port });
      this.#wss = wss;

      wss.on('connection', (ws: WsWebSocket) => {
        this.#connectionState.set(ws, this.#createConnectionState());

        ws.on('message', (data: Buffer): void => {
          this.#handleMessage(ws, data).catch((caughtError: unknown) => {
            const errorMessage =
              caughtError instanceof Error
                ? caughtError.message
                : String(caughtError);
            ws.send(
              JSON.stringify({ type: 'APDU_ERROR', error: errorMessage }),
            );
          });
        });

        ws.on('close', () => {
          this.#connectionState.delete(ws);
        });
      });

      // Startup-only error listener: removed once 'listening' fires. Calling
      // reject() on the already-settled promise afterwards would be a silent
      // no-op and swallow the error, so a persistent handler below logs
      // instead.
      const onStartupError = (serverError: Error): void => {
        wss.removeListener('error', onStartupError);
        this.#wss = null;
        reject(serverError);
      };
      wss.on('error', onStartupError);

      wss.on('listening', () => {
        wss.removeListener('error', onStartupError);
        // Persistent handler for post-startup server errors.
        wss.on('error', (serverError: Error) => {
          console.error(
            `[ApduBridge] Server error on port ${this.#port}: ${serverError.message}`,
          );
        });
        console.log(`[ApduBridge] Server listening on port ${this.#port}`);
        resolve();
      });
    });
  }

  /**
   * Handle a single raw WebSocket message, parsing it exactly once.
   *
   * @param ws - The WebSocket connection the message arrived on.
   * @param data - The raw message payload.
   */
  async #handleMessage(ws: WsWebSocket, data: Buffer): Promise<void> {
    const message = parseBridgeMessage(data.toString());
    if (!message) {
      ws.send(
        JSON.stringify({
          type: 'APDU_ERROR',
          error: 'Invalid JSON message',
        }),
      );
      return;
    }

    if (message.type === 'DEBUG') {
      return;
    }

    try {
      if (message.type === 'HID_SEND') {
        if (!isNumberArray(message.data)) {
          throw new Error('HID_SEND message requires a numeric data array');
        }
        await this.handleHidSend(ws, { id: message.id, data: message.data });
        return;
      }

      // APDU_REQUEST is a direct, unframed APDU pipe: the payload is a whole
      // APDU forwarded straight to Speculos, bypassing the HID framing
      // reassembly and the signing lock used by the HID_SEND path below.
      if (message.type === 'APDU_REQUEST') {
        if (!isNumberArray(message.data)) {
          throw new Error('APDU_REQUEST message requires a numeric data array');
        }
        // eslint-disable-next-line no-restricted-globals
        const apduData = Buffer.from(message.data);
        const response = await this.#client.exchange(apduData);

        ws.send(
          JSON.stringify({
            type: 'APDU_RESPONSE',
            id: message.id,
            data: Array.from(response),
          }),
        );
      }
    } catch (bridgeError: unknown) {
      const errorMessage =
        bridgeError instanceof Error
          ? bridgeError.message
          : String(bridgeError);
      ws.send(
        JSON.stringify({
          type: 'APDU_ERROR',
          id: message.id,
          error: errorMessage,
        }),
      );
    }
  }

  /**
   * Handle an incoming HID_SEND WebSocket message, reassembling HID frames into
   * APDUs, forwarding them to Speculos, and sending the HID-framed response back.
   *
   * @param ws - The WebSocket connection.
   * @param message - The parsed message with raw frame data.
   * @param message.id - Optional message identifier for response correlation.
   * @param message.data - Raw HID frame bytes as a number array.
   */
  async handleHidSend(
    ws: WsWebSocket,
    message: { id?: number | undefined; data: number[] },
  ): Promise<void> {
    // eslint-disable-next-line no-restricted-globals
    const frame = Buffer.from(message.data);
    const state = this.#getConnectionState(ws);

    state.framingSession ??= createLedgerHidFramingSession(frame);

    const apdu = pushLedgerHidFrame(state.framingSession, frame);
    if (!apdu) {
      ws.send(
        JSON.stringify({
          type: 'HID_FRAME_ACK',
          id: message.id,
        }),
      );
      return;
    }

    const isSignTx =
      apdu.length >= 2 &&
      apdu[0] === LEDGER_CLA &&
      apdu[1] === INS_SIGN_TRANSACTION;
    const isSigningIns =
      apdu.length >= 2 &&
      apdu[0] === LEDGER_CLA &&
      (apdu[1] === INS_SIGN_TRANSACTION ||
        apdu[1] === INS_SIGN_PERSONAL_MESSAGE ||
        apdu[1] === INS_SIGN_MESSAGE_V2 ||
        apdu[1] === INS_SIGN_TYPED_DATA ||
        apdu[1] === INS_SIGN_TYPED_DATA_V2);

    const isSignTxFirst = isSignTx && apdu[2] === P1_FIRST_CHUNK;
    const isSignTxContinuation = isSignTx && apdu[2] === P1_CONTINUATION_CHUNK;
    const dataLen =
      apdu.length > APDU_HEADER_LENGTH ? apdu.length - APDU_HEADER_LENGTH : 0;

    // Sign-transaction upload progress is tracked per connection so concurrent
    // WebSocket connections cannot corrupt each other's counters.
    if (isSignTxFirst && apdu.length > APDU_HEADER_LENGTH) {
      const totalPayloadLen = this.parseTxPayloadLength(
        apdu.subarray(APDU_HEADER_LENGTH),
      );
      if (totalPayloadLen !== null) {
        state.signTxTotalDataLen = totalPayloadLen;
        state.signTxDataSent = dataLen;
      }
    } else if (isSignTxContinuation) {
      state.signTxDataSent += dataLen;
    }

    const isSigningFirstChunk = isSigningIns && apdu[2] === P1_FIRST_CHUNK;
    const isOtherSigning = isSigningIns && apdu[1] !== INS_SIGN_TRANSACTION;

    if (isSigningFirstChunk || isOtherSigning) {
      this.#emitter.emit('signing-apdu', apdu);
    }

    const isLastSignTxChunk =
      isSignTxContinuation &&
      state.signTxTotalDataLen !== null &&
      state.signTxDataSent >= state.signTxTotalDataLen;
    const isSingleChunkSignTx =
      isSignTxFirst &&
      state.signTxTotalDataLen !== null &&
      state.signTxDataSent >= state.signTxTotalDataLen;
    const shouldStartSigningTimer =
      isSigningIns && (!isSignTx || isLastSignTxChunk || isSingleChunkSignTx);

    const signingLock = isSigningIns ? await this.#acquireSigningLock() : null;
    const wasQueuedSigning = signingLock?.wasQueued ?? false;

    let signingReadyFired = false;
    const signingReadyTimer =
      shouldStartSigningTimer && !wasQueuedSigning
        ? setTimeout(() => {
            signingReadyFired = true;
            this.#signingReadyEmitter.emit('signing-ready');
          }, SIGNING_READY_DELAY_MS)
        : null;
    const shouldEmitSigningReadyOnLastChunk =
      (isLastSignTxChunk || isSingleChunkSignTx) && !signingReadyFired;

    let response: Buffer;

    try {
      response = await this.#client.exchange(apdu);

      if (signingReadyTimer) {
        clearTimeout(signingReadyTimer);
      }

      if (shouldEmitSigningReadyOnLastChunk && !signingReadyFired) {
        signingReadyFired = true;
        this.#signingReadyEmitter.emit('signing-ready');
      }

      const isLastChunkWithAck =
        (isSignTxContinuation || isSingleChunkSignTx) &&
        state.signTxTotalDataLen !== null &&
        state.signTxDataSent >= state.signTxTotalDataLen &&
        response.length === 2 &&
        response[0] === STATUS_WORD_OK_SW1 &&
        response[1] === STATUS_WORD_OK_SW2;

      if (isLastChunkWithAck) {
        const readyTimer = setTimeout(() => {
          signingReadyFired = true;
          this.#signingReadyEmitter.emit('signing-ready');
        }, SIGNING_READY_DELAY_MS);
        response = await this.#client.exchange(EMPTY_SIGN_TX_CONTINUATION_APDU);
        clearTimeout(readyTimer);
        state.signTxTotalDataLen = null;
        state.signTxDataSent = 0;
      } else if (!isSignTx || (isSingleChunkSignTx && response.length > 2)) {
        state.signTxTotalDataLen = null;
        state.signTxDataSent = 0;
      }

      const injectedCode = this.#injectedErrorStatusCode;
      const injectedMatcher = this.#injectedErrorMatcher;
      const injectionMatches =
        injectedCode !== null &&
        (injectedMatcher === null || injectedMatcher(apdu));
      if (injectionMatches) {
        this.#injectedErrorStatusCode = null;
        this.#injectedErrorMatcher = null;
        const sw1 = Math.floor(injectedCode / 256);
        const sw2 = injectedCode % 256;
        // eslint-disable-next-line no-restricted-globals
        response = Buffer.from([sw1, sw2]);
      }

      // GET_APP_CONFIGURATION (INS_GET_APP_CONFIGURATION) response byte 0
      // is the flags byte, where bit 0 reports whether data (blind) signing
      // is enabled (see SpeculosClient#getAppConfiguration, which decodes the
      // same byte). Speculos' canned app-config response can report 0 here,
      // which makes browser clients (e.g. @ledgerhq/hw-app-eth) treat the
      // device as incapable of data signing and abort signing flows. Force
      // the byte to BLIND_SIGNING_FLAGS_ENABLED so WebHID clients routed
      // through this bridge keep working.
      if (
        apdu.length >= 2 &&
        apdu[0] === LEDGER_CLA &&
        apdu[1] === INS_GET_APP_CONFIGURATION &&
        response.length >= 3
      ) {
        const responseSw1 = response[response.length - 2];
        const responseSw2 = response[response.length - 1];
        if (
          responseSw1 === STATUS_WORD_OK_SW1 &&
          responseSw2 === STATUS_WORD_OK_SW2 &&
          response[0] !== BLIND_SIGNING_FLAGS_ENABLED
        ) {
          // eslint-disable-next-line no-restricted-globals
          response = Buffer.from([
            BLIND_SIGNING_FLAGS_ENABLED,
            ...response.subarray(1),
          ]);
        }
      }

      const responseFrames = encodeLedgerHidResponse(
        state.framingSession,
        response,
      );

      for (const responseFrame of responseFrames) {
        ws.send(
          JSON.stringify({
            type: 'HID_RECV',
            id: message.id,
            data: Array.from(responseFrame),
          }),
        );
      }

      ws.send(
        JSON.stringify({
          type: 'HID_EXCHANGE_COMPLETE',
          id: message.id,
        }),
      );

      state.framingSession = null;
    } finally {
      signingLock?.release();
    }
  }

  /**
   * Stop the WebSocket server.
   *
   * @returns A promise that resolves when stopped.
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.#wss) {
        resolve();
        return;
      }

      this.#wss.clients.forEach((client) => {
        client.terminate();
      });

      const forceCloseTimer = setTimeout(() => {
        if (this.#wss) {
          this.#wss = null;
          resolve();
        }
      }, FORCE_CLOSE_TIMEOUT_MS);

      this.#wss.close(() => {
        clearTimeout(forceCloseTimer);
        this.#wss = null;
        resolve();
      });
    });
  }

  /**
   * Get the port the bridge is listening on.
   *
   * @returns The port number.
   */
  getPort(): number {
    return this.#port;
  }

  /**
   * Parse the total transaction payload length from the first signing APDU chunk.
   *
   * The RLP encoding starts at the first payload byte. This includes the
   * single-byte form (prefix 0x00–0x7f), where the prefix byte IS the value
   * itself and contributes exactly one byte to the payload — it is not a
   * header for the following bytes.
   *
   * @param firstChunkData - The payload bytes from the first APDU chunk (after the header).
   * @returns The total payload length in bytes, or null if parsing fails.
   */
  parseTxPayloadLength(firstChunkData: Buffer): number | null {
    if (firstChunkData.length < MIN_SIGN_TX_FIRST_CHUNK_DATA_LENGTH) {
      return null;
    }
    try {
      const pathCount = firstChunkData[0] ?? 0;
      const pathBytes = pathCount * 4;
      const txStart = 1 + pathBytes;
      if (txStart >= firstChunkData.length) {
        return null;
      }
      const txData = firstChunkData.subarray(txStart);
      if (txData.length === 0) {
        return null;
      }
      const rlpResult = this.decodeRlpLength(txData, 0);
      if (!rlpResult) {
        return null;
      }
      return pathBytes + 1 + rlpResult.headerSize + rlpResult.length;
    } catch {
      return null;
    }
  }

  /**
   * Decode an RLP length prefix at the given offset.
   *
   * @param data - The buffer containing RLP-encoded data.
   * @param offset - The byte offset to start decoding from.
   * @returns The header size and decoded length, or null if the data is incomplete.
   */
  decodeRlpLength(data: Buffer, offset: number): RlpDecodeResult | null {
    if (offset >= data.length) {
      return null;
    }
    const prefix = data[offset];
    if (prefix === undefined) {
      return null;
    }
    if (prefix <= 0x7f) {
      return { headerSize: 0, length: 1 };
    }
    if (prefix <= 0xb7) {
      return { headerSize: 1, length: prefix - 0x80 };
    }
    if (prefix <= 0xbf) {
      const lenOfLen = prefix - 0xb7;
      if (offset + 1 + lenOfLen > data.length) {
        return null;
      }
      let decodedLen = 0;
      for (let byteIdx = 0; byteIdx < lenOfLen; byteIdx++) {
        const byteVal = data[offset + 1 + byteIdx] ?? 0;
        // eslint-disable-next-line no-bitwise
        decodedLen = (decodedLen << 8) | byteVal;
      }
      return { headerSize: 1 + lenOfLen, length: decodedLen };
    }
    if (prefix <= 0xf7) {
      return { headerSize: 1, length: prefix - 0xc0 };
    }
    const lenOfLen2 = prefix - 0xf7;
    if (offset + 1 + lenOfLen2 > data.length) {
      return null;
    }
    let decodedLen2 = 0;
    for (let byteIdx = 0; byteIdx < lenOfLen2; byteIdx++) {
      const byteVal = data[offset + 1 + byteIdx] ?? 0;
      // eslint-disable-next-line no-bitwise
      decodedLen2 = (decodedLen2 << 8) | byteVal;
    }
    return { headerSize: 1 + lenOfLen2, length: decodedLen2 };
  }
}
