// Trezor R1 spike driver.
//
// Tests ADR-0003 Approach A: does @trezor/connect-web initialized with
// DEFAULT settings (no connectSrc, no transports override) successfully call
// getPublicKey() against the trezor-user-env emulator when its default
// BridgeTransport port (21328) is occupied by our transparent HTTP proxy —
// and does it work OFFLINE (connect.trezor.io unreachable, the CI case)?
//
// ---------------------------------------------------------------------------
// IMPORTANT: this faithfully reproduces the PRODUCTION deployment:
//
//   * The SDK script itself is served from a LOCAL static server
//     (mimics bundling @trezor/connect-web via webpack — the SDK JS is NOT
//     fetched at runtime in production).
//   * Only the hidden IFRAME is fetched from the default connectSrc
//     (https://connect.trezor.io/9/iframe.html) at runtime — exactly what
//     R1 asks about.
//   * The OFFLINE run blocks connect.trezor.io (the iframe can't load) —
//     the CI case.
//
// The first iteration of this spike loaded the SDK script itself via
// `import('https://connect.trezor.io/...')`, which (a) broke because the SDK
// is UMD not ESM, and (b) conflated "SDK script fetchable" with "SDK can run
// offline". Production bundles the SDK; only the iframe is runtime-fetched.
//
// Adaptation note: `playwright` and `ws` are resolved from a symlinked
// ./node_modules pointing at metamask-speculos's install. See README.
// ---------------------------------------------------------------------------

import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { WebSocket } from 'ws';
import { chromium } from 'playwright';

const PROXY_PORT = 21328; // BridgeTransport default port (the R1 hypothesis)
const TREZORD_PORT = 21325; // trezord-go inside the container
const CONTROLLER = 'ws://127.0.0.1:9001';
const STATIC_PORT = 21329; // local static server (mimics bundled SDK)
const SEED = 'all all all all all all all all all all all all';

const proxyHits = [];

// ----- BridgeTransport proxy: :21328 -> :21325 -----------------------------
function startProxy() {
  return new Promise((resolve) => {
    const server = http.createServer(async (req, res) => {
      proxyHits.push(`${req.method} ${req.url}`);
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const body = Buffer.concat(chunks);
      try {
        const upstream = await fetch(
          `http://127.0.0.1:${TREZORD_PORT}${req.url}`,
          {
            method: req.method,
            headers: {
              'content-type':
                req.headers['content-type'] ?? 'application/json',
            },
            body: req.method === 'GET' ? undefined : body,
          },
        );
        const up = Buffer.from(await upstream.arrayBuffer());
        res.writeHead(upstream.status, {
          'content-type':
            upstream.headers.get('content-type') ?? 'application/json',
        });
        res.end(up);
      } catch (err) {
        res.writeHead(502);
        res.end(JSON.stringify({ error: String(err) }));
      }
    });
    server.listen(PROXY_PORT, () => resolve(server));
  });
}

// ----- Local static server (mimics bundled SDK) ---------------------------
// Serves the cached trezor-connect.js (UMD) and the test HTML page from a
// real HTTP origin so the SDK has a normal same-origin context.
function startStatic() {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        if (req.url === '/' || req.url === '/index.html') {
          res.writeHead(200, { 'content-type': 'text/html' });
          res.end(INDEX_HTML);
          return;
        }
        if (req.url === '/trezor-connect.js') {
          const js = await readFile(
            new URL('./trezor-connect.cached.js', import.meta.url),
          );
          res.writeHead(200, { 'content-type': 'text/javascript' });
          res.end(js);
          return;
        }
        res.writeHead(404);
        res.end('not found');
      } catch (e) {
        res.writeHead(500);
        res.end(String(e));
      }
    });
    server.listen(STATIC_PORT, '127.0.0.1', () => resolve(server));
    server.on('error', reject);
  });
}

const INDEX_HTML = `<!DOCTYPE html><html><body>
  <!-- SDK loaded as a regular script (UMD). window.TrezorConnect is set. -->
  <script src="/trezor-connect.js"></script>
  <div>load: <span id="load">pending</span></div>
  <div>init: <span id="init">pending</span></div>
  <pre id="out">pending</pre>
  <script>
    async function run() {
      const out = document.getElementById('out');
      const init = document.getElementById('init');
      const load = document.getElementById('load');
      try {
        // Wait for the UMD bundle to set window.TrezorConnect.
        await new Promise((resolve, reject) => {
          if (window.TrezorConnect) return resolve();
          const t = setTimeout(() => reject(new Error('SDK script timeout')), 15000);
          const i = setInterval(() => {
            if (window.TrezorConnect) { clearTimeout(t); clearInterval(i); resolve(); }
          }, 50);
        });
        load.textContent = 'loaded';
        // DEFAULT settings: NO connectSrc override, NO transports override.
        // This is the R1 hypothesis: the iframe comes from the default
        // connectSrc (https://connect.trezor.io/9/) and BridgeTransport
        // posts to its default port 21328 (our proxy).
        try {
          await window.TrezorConnect.init({
            manifest: { appName: 'spike', appUrl: 'http://127.0.0.1', email: 's@p.local' },
            // webusb:false avoids the WebUSB path which we cannot fulfil.
            webusb: false,
            // lazyLoad:false forces the iframe to load eagerly during init,
            // so we can observe iframe-load failures synchronously.
            lazyLoad: false,
          });
          init.textContent = 'ok';
        } catch (initErr) {
          init.textContent = 'ERROR: ' + (initErr?.message ?? initErr);
          out.textContent = 'INIT_FAILED: ' + (initErr?.message ?? initErr);
          return;
        }
        window.TrezorConnect.on('DEVICE_EVENT', () => {});
        const r = await window.TrezorConnect.getPublicKey({
          path: "m/44'/60'/0'/0",
          coin: 'eth',
        });
        out.textContent = JSON.stringify(r);
      } catch (e) {
        out.textContent = 'ERROR: ' + (e?.message ?? e);
      }
    }
    window.addEventListener('load', run);
  </script>
</body></html>`;

