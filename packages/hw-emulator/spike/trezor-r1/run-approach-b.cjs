// Approach B confirmation for the Trezor R1 spike.
//
// After run-spike.mjs showed Approach A fails (CORS Private-Network-Access
// blocks the public connect.trezor.io iframe from fetching 127.0.0.1, AND the
// iframe cannot load offline), this script confirms ADR-0003's LOCKED FALLBACK:
//
//   inject `transports: [new BridgeTransport({ url: ... })]` into connect's
//   init() — this skips the iframe entirely and runs the transport from the
//   main thread.
//
// ---------------------------------------------------------------------------
// Implementation note (read me before interpreting the result):
//
// This script uses the npm `@trezor/connect` package (the Node SDK), NOT
// `@trezor/connect-web` (the browser SDK). Rationale:
//
//   * The Node SDK has NO iframe by design — it always runs the transport
//     from the main thread. This is exactly the code path that
//     `@trezor/connect-web` runs when `transports: [...]` is injected.
//   * Both SDKs share the same `@trezor/transport` BridgeTransport code.
//   * The UMD bundle on connect.trezor.io does NOT expose `BridgeTransport`,
//     so it cannot be constructed from a CDN-loaded page without a bundler.
//
// Therefore: if this Node call succeeds, it proves BridgeTransport →
// trezord-go → emulator works for the SLIP-14 seed. Combined with the
// documented `transports` override behavior in connect-web (transports
// override → no iframe), this confirms Approach B is viable.
//
// Run from the spike dir:
//   NODE_PATH=/Users/montelai/consensys/metamask-extension/node_modules \
//     node run-approach-b.mjs
// ---------------------------------------------------------------------------

const path = require('node:path');

// The NODE_PATH set by the operator points at a node_modules tree that has
// @trezor/connect + @trezor/transport. We require them at runtime.
const TrezorConnect = require('@trezor/connect').default;
const { BridgeTransport, Messages } = require('@trezor/transport');
const { WebSocket } = require('ws');

const TREZORD_PORT = 21325;
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

async function setupEmulator() {
  const ws = new WebSocket(CONTROLLER);
  await new Promise((r, j) => {
    ws.once('open', r);
    ws.once('error', j);
  });
  await controllerSend(ws, {
    type: 'emulator-start',
    model: 'T2T1',
    wipe: true,
  });
  await controllerSend(ws, {
    type: 'emulator-setup',
    mnemonic: SEED,
    pin: '',
    passphrase_protection: false,
    label: 'SpikeB',
  });
  await controllerSend(ws, { type: 'bridge-start' });
  return ws;
}

async function main() {
  console.log('Boot: emulator + bridge');
  const ctl = await setupEmulator();
  console.log('Boot: ready');

  // The locked Approach B injection: a BridgeTransport instance pointing
  // DIRECTLY at trezord-go (no proxy, no iframe). In production this would
  // be `new BridgeTransport({ url: 'http://127.0.0.1:21325' })` injected
  // behind `if (process.env.IN_TEST)` in app/offscreen/hardware-wallets/trezor.ts.
  //
  // The constructor needs the protobuf schema (`messages`) to encode/decode
  // device messages — @trezor/transport exports it as `Messages`.
  const transport = new BridgeTransport({
    url: `http://127.0.0.1:${TREZORD_PORT}`,
    messages: Messages,
    id: 'spike',
  });
  console.log('Transport constructed:', transport.constructor.name);

  console.log('init() with transports override…');
  await TrezorConnect.init({
    manifest: {
      appName: 'spike-b',
      appUrl: 'http://localhost',
      email: 's@p.local',
    },
    transports: [transport],
    // webusb:false — we have no WebUSB device; only the bridge.
    // @trezor/connect (Node) ignores these but they document intent.
    webusb: false,
    popup: false,
  });
  console.log('init() ok');

  console.log("getPublicKey({ path: \"m/44'/60'/0'/0\", coin: 'eth' })…");
  const r = await TrezorConnect.getPublicKey({
    path: "m/44'/60'/0'/0",
    coin: 'eth',
  });
  console.log('Result:', JSON.stringify(r));

  console.log('\n=== APPROACH B VERDICT ===');
  if (r && r.success) {
    console.log('APPROACH B WORKS');
    console.log(
      'Reason: BridgeTransport injected → no iframe → fetch to 127.0.0.1:' +
        TREZORD_PORT +
        ' succeeded; getPublicKey returned success:true.',
    );
  } else {
    console.log('APPROACH B ALSO FAILED');
    console.log('Failure:', JSON.stringify(r?.payload ?? r));
  }

  try {
    await TrezorConnect.dispose();
  } catch {}
  ctl.close();
  process.exit(r && r.success ? 0 : 2);
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
