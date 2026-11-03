import { EventEmitter } from 'events';

import { TrezorControllerClient } from './controller-client';

type SentMessage = {
  id: string;
  type: string;
};

type MockSocket = EventEmitter & {
  send: (payload: string) => void;
  close: () => void;
};

type MockSocketHandle = {
  socket: MockSocket;
  sent: SentMessage[];
  reply: (id: string, response: unknown, success?: boolean) => void;
  setSendImplementation: (implementation: (payload: string) => void) => void;
  factory: () => Promise<MockSocket>;
};

function createMockSocket(): MockSocketHandle {
  const socket = new EventEmitter() as MockSocket;
  const sent: SentMessage[] = [];
  let sendImplementation: (payload: string) => void = (
    payload: string,
  ): void => {
    sent.push(JSON.parse(payload) as SentMessage);
  };
  socket.send = (payload: string): void => {
    sendImplementation(payload);
  };
  socket.close = (): void => {
    socket.emit('close');
  };
  const reply = (id: string, response: unknown, success = true): void => {
    socket.emit(
      'message',
      Buffer.from(JSON.stringify({ id, success, response })),
    );
  };

  return {
    socket,
    sent,
    reply,
    setSendImplementation: (
      implementation: (payload: string) => void,
    ): void => {
      sendImplementation = implementation;
    },
    factory: async (): Promise<MockSocket> => {
      // emit 'open' on next tick so the connect() promise resolves
      setImmediate(() => {
        socket.emit('open');
      });
      return socket;
    },
  };
}

describe('TrezorControllerClient', () => {
  it('sends emulator-start with a generated id and resolves on the matching reply', async () => {
    const { factory, sent, reply } = createMockSocket();
    const client = new TrezorControllerClient({ socketFactory: factory });
    await client.connect();
    const pending = client.emulatorStart({ model: 'T2T1', wipe: true });
    await new Promise((resolve) => setImmediate(resolve));
    const startMessage = sent[0];
    if (!startMessage) {
      throw new Error('emulator-start was not sent');
    }
    expect(sent).toStrictEqual([
      expect.objectContaining({
        type: 'emulator-start',
        model: 'T2T1',
        wipe: true,
        id: expect.any(String),
      }),
    ]);
    reply(startMessage.id, { ok: true });
    expect(await pending).toStrictEqual({ ok: true });
  });

  it('rejects when the controller returns success:false', async () => {
    const { factory, sent, reply } = createMockSocket();
    const client = new TrezorControllerClient({ socketFactory: factory });
    await client.connect();
    const pending = client.emulatorSetup({
      mnemonic: 'x',
      pin: '',
      passphrase_protection: false,
      label: 't',
    });
    await new Promise((resolve) => setImmediate(resolve));
    const setupMessage = sent[0];
    if (!setupMessage) {
      throw new Error('emulator-setup was not sent');
    }
    reply(setupMessage.id, { error: 'bad mnemonic' }, false);
    await expect(pending).rejects.toThrow('bad mnemonic');
  });

  it('maps pressYes/pressNo to emulator-press-yes/no', async () => {
    const { factory, sent } = createMockSocket();
    const client = new TrezorControllerClient({ socketFactory: factory });
    await client.connect();
    // Fire-and-forget: these stay pending (no reply is sent for them).
    client.pressYes().catch(() => undefined);
    client.pressNo().catch(() => undefined);
    await new Promise((resolve) => setImmediate(resolve));
    expect(sent.map((message: SentMessage) => message.type)).toStrictEqual([
      'emulator-press-yes',
      'emulator-press-no',
    ]);
  });

  it('maps a touchscreen click to emulator-click with coords', async () => {
    const { factory, sent } = createMockSocket();
    const client = new TrezorControllerClient({ socketFactory: factory });
    await client.connect();
    client.click({ x: 120, y: 200 }).catch(() => undefined);
    await new Promise((resolve) => setImmediate(resolve));
    expect(sent[0]).toStrictEqual(
      expect.objectContaining({
        type: 'emulator-click',
        x: 120,
        y: 200,
      }),
    );
  });

  it('rejects and stays usable when the socket send throws synchronously', async () => {
    const { socket, sent, factory, setSendImplementation } = createMockSocket();
    setSendImplementation((payload: string) => {
      sent.push(JSON.parse(payload) as SentMessage);
      throw new Error('send failed');
    });
    const client = new TrezorControllerClient({ socketFactory: factory });
    await client.connect();

    await expect(client.ping()).rejects.toThrow('send failed');

    // The failed request must not corrupt the client: a subsequent request
    // on the same connection resolves normally.
    setSendImplementation((payload: string) => {
      sent.push(JSON.parse(payload) as SentMessage);
    });
    const second = client.ping();
    await new Promise((resolve) => setImmediate(resolve));
    const secondMessage = sent[1];
    if (!secondMessage) {
      throw new Error('second ping was not sent');
    }
    socket.emit(
      'message',
      Buffer.from(
        JSON.stringify({
          id: secondMessage.id,
          success: true,
          response: { ok: 1 },
        }),
      ),
    );
    expect(await second).toStrictEqual({ ok: 1 });
    socket.close();
  });

  it('rejects pending requests when the socket errors after connect', async () => {
    const { socket, factory } = createMockSocket();
    const client = new TrezorControllerClient({ socketFactory: factory });
    await client.connect();

    const pending = client.ping();
    socket.emit('error', new Error('socket gone'));
    await expect(pending).rejects.toThrow('socket gone');
  });
});