// ----- trezor-user-env controller RPC --------------------------------------
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
    label: 'Spike',
  });
  await controllerSend(ws, { type: 'bridge-start' });
  return ws;
}

// ----- Browser probe -------------------------------------------------------
// stage values:
//   'init-failed'           — SDK init() threw (likely iframe couldn't load)
//   'init-ok-call-failed'   — init ok, getPublicKey() threw or returned non-success
//   'init-ok-call-ok'       — init ok, getPublicKey returned (success OR error payload)
//   'timeout'               — page never reached a terminal state
async function probeConnectWeb(offline) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const hitsBefore = proxyHits.length;
  if (offline) {
    // Block every request whose URL touches connect.trezor.io. The SDK script
    // itself is served from 127.0.0.1 (the local static server, mimicking
    // bundling), so blocking connect.trezor.io ONLY kills the iframe — which
    // is precisely what we want to test.
    await ctx.route('**/*', (route) => {
      const url = route.request().url();
      if (url.includes('connect.trezor.io')) return route.abort();
      return route.continue();
    });
  }
  const page = await ctx.newPage();
  const result = {
    mode: offline ? 'offline' : 'online',
    stage: 'pending',
    init: null,
    load: null,
    console: [],
    iframeRequests: [],
    result: null,
    error: null,
    proxyHitsDuringRun: [],
  };
  page.on('console', (m) => result.console.push(`${m.type()}: ${m.text()}`));
  page.on('pageerror', (e) =>
    result.console.push(`pageerror: ${e.message}`),
  );
  // Capture every request so we can see what the iframe actually fetched.
  page.on('request', (req) => {
    const u = req.url();
    if (u.includes('connect.trezor.io') || u.includes('iframe'))
      result.iframeRequests.push(`${req.resourceType()} ${u}`);
  });

  try {
    await page.goto(`http://127.0.0.1:${STATIC_PORT}/`, {
      waitUntil: 'load',
      timeout: 30000,
    });
    await page.waitForFunction(
      () => document.getElementById('out').textContent !== 'pending',
      null,
      { timeout: 60000 },
    );
  } catch (e) {
    result.error = String(e);
    result.stage = 'timeout';
  }

  try {
    result.load = await page.locator('#load').textContent();
  } catch {}
  try {
    result.init = await page.locator('#init').textContent();
  } catch {}
  try {
    result.result = await page.locator('#out').textContent();
  } catch {}

  if (result.stage !== 'timeout') {
    if (result.result?.startsWith('INIT_FAILED')) result.stage = 'init-failed';
    else if (result.result?.startsWith('ERROR'))
      result.stage = 'init-ok-call-failed';
    else result.stage = 'init-ok-call-ok';
  }
  result.proxyHitsDuringRun = proxyHits.slice(hitsBefore);
  await browser.close();
  return result;
}

function classify(r) {
  if (r.stage === 'init-ok-call-ok' && r.result?.includes('"success":true'))
    return 'SUCCESS';
  if (r.stage === 'init-ok-call-ok')
    return 'TRANSPORT_OK_BUT_CALL_RETURNED_NON_SUCCESS';
  if (r.stage === 'init-ok-call-failed' || r.stage === 'timeout')
    return 'INIT_OK_BUT_CALL_FAILED';
  if (r.stage === 'init-failed') return 'INIT_FAILED';
  return 'UNKNOWN';
}

// ============================================================================
console.log('Boot: emulator + bridge + proxy on :' + PROXY_PORT);
const proxy = await startProxy();
const staticSrv = await startStatic();
const ctl = await setupEmulator();
console.log(
  `Boot: ready — proxy :${PROXY_PORT}, static :${STATIC_PORT}, emulator + bridge started`,
);

console.log('\n=== RUN 1: ONLINE (control) ===');
const online = await probeConnectWeb(false);
console.log(JSON.stringify({ ...online, classification: classify(online) }, null, 2));

console.log('\n=== RUN 2: OFFLINE (connect.trezor.io blocked — the CI case) ===');
const offlineRun = await probeConnectWeb(true);
console.log(
  JSON.stringify({ ...offlineRun, classification: classify(offlineRun) }, null, 2),
);

console.log('\n=== DECISION ===');
const offlineTransportReached = (offlineRun.proxyHitsDuringRun ?? []).length > 0;
const offlineCallSucceeded =
  offlineRun.stage === 'init-ok-call-ok' &&
  !!offlineRun.result?.includes('"success":true');

if (offlineCallSucceeded) {
  console.log('APPROACH A CONFIRMED');
  console.log(
    `Reason: offline run reached the call (proxy hits: ${offlineRun.proxyHitsDuringRun.length}) and getPublicKey returned success:true.`,
  );
} else {
  console.log('APPROACH A FAILS offline');
  console.log(`Classification: ${classify(offlineRun)}`);
  console.log(
    `Transport reached proxy offline? ${offlineTransportReached} (hits: ${JSON.stringify(offlineRun.proxyHitsDuringRun)})`,
  );
  console.log(`Iframe requests observed: ${JSON.stringify(offlineRun.iframeRequests)}`);
  console.log(
    `Failure detail: ${offlineRun.error ?? offlineRun.result ?? offlineRun.console.slice(-5).join(' | ')}`,
  );
  console.log('');
  console.log('Re-run run-approach-b.mjs to confirm the locked fallback works.');
}

proxy.close();
staticSrv.close();
ctl.close();
process.exit(0);
