// Boots the trezor-user-env emulator (SLIP-14 seed) + bridge so that
// http://127.0.0.1:21325 responds. Used by both Part 1 (PNA test) and
// Part 2 (C2 getPublicKey confirmation).
//
// Run from the spike dir:
//   NODE_PATH=/Users/montelai/consensys/metamask-speculos/node_modules \
//     node boot-bridge.cjs

const { WebSocket } = require('ws');

const CONTROLLER = 'ws://127.0.0.1:9001';
const SEED = 'all all all all all all all all all all all all';

function controllerSend(ws, msg) {
  return new Promise((resolve, reject) => {
    const id = Math.random().toString(36).slice(2);
    const onMessage = (data) => {
      let p;
      try {
        p = JSON.parse(data.toString());
      } catch {
        return;
      }
      if (p.id === id) {
        ws.off('message', onMessage);
        p.success ? resolve(p.response) : reject(new Error(JSON.stringify(p)));
      }
    };
    ws.on('message', onMessage);
    ws.send(JSON.stringify({ ...msg, id }));
  });
}

async function main() {
  const ws = new WebSocket(CONTROLLER);
  await new Promise((r, j) => {
    ws.once('open', r);
    ws.once('error', j);
  });
  console.log('controller: open');
  try {
    await controllerSend(ws, { type: 'emulator-start', model: 'T2T1', wipe: true });
    console.log('emulator-start: ok');
  } catch (e) {
    // already running is fine
    console.log('emulator-start: already running?', String(e).slice(0, 120));
  }
  try {
    await controllerSend(ws, {
      type: 'emulator-setup',
      mnemonic: SEED,
      pin: '',
      passphrase_protection: false,
      label: 'C2Spike',
    });
    console.log('emulator-setup: ok');
  } catch (e) {
    console.log('emulator-setup:', String(e).slice(0, 120));
  }
  try {
    await controllerSend(ws, { type: 'bridge-start' });
    console.log('bridge-start: ok');
  } catch (e) {
    console.log('bridge-start:', String(e).slice(0, 120));
  }
  ws.close();
  process.exit(0);
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
