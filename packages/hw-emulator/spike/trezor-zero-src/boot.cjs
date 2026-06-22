// Boots trezor-user-env: emulator T2T1 + SLIP-14 seed + node bridge.
// Verifies the bridge enumerates the emulator.

const { WebSocket } = require('ws');
const http = require('node:http');

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

function httpPost(url) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method: 'POST' }, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.setTimeout(3000, () => req.destroy(new Error('timeout')));
    req.end();
  });
}

async function main() {
  const ws = new WebSocket(CONTROLLER);
  await new Promise((r, j) => { ws.once('open', r); ws.once('error', j); });
  console.log('controller: open');

  try {
    await controllerSend(ws, { type: 'emulator-start', model: 'T2T1', wipe: true });
    console.log('emulator-start: ok');
  } catch (e) { console.log('emulator-start:', String(e).slice(0, 100)); }
  try {
    await controllerSend(ws, {
      type: 'emulator-setup',
      mnemonic: SEED, pin: '', passphrase_protection: false, label: 'ZeroSrcSpike',
    });
    console.log('emulator-setup: ok');
  } catch (e) { console.log('emulator-setup:', String(e).slice(0, 100)); }

  // Try starting the bundled node bridge (default)
  try {
    const r = await controllerSend(ws, { type: 'bridge-start' });
    console.log('bridge-start (default):', JSON.stringify(r).slice(0, 200));
  } catch (e) { console.log('bridge-start default:', String(e).slice(0, 200)); }

  // Probe enumerate with various origins
  for (const origin of ['https://connect.trezor.io', 'http://localhost:8088', 'chrome-extension://test']) {
    const r = await new Promise((resolve) => {
      const req = http.request('http://127.0.0.1:21328/enumerate', { method: 'POST', headers: { Origin: origin } }, (res) => {
        let body = ''; res.on('data', c => body += c); res.on('end', () => resolve({ status: res.statusCode, body }));
      });
      req.on('error', () => resolve({ status: 0, body: 'error' }));
      req.setTimeout(3000, () => req.destroy(new Error('timeout')));
      req.end();
    });
    console.log(`bridge /enumerate (Origin=${origin}) -> HTTP ${r.status} body=${r.body.slice(0,150)}`);
  }

  ws.close();
  process.exit(0);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
