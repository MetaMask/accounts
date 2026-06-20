// Diagnostic: probe whether the offscreen document can talk to the REAL
// trezord-go bridge (which has an Origin whitelist). This is the actual
// production question — Part 1's synthetic-loopback fetch only answered
// PNA, but trezord-go ALSO enforces Origin.
//
// We load the WITH-host_permissions PNA-test extension, but the offscreen
// document additionally does POST /enumerate against the real bridge and
// records what status/error it gets. If 403, that's the Origin-whitelist
// blocker (orthogonal to PNA but worth flagging to the orchestrator).
//
// Run:  node run-bridge-probe.cjs

const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { chromium } = require('playwright');

const SPIKE_DIR = __dirname;
const EXT_SRC = path.join(SPIKE_DIR, 'extension');

function findChromium() {
  if (process.env.PW_CHROMIUM_PATH) return process.env.PW_CHROMIUM_PATH;
  const c = '/Users/montelai/Library/Caches/ms-playwright/chromium-1208/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
  return fs.existsSync(c) ? c : undefined;
}

function buildExtDir() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'c2-probe-'));
  for (const name of fs.readdirSync(EXT_SRC)) {
    if (name.startsWith('manifest.')) continue;
    const src = path.join(EXT_SRC, name);
    if (fs.statSync(src).isFile()) fs.copyFileSync(src, path.join(tmp, name));
  }
  // Use WITH host_permissions variant
  fs.copyFileSync(
    path.join(EXT_SRC, 'manifest.with.json'),
    path.join(tmp, 'manifest.json'),
  );
  // Replace background.js with one that ALSO probes the real bridge.
  fs.copyFileSync(
    path.join(SPIKE_DIR, 'background-probe.js'),
    path.join(tmp, 'background.js'),
  );
  return tmp;
}

async function main() {
  const extDir = buildExtDir();
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'c2-probe-ud-'));
  console.log('ext dir:', extDir);

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${extDir}`,
      `--load-extension=${extDir}`,
      '--no-first-run',
      '--no-default-browser-check',
    ],
    executablePath: findChromium(),
    viewport: { width: 800, height: 600 },
  });

  let outcome;
  try {
    const testPage = await context.waitForEvent('page', { timeout: 15000 });
    await testPage.waitForURL(/test\.html(\?.*)?$/, { timeout: 15000 });
    await testPage.waitForLoadState('domcontentloaded', { timeout: 10000 });
    await testPage.waitForFunction(
      () => {
        const s = document.getElementById('status');
        return s && (s.textContent === 'DONE' || s.textContent === 'ERROR');
      },
      null,
      { timeout: 20000 },
    );
    outcome = {
      status: await testPage.textContent('#status'),
      results: await testPage.textContent('#results'),
    };
  } catch (err) {
    outcome = { status: 'DRIVER_ERROR', error: String(err) };
  } finally {
    try { await context.close(); } catch {}
  }

  console.log('--- bridge probe result ---');
  console.log('status:', outcome.status);
  console.log('results:', outcome.results);
  process.exit(0);
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
