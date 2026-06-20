// Part 2: Full C2 confirmation.
//
// Loads the C2 extension variant (manifest.c2.json) — same chrome-extension://
// offscreen context as MetaMask's production offscreen, but with the bundled
// headless @trezor/connect SDK + injected BridgeTransport. The offscreen
// document calls getPublicKey({path:"m/44'/60'/0'/0", coin:'eth'}) against
// the real trezor-user-env bridge on http://127.0.0.1:21328.
//
// PASS = getPublicKey returns success:true with the canonical SLIP-14 xpub
// (proves the entire C2 mechanism works end-to-end inside the chrome-
// extension:// offscreen context).
//
// Prereqs:
//   * trezor-user-env Docker up (docker compose -f docker-compose.yml up -d)
//   * emulator + bridge booted (node boot-bridge.cjs)
//   * trezor-connect.bundle.js built (node build-connect-bundle.cjs)
//   * node_modules symlinked to metamask-speculos (has playwright)

const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { chromium } = require('playwright');

const SPIKE_DIR = __dirname;
const EXT_SRC = path.join(SPIKE_DIR, 'extension');

function findChromium() {
  if (process.env.PW_CHROMIUM_PATH) return process.env.PW_CHROMIUM_PATH;
  const candidates = [
    '/Users/montelai/Library/Caches/ms-playwright/chromium-1208/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
  ];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  return undefined;
}

function buildExtDir() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'c2-confirm-'));
  // Copy everything from extension/ EXCEPT the manifest variants; install
  // manifest.c2.json as the active manifest.json.
  for (const name of fs.readdirSync(EXT_SRC)) {
    if (name.startsWith('manifest.')) continue;
    const src = path.join(EXT_SRC, name);
    const st = fs.statSync(src);
    if (st.isFile()) fs.copyFileSync(src, path.join(tmp, name));
    // (no subdirs in extension/ — skip recursive copy)
  }
  fs.copyFileSync(
    path.join(EXT_SRC, 'manifest.c2.json'),
    path.join(tmp, 'manifest.json'),
  );
  return tmp;
}

async function main() {
  const extDir = buildExtDir();
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'c2-confirm-ud-'));
  const executablePath = findChromium();
  console.log('ext dir:', extDir);
  console.log('user data:', userDataDir);
  console.log('exec:', executablePath || '(playwright default)');

  const bundlePath = path.join(extDir, 'trezor-connect.bundle.js');
  if (!fs.existsSync(bundlePath)) {
    console.error('FATAL: trezor-connect.bundle.js missing. Run build-connect-bundle.cjs first.');
    process.exit(1);
  }
  console.log('bundle size:', fs.statSync(bundlePath).size, 'bytes');

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${extDir}`,
      `--load-extension=${extDir}`,
      '--no-first-run',
      '--no-default-browser-check',
    ],
    executablePath,
    viewport: { width: 800, height: 600 },
  });

  let outcome;
  try {
    // background-c2.js opens test-c2.html on install.
    const testPage = await context.waitForEvent('page', { timeout: 15000 });
    await testPage.waitForURL(/test-c2\.html(\?.*)?$/, { timeout: 15000 });
    await testPage.waitForLoadState('domcontentloaded', { timeout: 10000 });

    // Wait for the SDK to do its thing. Use a shorter-than-bash timeout so
    // we can capture partial progress even if the SDK hangs.
    let timedOut = false;
    try {
      await testPage.waitForFunction(
        () => {
          const s = document.getElementById('status');
          return s && (s.textContent === 'DONE' || s.textContent === 'ERROR');
        },
        null,
        { timeout: 45000 },
      );
    } catch (e) {
      timedOut = true;
    }

    const status = timedOut ? 'TIMEOUT' : await testPage.textContent('#status');
    const resultsText = await testPage.textContent('#results');
    outcome = { status, resultsText, timedOut };

    // Capture any console messages from the extension (useful for diagnosing
    // init/getPublicKey failures — e.g. CORS preflight against the bridge).
    try {
      const swTarget = context.serviceWorkers();
      if (swTarget.length) {
        // (no-op — service worker console isn't surfaced via page)
      }
    } catch {}
  } catch (err) {
    outcome = { status: 'DRIVER_ERROR', error: String(err && err.stack ? err.stack : err) };
  } finally {
    try { await context.close(); } catch {}
  }

  console.log('\n--- c2-confirm result ---');
  console.log('status:', outcome.status);
  console.log('results:', outcome.resultsText);

  let parsed;
  try { parsed = JSON.parse(outcome.resultsText || ''); } catch { parsed = null; }
  console.log('\n=== C2 CONFIRMATION DECISION ===');
  if (parsed && parsed.ok && parsed.xpubMatchesExpected) {
    console.log('C2 CONFIRMED');
    console.log('Headless @trezor/connect + injected BridgeTransport in chrome-extension://');
    console.log('offscreen document returned the canonical SLIP-14 xpub.');
    console.log('xpub:', parsed.xpub);
  } else if (parsed && parsed.ok && !parsed.xpubMatchesExpected) {
    console.log('C2 PARTIAL — getPublicKey success but xpub mismatch');
    console.log('got:', parsed.xpub);
    console.log('expected:', parsed.expectedXpub);
  } else {
    console.log('C2 FAILED');
    console.log('stage:', parsed && parsed.stage);
    console.log('error:', parsed && parsed.error);
  }

  process.exit(0);
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
