import { EventEmitter } from 'events';
import { TrezorControllerClient } from './controller-client';

function createMockSocket() {
  const socket = new EventEmitter();
  const sent: any[] = [];
  (socket as any).readyState = 1;
  (socket as any).send = (payload: string) => {
    sent.push(JSON.parse(payload));
  };
  (socket as any).close = () => {
    (socket as any).readyState = 3;
    socket.emit('close');
  };
  const reply = (id: string, response: unknown, success = true) => {
    socket.emit(
      'message',
      Buffer.from(JSON.stringify({ id, success, response })),
    );
  };
  return {
    socket: socket as any,
    sent,
    reply,
    factory: () => {
      // emit 'open' on next tick so the connect() promise resolves
      setImmediate(() => socket.emit('open'));
      return Promise.resolve(socket as any);
    },
  };
}

describe('TrezorControllerClient', () => {
  it('sends emulator-start with a generated id and resolves on the matching reply', async () => {
    const { factory, sent, reply } = createMockSocket();
    const client = new TrezorControllerClient({ socketFactory: factory });
    await client.connect();
    const pending = client.emulatorStart({ model: 'T2T1', wipe: true });
    await new Promise((r) => setImmediate(r));
    expect(sent).toEqual([
      expect.objectContaining({
        type: 'emulator-start',
        model: 'T2T1',
        wipe: true,
        id: expect.any(String),
      }),
    ]);
    reply(sent[0].id, { ok: true });
    await expect(pending).resolves.toEqual({ ok: true });
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
    await new Promise((r) => setImmediate(r));
    reply(sent[0].id, { error: 'bad mnemonic' }, false);
    await expect(pending).rejects.toThrow('bad mnemonic');
  });

  it('maps pressYes/pressNo to emulator-press-yes/no', async () => {
    const { factory, sent } = createMockSocket();
    const client = new TrezorControllerClient({ socketFactory: factory });
    await client.connect();
    client.pressYes();
    client.pressNo();
    await new Promise((r) => setImmediate(r));
    expect(sent.map((s: { type: string }) => s.type)).toEqual([
      'emulator-press-yes',
      'emulator-press-no',
    ]);
  });

  it('maps a touchscreen click to emulator-click with coords', async () => {
    const { factory, sent } = createMockSocket();
    const client = new TrezorControllerClient({ socketFactory: factory });
    await client.connect();
    client.click({ x: 120, y: 200 });
    await new Promise((r) => setImmediate(r));
    expect(sent[0]).toEqual(
      expect.objectContaining({
        type: 'emulator-click',
        x: 120,
        y: 200,
      }),
    );
  });
});
