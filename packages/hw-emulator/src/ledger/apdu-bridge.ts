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

/**
 * Per-connection state tracking the HID framing session.
 */
type WsConnectionState = {
  framingSession: LedgerHidFramingSession | null;
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
 * WebSocket bridge that relays HID-framed APDUs between browser WebHID mock and Speculos.
 */
export class ApduBridge {
  #wss: WebSocketServer | null = null;

  readonly #client: SpeculosClient;

  readonly #port: number;

  readonly #emitter = new EventEmitter();

  readonly #signingReadyEmitter = new EventEmitter();

  readonly #connectionState = new WeakMap<WsWebSocket, WsConnectionState>();

  #signingGateResolve: (() => void) | null = null;

  #injectedErrorStatusCode: number | null = null;

  #signingLockChain: Promise<void> = Promise.resolve();

  #signingLockDepth = 0;

  #signTxTotalDataLen: number | null = null;

  #signTxDataSent = 0;

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
    await new Promise((resolve) => setTimeout(resolve, 1500));
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
    await new Promise((resolve) => setTimeout(resolve, 1500));
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
   * Release the signing gate to forward the APDU to Speculos.
   */
  releaseSigningGate(): void {
    if (this.#signingGateResolve) {
      this.#signingGateResolve();
      this.#signingGateResolve = null;
    }
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
   * Inject an error status code on the next APDU exchange.
   *
   * @param statusCode - 16-bit APDU status word.
   */
  injectNextErrorResponse(statusCode: number): void {
    this.#injectedErrorStatusCode = statusCode;
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
      this.#wss = new WebSocketServer({ port: this.#port });

      this.#wss.on('connection', (ws: WsWebSocket) => {
        this.#connectionState.set(ws, { framingSession: null });

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

      this.#wss.on('error', (serverError: Error) => {
        reject(serverError);
      });

      this.#wss.on('listening', () => {
        console.log(`[ApduBridge] Server listening on port ${this.#port}`);
        resolve();
      });
    });
  }

  async #handleMessage(ws: WsWebSocket, data: Buffer): Promise<void> {
    const messageStr = data.toString();

    try {
      const parsed = JSON.parse(messageStr);
      if (parsed.type === 'DEBUG') {
        return;
      }
    } catch {
      // Not JSON, continue
    }

    let messageId: number | undefined;
    try {
      const message = JSON.parse(data.toString());
      messageId = message.id;

      if (message.type === 'HID_SEND') {
        await this.handleHidSend(ws, message);
        return;
      }

      if (message.type === 'APDU_REQUEST') {
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
          id: messageId,
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
    message: { id?: number; data: number[] },
  ): Promise<void> {
    // eslint-disable-next-line no-restricted-globals
    const frame = Buffer.from(message.data);
    let state = this.#connectionState.get(ws);
    state ??= { framingSession: null };
    this.#connectionState.set(ws, state);

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

    const isSignTx = apdu.length >= 2 && apdu[0] === 0xe0 && apdu[1] === 0x04;
    const isSigningIns =
      apdu.length >= 2 &&
      apdu[0] === 0xe0 &&
      (apdu[1] === 0x04 ||
        apdu[1] === 0x08 ||
        apdu[1] === 0x1a ||
        apdu[1] === 0x20 ||
        apdu[1] === 0x22);

    const isSignTxFirst = isSignTx && apdu[2] === 0x00;
    const isSignTxContinuation = isSignTx && apdu[2] === 0x80;
    const dataLen = apdu.length > 5 ? apdu.length - 5 : 0;

    if (isSignTxFirst && apdu.length > 5) {
      const totalPayloadLen = this.parseTxPayloadLength(apdu.subarray(5));
      if (totalPayloadLen !== null) {
        this.#signTxTotalDataLen = totalPayloadLen;
        this.#signTxDataSent = dataLen;
      }
    } else if (isSignTxContinuation) {
      this.#signTxDataSent += dataLen;
    }

    const isSigningFirstChunk = isSigningIns && apdu[2] === 0x00;
    const isOtherSigning = isSigningIns && apdu[1] !== 0x04;

    if (isSigningFirstChunk || isOtherSigning) {
      this.#emitter.emit('signing-apdu', apdu);
    }

    const isLastSignTxChunk =
      isSignTxContinuation &&
      this.#signTxTotalDataLen !== null &&
      this.#signTxDataSent >= this.#signTxTotalDataLen;
    const isSingleChunkSignTx =
      isSignTxFirst &&
      this.#signTxTotalDataLen !== null &&
      this.#signTxDataSent >= this.#signTxTotalDataLen;
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
          }, 500)
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
        this.#signTxTotalDataLen !== null &&
        this.#signTxDataSent >= this.#signTxTotalDataLen &&
        response.length === 2 &&
        response[0] === 0x90 &&
        response[1] === 0x00;

      if (isLastChunkWithAck) {
        // eslint-disable-next-line no-restricted-globals
        const emptyChunk = Buffer.from([0xe0, 0x04, 0x80, 0x00, 0x00]);
        const readyTimer = setTimeout(() => {
          signingReadyFired = true;
          this.#signingReadyEmitter.emit('signing-ready');
        }, 500);
        response = await this.#client.exchange(emptyChunk);
        clearTimeout(readyTimer);
        this.#signTxTotalDataLen = null;
        this.#signTxDataSent = 0;
      } else if (!isSignTx || (isSingleChunkSignTx && response.length > 2)) {
        this.#signTxTotalDataLen = null;
        this.#signTxDataSent = 0;
      }

      const injectedCode = this.#injectedErrorStatusCode;
      this.#injectedErrorStatusCode = null;
      if (injectedCode !== null) {
        const sw1 = Math.floor(injectedCode / 256);
        const sw2 = injectedCode % 256;
        // eslint-disable-next-line no-restricted-globals
        response = Buffer.from([sw1, sw2]);
      }

      if (
        apdu.length >= 2 &&
        apdu[0] === 0xe0 &&
        apdu[1] === 0x06 &&
        response.length >= 3
      ) {
        const responseSw1 = response[response.length - 2];
        const responseSw2 = response[response.length - 1];
        if (responseSw1 === 0x90 && responseSw2 === 0x00 && response[0] !== 1) {
          // eslint-disable-next-line no-restricted-globals
          response = Buffer.from([1, ...response.subarray(1)]);
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
      }, 1000);

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
   * @param firstChunkData - The payload bytes from the first APDU chunk (after the header).
   * @returns The total payload length in bytes, or null if parsing fails.
   */
  parseTxPayloadLength(firstChunkData: Buffer): number | null {
    if (firstChunkData.length < 6) {
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
      let rlpStart = 0;
      if (txData[0] !== undefined && txData[0] >= 0x01 && txData[0] <= 0x7f) {
        rlpStart = 1;
      }
      if (rlpStart >= txData.length) {
        return null;
      }
      const rlpResult = this.decodeRlpLength(txData, rlpStart);
      if (!rlpResult) {
        return null;
      }
      return pathBytes + 1 + rlpStart + rlpResult.headerSize + rlpResult.length;
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
