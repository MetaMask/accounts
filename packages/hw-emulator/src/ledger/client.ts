// eslint-disable-next-line import-x/no-nodejs-modules
import net from 'node:net';
import { withRetry, isRetryableError } from './resilience';
import { SPECULOS_APDU_PORT, SPECULOS_API_PORT } from './constants';

export type SpeculosClientOptions = {
  apduHost?: string;
  apduPort?: number;
  apiHost?: string;
  apiPort?: number;
  timeout?: number;
};

export type APDUResponse = {
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

  constructor(options: SpeculosClientOptions = {}) {
    this.#options = {
      apduHost: '127.0.0.1',
      apduPort: SPECULOS_APDU_PORT,
      apiHost: '127.0.0.1',
      apiPort: SPECULOS_API_PORT,
      timeout: 30000,
      ...options,
    };

    this.#baseUrl = `http://${this.#options.apiHost}:${this.#options.apiPort}`;
  }

  /**
   * Connect to the Speculos APDU TCP socket.
   *
   * @returns A promise that resolves when connected.
   */
  async connect(): Promise<void> {
    if (this.#connected) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      this.#apduSocket = net.createConnection({
        host: this.#options.apduHost,
        port: this.#options.apduPort,
      });

      this.#apduSocket.on('connect', () => {
        this.#connected = true;
        this.#healthy = true;
        resolve();
      });

      this.#apduSocket.on('error', (socketError: Error) => {
        this.#healthy = false;
        reject(socketError);
      });

      this.#apduSocket.on('close', () => {
        this.#connected = false;
        this.#healthy = false;
      });
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

    let releaseMutex: () => void = () => undefined;
    const mutexSlot = new Promise<void>((resolve) => {
      releaseMutex = resolve;
    });
    const prior = this.#exchangeChain.catch(() => undefined);
    this.#exchangeChain = prior.then(async () => mutexSlot);

    await prior;

    try {
      return await this.exchangeOnce(apdu);
    } finally {
      releaseMutex();
    }
  }

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
        reject(new Error('APDU exchange timeout'));
      }, this.#options.timeout);

      // eslint-disable-next-line no-restricted-globals
      const lengthHeader = Buffer.alloc(4);
      lengthHeader.writeUInt32BE(apdu.length, 0);
      // eslint-disable-next-line no-restricted-globals
      this.#apduSocket.write(Buffer.concat([lengthHeader, apdu]));
    });
  }

  async fetchEndpoint(
    urlPath: string,
    init: RequestInit & { timeout?: number } = {},
  ): Promise<Response> {
    const { timeout: fetchTimeout = this.#options.timeout, ...requestInit } = init;
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
      body: JSON.stringify({ action: 'press-and-release', x: tapX, y: tapY, delay }),
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
    const apduHex = 'e006000000';
    const resp = await this.sendAPDU(apduHex);
    // eslint-disable-next-line no-restricted-globals
    const bytes = Buffer.from(resp.data, 'hex');
    const payloadLen = bytes.length - 2;
    if (payloadLen === 4) {
      const flags = bytes[0] ?? 0;
      return {
        major: bytes[1] ?? 0,
        minor: bytes[2] ?? 0,
        patch: bytes[3] ?? 0,
        // eslint-disable-next-line no-bitwise
        blindSigningEnabled: (flags & 0x01) !== 0,
      };
    }
    const flags = payloadLen > 7 ? (bytes[7] ?? 0) : 0;
    return {
      major: payloadLen > 1 ? (bytes[1] ?? 0) : 0,
      minor: payloadLen > 2 ? (bytes[2] ?? 0) : 0,
      patch: payloadLen > 3 ? (bytes[3] ?? 0) : 0,
      // eslint-disable-next-line no-bitwise
      blindSigningEnabled: (flags & 0x01) !== 0,
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
   * Disconnect from the Speculos APDU socket.
   */
  async disconnect(): Promise<void> {
    if (this.#apduSocket) {
      this.#apduSocket.end();
      this.#apduSocket = null;
      this.#connected = false;
      this.#healthy = false;
    }
  }

  /**
   * Connect with automatic retries on transient errors.
   *
   * @param options - Reconnection options.
   * @param options.autoReconnect - Whether to automatically reconnect.
   * @param options.reconnectAttempts - Maximum number of reconnection attempts.
   * @param options.reconnectDelayMs - Delay between reconnection attempts in milliseconds.
   */
  async connectWithResilience(options?: {
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
