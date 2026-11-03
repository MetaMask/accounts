// eslint-disable-next-line import-x/no-nodejs-modules
import net from 'node:net';

import { SPECULOS_APDU_PORT, SPECULOS_API_PORT } from './constants';
import { withRetry, isRetryableError } from './resilience';

/** Default timeout in milliseconds for establishing the APDU TCP connection. */
const DEFAULT_CONNECT_TIMEOUT_MS = 10_000;

/** Default timeout in milliseconds for the socket to close on disconnect. */
const DEFAULT_DISCONNECT_TIMEOUT_MS = 5_000;

/** GET_APP_CONFIGURATION APDU as hex: CLA 0xe0, INS 0x06, no payload. */
const GET_APP_CONFIGURATION_APDU = 'e006000000';

/** Length in bytes of the status word trailing every APDU response payload. */
const STATUS_WORD_LENGTH = 2;

/** Payload length of the classic 4-byte app-configuration response. */
const CLASSIC_APP_CONFIG_PAYLOAD_LENGTH = 4;

/** Offset of the flags byte in the classic app-configuration response. */
const APP_CONFIG_FLAGS_OFFSET = 0;

/** Offset of the major version byte in the app-configuration response. */
const APP_CONFIG_MAJOR_OFFSET = 1;

/** Offset of the minor version byte in the app-configuration response. */
const APP_CONFIG_MINOR_OFFSET = 2;

/** Offset of the patch version byte in the app-configuration response. */
const APP_CONFIG_PATCH_OFFSET = 3;

/** Offset of the flags byte in the extended app-configuration response. */
const EXTENDED_APP_CONFIG_FLAGS_OFFSET = 7;

/** Bit of the app-configuration flags byte reporting blind signing as enabled. */
const BLIND_SIGNING_FLAG_MASK = 0x01;

/**
 * Options for configuring the SpeculosClient.
 */
export type SpeculosClientOptions = {
  /** Hostname for the APDU TCP socket. */
  apduHost?: string;
  /** Port for the APDU TCP socket. */
  apduPort?: number;
  /** Hostname for the REST API. */
  apiHost?: string;
  /** Port for the REST API. */
  apiPort?: number;
  /** Timeout in milliseconds for APDU exchanges and API requests. */
  timeout?: number;
  /** Timeout in milliseconds for establishing the APDU TCP connection (default 10s). */
  connectTimeout?: number;
};

/**
 * Response from an APDU exchange.
 */
export type APDUResponse = {
  /** Hex-encoded response data. */
  data: string;
};

/**
 * TCP and REST client for communicating with a Speculos emulator instance.
 */
export class SpeculosClient {
  #apduSocket: net.Socket | null = null;

  readonly #baseUrl: string;

  readonly #options: Required<SpeculosClientOptions>;

  #connected = false;

  #healthy = false;

  #exchangeChain: Promise<void> = Promise.resolve();

  #resetChain: Promise<void> = Promise.resolve();

  /**
   * Monotonic connection generation. Incremented by every `connect()`
   * attempt and by `disconnect()`, so background reconnects queued before
   * a disconnect can detect they are stale and abandon instead of
   * resurrecting the connection.
   */
  #connectionGeneration = 0;

  /**
   * @param options - Client configuration options.
   */
  constructor(options: SpeculosClientOptions = {}) {
    this.#options = {
      apduHost: '127.0.0.1',
      apduPort: SPECULOS_APDU_PORT,
      apiHost: '127.0.0.1',
      apiPort: SPECULOS_API_PORT,
      timeout: 30000,
      connectTimeout: DEFAULT_CONNECT_TIMEOUT_MS,
      ...options,
    };

