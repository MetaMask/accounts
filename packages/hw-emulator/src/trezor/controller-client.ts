// eslint-disable-next-line import-x/no-nodejs-modules
import type { EventEmitter } from 'events';
// eslint-disable-next-line import-x/no-nodejs-modules
import { Buffer } from 'node:buffer';
// eslint-disable-next-line import-x/no-nodejs-modules
import { randomUUID } from 'node:crypto';

import { TREZOR_CONTROLLER_PORT } from './constants';
import type { TrezorModel } from './model-profiles';

export type ControllerClientOptions = {
  host?: string;
  port?: number;
  /** Injectable for tests. Default opens a real `ws` WebSocket. */
  socketFactory?: (
    url: string,
  ) => Promise<EventEmitter & { send(payload: string): void; close(): void }>;
};

export type SetupParams = {
  mnemonic: string;
  pin: string;
  // The controller protocol uses snake_case keys on the wire.
  // eslint-disable-next-line @typescript-eslint/naming-convention
  passphrase_protection: boolean;
  label: string;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  needs_backup?: boolean;
};

/**
 * Payload of a successful controller response. Commands that return data
 * (e.g. screenshots) add fields on top of this shape.
 */
export type ControllerResponse = {
  /** Base64-encoded screenshot payload (screenshot responses only). */
  base64?: string;
  /** Error text, present on failed responses. */
  error?: string;
};

/** A message received from the trezor-user-env WebSocket controller. */
type ControllerMessage = {
  id?: string;
  success?: boolean;
  response?: ControllerResponse;
  error?: string;
};

type WireSocket = EventEmitter & {
  send(payload: string): void;
  close(): void;
};

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
};

export class TrezorControllerClient {
  readonly #url: string;

  readonly #socketFactory: (url: string) => Promise<WireSocket>;

  #socket: WireSocket | null = null;

  readonly #pending = new Map<string, PendingRequest>();

  constructor(opts: ControllerClientOptions = {}) {
    const host = opts.host ?? '127.0.0.1';
    const port = opts.port ?? TREZOR_CONTROLLER_PORT;
    this.#url = `ws://${host}:${port}/`;
    this.#socketFactory = opts.socketFactory ?? defaultFactory;
  }

  async connect(): Promise<void> {
    const socket = await this.#socketFactory(this.#url);
    this.#socket = socket;
    socket.on('message', (data: Buffer) => this.#handleMessage(data));
    socket.on('close', () =>
      this.#rejectAll(new Error('controller socket closed')),
    );
    // Errors after connect reject every in-flight request. On `ws` sockets a
    // 'close' event follows 'error', so this complements the close handler.
    socket.on('error', (error: Error) => this.#rejectAll(error));
  }

  async disconnect(): Promise<void> {
    this.#socket?.close();
    this.#socket = null;
  }

  #handleMessage(data: Buffer): void {
    let message: ControllerMessage;
    try {
      message = JSON.parse(data.toString()) as ControllerMessage;
    } catch {
      return;
    }
    if (!message.id) {
      return;
    }
    const pending = this.#pending.get(message.id);
    if (!pending) {
      return;
    }
    this.#pending.delete(message.id);
    if (message.success) {
      pending.resolve(message.response);
    } else {
      pending.reject(
        new Error(
          message.response?.error ?? message.error ?? 'controller error',
        ),
      );
    }
  }

  #rejectAll(error: Error): void {
    for (const [, pending] of this.#pending) {
      pending.reject(error);
    }
    this.#pending.clear();
  }

