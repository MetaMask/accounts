// Same as boot-bridge.cjs but starts the trezord-go bridge (the binary
// Phase 0 used) on port 21325, instead of the default Node bridge on
// 21328 that the latest trezor-user-env image ships by default.
//
// The Node bridge doesn't enumerate our emulator in the spike container,
// but trezord-go (verified working in Phase 0) does.

const { WebSocket } = require('ws');

const CONTROLLER = 'ws://127.0.0.1:9001';
const SEED = 'all all all all all all all all all all all all';

function controllerSend(ws, msg) {
  return new Promise((resolve, reject) => {
    const id = Math.random().toString(36).slice(2);
    const onMessage = (data) => {
      let p;
      try { p = JSON.parse(data.toString()); } catch { return; }
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
  await new Promise((r, j) => { ws.once('open', r); ws.once('error', j); });
  console.log('controller: open');

  // Stop the default node-bridge first (frees port 21328, no-op for 21325).
  try { await controllerSend(ws, { type: 'bridge-stop' }); console.log('bridge-stop: ok'); }
  catch (e) { console.log('bridge-stop:', String(e).slice(0, 100)); }

  try {
    await controllerSend(ws, { type: 'emulator-start', model: 'T2T1', wipe: true });
    console.log('emulator-start: ok');
  } catch (e) { console.log('emulator-start:', String(e).slice(0, 100)); }

  try {
    await controllerSend(ws, {
      type: 'emulator-setup',
      mnemonic: SEED,
      pin: '',
      passphrase_protection: false,
      label: 'C2Spike',
    });
    console.log('emulator-setup: ok');
  } catch (e) { console.log('emulator-setup:', String(e).slice(0, 100)); }

  // Start trezord-go (Go bridge) on port 21325 — what Phase 0 verified.
  try {
    await controllerSend(ws, { type: 'bridge-start', version: '2.0.33' });
    console.log('bridge-start 2.0.33 (trezord-go): ok');
  } catch (e) { console.log('bridge-start 2.0.33:', String(e).slice(0, 200)); }

  ws.close();
  process.exit(0);
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