    this.#baseUrl = `http://${this.#options.apiHost}:${this.#options.apiPort}`;
  }

  /**
   * Connect to the Speculos APDU TCP socket.
   *
   * The connection attempt fails after `connectTimeout` milliseconds
   * (default 10s) if the TCP connection cannot be established (e.g. a
   * blackholed host that neither accepts nor refuses), destroying the pending
   * socket.
   *
   * @returns A promise that resolves when connected.
   */
  async connect(): Promise<void> {
    if (this.#connected) {
      return;
    }

    this.#connectionGeneration += 1;
    const generation = this.#connectionGeneration;

    await new Promise<void>((resolve, reject) => {
      const socket = net.createConnection({
        host: this.#options.apduHost,
        port: this.#options.apduPort,
      });
      this.#apduSocket = socket;

      let connectTimer: ReturnType<typeof setTimeout> | undefined;

      // Connect-phase error listener. Removed as soon as the promise settles
      // (connect or timeout) so later socket errors can never reject the
      // already-settled promise; post-connect errors are handled by a
      // persistent listener that only tracks health.
      const onConnectError = (socketError: Error): void => {
        if (connectTimer) {
          clearTimeout(connectTimer);
        }
        socket.removeListener('error', onConnectError);
        // Swallow errors emitted while the dying socket is destroyed.
        socket.on('error', () => undefined);
        socket.destroy();
        if (this.#apduSocket === socket) {
          this.#apduSocket = null;
        }
        reject(socketError);
      };

      connectTimer = setTimeout(() => {
        connectTimer = undefined;
        socket.removeListener('error', onConnectError);
        // Swallow errors emitted while the dying socket is destroyed.
        socket.on('error', () => undefined);
        socket.destroy();
        if (this.#apduSocket === socket) {
          this.#apduSocket = null;
        }
        reject(
          new Error(
            `Timed out connecting to Speculos APDU endpoint ${this.#options.apduHost}:${this.#options.apduPort} after ${this.#options.connectTimeout}ms`,
          ),
        );
      }, this.#options.connectTimeout);

      socket.on('connect', () => {
        if (connectTimer) {
          clearTimeout(connectTimer);
        }
        // Remove the connect-phase listener so post-connect socket errors
        // cannot touch this (now settled) promise.
        socket.removeListener('error', onConnectError);
        if (generation !== this.#connectionGeneration) {
          // A disconnect() (or a newer connect attempt) superseded this
          // attempt while it was in flight: destroy the socket instead of
          // resurrecting the connection.
          socket.destroy();
          resolve();
          return;
        }
        // Persistent handler: only tracks health, never rejects. Guarded so
        // a superseded socket cannot flip the flags of the current one.
        socket.on('error', () => {
          if (this.#apduSocket === socket) {
            this.#healthy = false;
          }
        });
        this.#connected = true;
        this.#healthy = true;
        resolve();
      });

      socket.on('close', () => {
        if (this.#apduSocket === socket) {
          this.#connected = false;
          this.#healthy = false;
        }
      });

      socket.on('error', onConnectError);
    });
  }

  /**
   * Send an APDU and receive the response via TCP.
   *
   * @param apdu - The APDU buffer to send.
   * @returns The response buffer.
   */
  async exchange(apdu: Buffer): Promise<Buffer> {
    if (!this.#apduSocket || !this.#connected) {
      throw new Error('Not connected to Speculos');
    }

    // #exchangeChain is a promise-chain mutex: each exchange appends itself
    // behind the previous one, serializing APDU exchanges on the shared socket.
    let releaseMutex: () => void = () => undefined;
    const mutexSlot = new Promise<void>((resolve) => {
      releaseMutex = resolve;
    });
    const prior = this.#exchangeChain.catch(() => undefined);
    this.#exchangeChain = prior.then(async () => mutexSlot);

    await prior;

    try {
      // Wait for any in-flight post-timeout reconnect so buffered stale bytes
      // from a previous timed-out exchange cannot leak into this one.
      await this.#resetChain;

      if (!this.#apduSocket || !this.#connected) {
        throw new Error('Not connected to Speculos');
      }

      return await this.exchangeOnce(apdu);
    } finally {
      releaseMutex();
    }
  }

  /**
   * Send a single APDU frame without mutual exclusion.
   *
   * If the exchange times out, the socket is destroyed and reconnected: a late
   * response to the timed-out request would otherwise stay buffered in the
   * socket and be misattributed to the next exchange as its answer.
   *
   * @param apdu - The APDU buffer to send.
   * @returns The response buffer.
   */
  async exchangeOnce(apdu: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      // eslint-disable-next-line prefer-const
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      // eslint-disable-next-line prefer-const
      let cleanup: () => void;

      const onData = (data: Buffer): void => {
        chunks.push(data);
        // eslint-disable-next-line no-restricted-globals
        const combined = Buffer.concat(chunks);

        if (combined.length < 4) {
          return;
        }
        const payloadSize = combined.readUInt32BE(0);
        const expectedTotal = 4 + payloadSize + 2;
        if (combined.length < expectedTotal) {
          return;
        }

        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        cleanup();
        resolve(combined.subarray(4, expectedTotal));
      };

      const onError = (exchangeError: Error): void => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        cleanup();
        reject(exchangeError);
      };

      cleanup = (): void => {
        if (this.#apduSocket) {
          this.#apduSocket.off('data', onData);
          this.#apduSocket.off('error', onError);
        }
      };

      if (!this.#apduSocket) {
        reject(new Error('APDU socket not initialized'));
        return;
      }
      this.#apduSocket.on('data', onData);
      this.#apduSocket.on('error', onError);

      timeoutId = setTimeout(() => {
        cleanup();
        // Discard the socket (and any late response buffered in it) and
        // reconnect, so a delayed reply cannot answer the NEXT exchange.
        this.#resetConnectionAfterTimeout();
        reject(new Error('APDU exchange timeout'));
      }, this.#options.timeout);

      // eslint-disable-next-line no-restricted-globals
      const lengthHeader = Buffer.alloc(4);
      lengthHeader.writeUInt32BE(apdu.length, 0);
      // eslint-disable-next-line no-restricted-globals
      this.#apduSocket.write(Buffer.concat([lengthHeader, apdu]));
    });
  }

  /**
   * Fetch a Speculos REST API endpoint with timeout support.
   *
   * @param urlPath - The API path (e.g. '/screenshot').
   * @param init - Fetch options with optional timeout override.
   * @returns The fetch Response.
   */
  async fetchEndpoint(
    urlPath: string,
    init: RequestInit & { timeout?: number } = {},
  ): Promise<Response> {
    const { timeout: fetchTimeout = this.#options.timeout, ...requestInit } =
      init;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), fetchTimeout);
    try {
      const response = await fetch(`${this.#baseUrl}${urlPath}`, {
        ...requestInit,
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(
          `Speculos API ${urlPath} returned ${response.status}: ${await response.text().catch(() => '')}`,
        );
      }
      return response;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Press a button on the emulated device.
   *
   * @param button - Which button to press.
   */
  async pressButton(button: 'left' | 'right' | 'both'): Promise<void> {
    await this.fetchEndpoint(`/button/${button}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'press-and-release' }),
    });
  }

  /**
   * Simulate a finger tap on the emulated touchscreen.
   *
   * @param tapX - X coordinate.
   * @param tapY - Y coordinate.
   * @param delay - Tap duration in seconds.
   */
  async fingerTap(tapX: number, tapY: number, delay = 0.1): Promise<void> {
    await this.fetchEndpoint('/finger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'press-and-release',
        x: tapX,
        y: tapY,
        delay,
      }),
    });
  }

  /**
   * Simulate a finger swipe on the emulated touchscreen.
   *
   * @param startX - Start X coordinate.
   * @param startY - Start Y coordinate.
   * @param endX - End X coordinate.
   * @param endY - End Y coordinate.
   * @param delay - Swipe duration in seconds.
   */
  async fingerSwipe(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    delay = 0.3,
  ): Promise<void> {
    await this.fetchEndpoint('/finger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'press-and-release',
        x: startX,
        y: startY,
        x2: endX,
        y2: endY,
        delay,
      }),
    });
  }

  /**
   * Take a screenshot of the emulated device screen.
   *
   * @returns A PNG buffer.
   */
  async getScreenshot(): Promise<Buffer> {
    const response = await this.fetchEndpoint('/screenshot');
    const arrayBuffer = await response.arrayBuffer();
    // eslint-disable-next-line no-restricted-globals
    return Buffer.from(arrayBuffer);
  }

  /**
   * Get screen events from the emulator.
   *
   * @returns An array of screen events.
   */
  async getEvents(): Promise<
    { text?: string; x: number; y: number; w: number; h: number }[]
  > {
    const response = await this.fetchEndpoint('/events');
    const data = (await response.json()) as {
      events: { text?: string; x: number; y: number; w: number; h: number }[];
    };
    return data.events;
  }

  /**
   * Set automation rules for the emulator.
   *
   * @param rulesJson - JSON string of automation rules.
   */
  async setAutomation(rulesJson: string): Promise<void> {
    await this.fetchEndpoint('/automation', {
      method: 'POST',
      body: rulesJson,
    });
  }

  /**
   * Clear automation rules.
   */
  async clearAutomation(): Promise<void> {
    await this.fetchEndpoint('/automation', {
      method: 'POST',
      body: JSON.stringify({ version: 1, rules: [] }),
    });
  }

  /**
   * Query the Ethereum app configuration via APDU.
   *
   * @returns App version and blind signing status.
   */
  async getAppConfiguration(): Promise<{
    major: number;
    minor: number;
    patch: number;
    blindSigningEnabled: boolean;
  }> {
    const resp = await this.sendAPDU(GET_APP_CONFIGURATION_APDU);
    // eslint-disable-next-line no-restricted-globals
    const bytes = Buffer.from(resp.data, 'hex');
    const payloadLen = bytes.length - STATUS_WORD_LENGTH;
    if (payloadLen === CLASSIC_APP_CONFIG_PAYLOAD_LENGTH) {
      const flags = bytes[APP_CONFIG_FLAGS_OFFSET] ?? 0;
      return {
        major: bytes[APP_CONFIG_MAJOR_OFFSET] ?? 0,
        minor: bytes[APP_CONFIG_MINOR_OFFSET] ?? 0,
        patch: bytes[APP_CONFIG_PATCH_OFFSET] ?? 0,
        // eslint-disable-next-line no-bitwise
        blindSigningEnabled: (flags & BLIND_SIGNING_FLAG_MASK) !== 0,
      };
    }
    const flags =
      payloadLen > EXTENDED_APP_CONFIG_FLAGS_OFFSET
        ? (bytes[EXTENDED_APP_CONFIG_FLAGS_OFFSET] ?? 0)
        : 0;
    return {
      major:
        payloadLen > APP_CONFIG_MAJOR_OFFSET
          ? (bytes[APP_CONFIG_MAJOR_OFFSET] ?? 0)
          : 0,
      minor:
        payloadLen > APP_CONFIG_MINOR_OFFSET
          ? (bytes[APP_CONFIG_MINOR_OFFSET] ?? 0)
          : 0,
      patch:
        payloadLen > APP_CONFIG_PATCH_OFFSET
          ? (bytes[APP_CONFIG_PATCH_OFFSET] ?? 0)
          : 0,
      // eslint-disable-next-line no-bitwise
      blindSigningEnabled: (flags & BLIND_SIGNING_FLAG_MASK) !== 0,
    };
  }

  /**
   * Send a raw APDU via the REST API.
   *
   * @param data - Hex-encoded APDU data.
   * @returns The APDU response.
   */
  async sendAPDU(data: string): Promise<APDUResponse> {
    const response = await this.fetchEndpoint('/apdu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    });
    return response.json();
  }

  /**
   * Destroy the current socket and reconnect in the background, discarding any
   * stale buffered data. Reconnection failures leave the client disconnected;
   * the next exchange() then throws "Not connected to Speculos".
   */
  #resetConnectionAfterTimeout(): void {
    // Supersede the connection: any connect attempt that was already in
    // flight when the timeout fired must not become the new connection.
    this.#connectionGeneration += 1;
    const scheduledGeneration = this.#connectionGeneration;
    const socket = this.#apduSocket;
    this.#apduSocket = null;
    this.#connected = false;
    this.#healthy = false;
    if (socket) {
      socket.removeAllListeners();
      socket.destroy();
    }
    this.#resetChain = this.#resetChain.then(async () =>
      this.#reconnectAfterTimeout(scheduledGeneration),
    );
  }

  /**
   * Reconnect after a timed-out exchange. Never rejects — a failed reconnect
   * simply leaves the client disconnected.
   *
   * @param scheduledGeneration - The connection generation captured when
   * this reconnect was scheduled; if it no longer matches, an explicit
   * connect()/disconnect() has superseded the reconnect and it abandons.
   * @returns A promise that resolves once the reconnect attempt settles
   * (or is abandoned).
   */
  async #reconnectAfterTimeout(scheduledGeneration: number): Promise<void> {
    if (scheduledGeneration !== this.#connectionGeneration) {
      return;
    }
    try {
      await this.connect();
    } catch {
      // The emulator may be gone; stay disconnected.
    }
  }

  /**
   * Disconnect from the Speculos APDU socket.
   *
   * Awaits the socket close (bounded by a 5s force-destroy fallback) and
   * removes all listeners instead of dropping the socket reference
   * immediately.
   */
  async disconnect(): Promise<void> {
    // Invalidate any queued background reconnect before the early return:
    // a disconnect with no live socket can still race an in-flight
    // post-timeout reconnect attempt.
    this.#connectionGeneration += 1;
    const socket = this.#apduSocket;
    if (!socket) {
      return;
    }
    this.#apduSocket = null;
    this.#connected = false;
    this.#healthy = false;
    socket.removeAllListeners();

    if (socket.readyState === 'closed') {
      return;
    }

    await new Promise<void>((resolve) => {
      const closeTimer = setTimeout(() => {
        // Fallback: force-destroy if a graceful close never completes.
        socket.destroy();
      }, DEFAULT_DISCONNECT_TIMEOUT_MS);
      socket.once('close', () => {
        clearTimeout(closeTimer);
        resolve();
      });
      socket.once('error', () => {
        socket.destroy();
      });
      socket.end();
    });
  }

  /**
   * Connect with automatic retries on transient errors.
   *
   * The total number of connection attempts is `reconnectAttempts + 1`:
   * one initial attempt plus up to `reconnectAttempts` reconnects.
   *
   * @param options - Reconnection options.
   * @param options.autoReconnect - Whether to automatically reconnect.
   * @param options.reconnectAttempts - Maximum number of reconnection attempts.
   * @param options.reconnectDelayMs - Delay between reconnection attempts in milliseconds.
   */
  async connectWithRetry(options?: {
    autoReconnect?: boolean;
    reconnectAttempts?: number;
    reconnectDelayMs?: number;
  }): Promise<void> {
    const autoReconnect = options?.autoReconnect ?? true;
    const maxReconnects = options?.reconnectAttempts ?? 5;
    const reconnectDelay = options?.reconnectDelayMs ?? 1000;

    if (this.#connected) {
      return;
    }

    let attempts = 0;
    while (!this.#connected && attempts <= maxReconnects) {
      try {
        await this.connect();
      } catch (connectError: unknown) {
        attempts += 1;
        if (!autoReconnect || attempts > maxReconnects) {
          throw connectError;
        }
        await new Promise((resolve) => setTimeout(resolve, reconnectDelay));
        continue;
      }
    }
  }

  /**
   * Exchange an APDU with automatic retries on transient errors.
   *
   * @param apdu - The APDU buffer to send.
   * @param maxAttempts - Maximum number of attempts.
   * @returns The response buffer.
   */
  async exchangeWithRetry(apdu: Buffer, maxAttempts = 3): Promise<Buffer> {
    const exchangeFn = async (): Promise<Buffer> => this.exchange(apdu);
    return withRetry<Buffer>(exchangeFn, {
      maxRetries: maxAttempts - 1,
      shouldRetry: (retryError: Error) => isRetryableError(retryError),
      onRetry: (retryError: Error, attempt: number) => {
        console.warn(
          `[SpeculosClient] APDU exchange retry ${attempt} due to: ${retryError.message ?? retryError}`,
        );
      },
    });
  }

  /**
   * Check if the client is healthy and connected.
   *
   * @returns True if connected and healthy.
   */
  isHealthy(): boolean {
    return this.#connected && this.#healthy;
  }
}