  async #send<TResult>(request: Record<string, unknown>): Promise<TResult> {
    const socket = this.#socket;
    if (!socket) {
      throw new Error('not connected');
    }
    const id = randomUUID();
    return new Promise<TResult>((resolve, reject) => {
      this.#pending.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      try {
        socket.send(JSON.stringify({ ...request, id }));
      } catch (error) {
        // A synchronous send failure must not leak the pending entry,
        // otherwise the map grows without bound.
        this.#pending.delete(id);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  // ── controller commands ──────────────────────────────────────────────

  /**
   * Start the emulated device, optionally wiping its state first.
   *
   * @param params - The emulator start parameters.
   * @param params.model - The device model to emulate.
   * @param params.wipe - Whether to wipe device state before starting.
   * @returns The controller response.
   */
  async emulatorStart(params: {
    model: TrezorModel;
    wipe?: boolean;
  }): Promise<unknown> {
    return this.#send({ type: 'emulator-start', ...params });
  }

  /**
   * Initialize the emulated device with a mnemonic and settings.
   *
   * @param params - The device setup parameters.
   * @returns The controller response.
   */
  async emulatorSetup(params: SetupParams): Promise<unknown> {
    return this.#send({ type: 'emulator-setup', ...params });
  }

  /**
   * Start the trezord bridge (e.g. `node-bridge`) in trezor-user-env.
   *
   * @param version - Optional bridge version to start.
   * @returns The controller response.
   */
  async bridgeStart(version?: string): Promise<unknown> {
    return this.#send({ type: 'bridge-start', version });
  }

  /**
   * Stop the running trezord bridge.
   *
   * @returns The controller response.
   */
  async bridgeStop(): Promise<unknown> {
    return this.#send({ type: 'bridge-stop' });
  }

  /**
   * Verify that the trezor-user-env background services are healthy.
   *
   * @returns The controller response.
   */
  async backgroundCheck(): Promise<unknown> {
    return this.#send({ type: 'background-check' });
  }

  /**
   * Ping the controller to verify that the WebSocket connection works.
   *
   * @returns The controller response.
   */
  async ping(): Promise<unknown> {
    return this.#send({ type: 'ping' });
  }

  // ── device interaction ───────────────────────────────────────────────

  /**
   * Press the physical Yes button (button-only models).
   *
   * @returns The controller response.
   */
  async pressYes(): Promise<unknown> {
    return this.#send({ type: 'emulator-press-yes' });
  }

  /**
   * Press the physical No button (button-only models).
   *
   * @returns The controller response.
   */
  async pressNo(): Promise<unknown> {
    return this.#send({ type: 'emulator-press-no' });
  }

  /**
   * Type a value on the emulated device keyboard.
   *
   * @param value - The value to type.
   * @returns The controller response.
   */
  async input(value: string): Promise<unknown> {
    return this.#send({ type: 'emulator-input', value });
  }

  /**
   * Tap the touchscreen at the given coordinates.
   *
   * @param params - The tap coordinates.
   * @param params.x - The horizontal coordinate.
   * @param params.y - The vertical coordinate.
   * @returns The controller response.
   */
  async click(params: { x: number; y: number }): Promise<unknown> {
    return this.#send({ type: 'emulator-click', x: params.x, y: params.y });
  }

  /**
   * Swipe the touchscreen in the given direction.
   *
   * @param direction - The swipe direction.
   * @returns The controller response.
   */
  async swipe(direction: 'up' | 'down' | 'left' | 'right'): Promise<unknown> {
    return this.#send({ type: 'emulator-swipe', direction });
  }

  /**
   * Capture the emulated device screen as a PNG buffer.
   *
   * @returns The screenshot payload.
   */
  async getScreenshot(): Promise<Buffer> {
    const response = await this.#send<string | ControllerResponse>({
      type: 'emulator-get-screenshot',
    });
    const payload =
      typeof response === 'string' ? response : (response?.base64 ?? '');
    return Buffer.from(payload, 'base64');
  }
}

async function defaultFactory(url: string): Promise<WireSocket> {
  const wsModule = await import('ws');
  return new Promise((resolve, reject) => {
    const socket = new wsModule.WebSocket(url) as unknown as WireSocket;
    let opened = false;
    const onConnectError = (error: Error): void => {
      if (!opened) {
        reject(error);
      }
    };
    socket.on('error', onConnectError);
    socket.once('open', () => {
      opened = true;
      // The socket now belongs to the client, which attaches its own
      // persistent handlers in connect(). Drop this one-shot rejection
      // listener so a post-connect error cannot reject a settled promise.
      socket.removeListener('error', onConnectError);
      resolve(socket);
    });
  });
}
