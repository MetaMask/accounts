import { randomUUID } from 'node:crypto';
import type { EventEmitter } from 'events';
import { TREZOR_CONTROLLER_PORT } from './constants';
import type { TrezorModel } from './model-profiles';

export interface ControllerClientOptions {
  host?: string;
  port?: number;
  /** Injectable for tests. Default opens a real `ws` WebSocket. */
  socketFactory?: (
    url: string,
  ) => Promise<
    EventEmitter & { send(payload: string): void; close(): void }
  >;
}

export interface SetupParams {
  mnemonic: string;
  pin: string;
  passphrase_protection: boolean;
  label: string;
  needs_backup?: boolean;
}

type WireSocket = EventEmitter & {
  send(payload: string): void;
  close(): void;
};

export class TrezorControllerClient {
  readonly #url: string;
  readonly #socketFactory: (url: string) => Promise<WireSocket>;
  #socket: WireSocket | null = null;
  #pending = new Map<
    string,
    { resolve: (v: unknown) => void; reject: (e: Error) => void }
  >();

  constructor(opts: ControllerClientOptions = {}) {
    const host = opts.host ?? '127.0.0.1';
    const port = opts.port ?? TREZOR_CONTROLLER_PORT;
    this.#url = `ws://${host}:${port}/`;
    this.#socketFactory = opts.socketFactory ?? defaultFactory;
  }

  async connect(): Promise<void> {
    this.#socket = await this.#socketFactory(this.#url);
    this.#socket.on('message', (data: Buffer) => this.#onMessage(data));
    this.#socket.on('close', () =>
      this.#rejectAll(new Error('controller socket closed')),
    );
  }

  async disconnect(): Promise<void> {
    this.#socket?.close();
    this.#socket = null;
  }

  #onMessage(data: Buffer): void {
    let msg: any;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      return;
    }
    const pending = this.#pending.get(msg.id);
    if (!pending) {
      return;
    }
    this.#pending.delete(msg.id);
    msg.success
      ? pending.resolve(msg.response)
      : pending.reject(
          new Error(
            msg.response?.error ?? msg.error ?? 'controller error',
          ),
        );
  }

  #rejectAll(err: Error): void {
    for (const [, p] of this.#pending) {
      p.reject(err);
    }
    this.#pending.clear();
  }

  #send<T>(msg: Record<string, unknown>): Promise<T> {
    if (!this.#socket) {
      return Promise.reject(new Error('not connected'));
    }
    const id = randomUUID();
    return new Promise<T>((resolve, reject) => {
      this.#pending.set(id, {
        resolve: resolve as (v: unknown) => void,
        reject,
      });
      this.#socket!.send(JSON.stringify({ ...msg, id }));
    });
  }

  // ── controller commands ──────────────────────────────────────────────
  emulatorStart(p: {
    model: TrezorModel;
    wipe?: boolean;
  }): Promise<unknown> {
    return this.#send({ type: 'emulator-start', ...p });
  }
  emulatorSetup(p: SetupParams): Promise<unknown> {
    return this.#send({ type: 'emulator-setup', ...p });
  }
  bridgeStart(): Promise<unknown> {
    return this.#send({ type: 'bridge-start' });
  }
  bridgeStop(): Promise<unknown> {
    return this.#send({ type: 'bridge-stop' });
  }
  backgroundCheck(): Promise<unknown> {
    return this.#send({ type: 'background-check' });
  }
  ping(): Promise<unknown> {
    return this.#send({ type: 'ping' });
  }

  // ── device interaction ───────────────────────────────────────────────
  pressYes(): Promise<unknown> {
    return this.#send({ type: 'emulator-press-yes' });
  }
  pressNo(): Promise<unknown> {
    return this.#send({ type: 'emulator-press-no' });
  }
  input(value: string): Promise<unknown> {
    return this.#send({ type: 'emulator-input', value });
  }
  click(p: { x: number; y: number }): Promise<unknown> {
    return this.#send({ type: 'emulator-click', x: p.x, y: p.y });
  }
  swipe(
    direction: 'up' | 'down' | 'left' | 'right',
  ): Promise<unknown> {
    return this.#send({ type: 'emulator-swipe', direction });
  }
  async getScreenshot(): Promise<Buffer> {
    const resp: any = await this.#send({
      type: 'emulator-get-screenshot',
    });
    return Buffer.from(resp.base64 ?? resp, 'base64');
  }
}

async function defaultFactory(url: string): Promise<WireSocket> {
  const { WebSocket } = await import('ws');
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url) as unknown as WireSocket;
    ws.on('open', () => resolve(ws));
    ws.on('error', reject);
  });
}
