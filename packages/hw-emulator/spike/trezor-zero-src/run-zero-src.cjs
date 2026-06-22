// Driver: runs TWO variants of the zero-source spike back-to-back:
//   1. pure zero-source (popup default true) — the gating test
//   2. diagnostic with popup:false — isolates whether popup is the blocker
//
// Each variant uses a different extension dir + fresh Chrome profile so
// the SDK state is fully isolated.

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

function buildExtDir(variant) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `zero-src-${variant}-`));
  for (const name of fs.readdirSync(EXT_SRC)) {
    const src = path.join(EXT_SRC, name);
    if (fs.statSync(src).isFile()) fs.copyFileSync(src, path.join(tmp, name));
  }
  // For the popup-false variant, uncomment the diagnostic knob.
  if (variant === 'popup-false') {
    const p = path.join(tmp, 'inject-global.js');
    let s = fs.readFileSync(p, 'utf8');
    s = s.replace('// window.__SPIKE_FORCE_POPUP_FALSE = true;', 'window.__SPIKE_FORCE_POPUP_FALSE = true;');
    fs.writeFileSync(p, s);
  }
  return tmp;
}

async function runVariant(variant) {
  const extDir = buildExtDir(variant);
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), `zero-src-${variant}-ud-`));
  console.log(`\n=========== variant: ${variant} ===========`);
  console.log('ext dir:', extDir);

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${extDir}`,
      `--load-extension=${extDir}`,
      '--no-first-run', '--no-default-browser-check',
      '--allow-running-insecure-content',
    ],
    executablePath: findChromium(),
    viewport: { width: 1000, height: 800 },
  });

  let outcome = {};
  let pageErrors = [];
  let consoleMsgs = [];
  try {
    const testPage = await context.waitForEvent('page', { timeout: 15000 });
    testPage.on('pageerror', (e) => { pageErrors.push('PAGEERROR: ' + (e.stack || String(e))); });
    testPage.on('console', (m) => { consoleMsgs.push(`[${m.type()}] ${m.text()}`); });

    await testPage.waitForURL(/test\.html(\?.*)?$/, { timeout: 15000 });
    await testPage.waitForLoadState('domcontentloaded', { timeout: 10000 });

    let timedOut = false;
    try {
      await testPage.waitForFunction(
        () => { const s = document.getElementById('status'); return s && (s.textContent === 'DONE' || s.textContent === 'ERROR'); },
        null,
        { timeout: 60000 },
      );
    } catch (e) { timedOut = true; }

    let status = 'UNKNOWN', results = '';
    try { status = await testPage.textContent('#status'); } catch (e) { status = 'READ_FAIL'; }
    try { results = await testPage.textContent('#results'); } catch (e) { results = ''; }
    outcome = { variant, status: timedOut ? 'TIMEOUT' : status, results, timedOut };
  } catch (err) {
    outcome = { variant, status: 'DRIVER_ERROR', error: String(err && err.stack ? err.stack : err) };
  } finally {
    outcome.pageErrors = pageErrors;
    outcome.consoleMsgs = consoleMsgs.slice(-30);
    try { await context.close(); } catch {}
  }

  console.log(`--- ${variant} result ---`);
  console.log('status:', outcome.status);
  if (outcome.error) console.log('error:', outcome.error);
  console.log('results:', (outcome.results || '').slice(0, 2000));

  // Parse + decide
  let parsed;
  try { parsed = JSON.parse((outcome.results || '').split('=== FINAL ===\n')[1] || ''); } catch { parsed = null; }
  return { variant, parsed, outcome };
}

async function main() {
  const results = [];
  // Run pure zero-source first
  results.push(await runVariant('zero-src'));
  // Then the popup:false diagnostic
  results.push(await runVariant('popup-false'));

  console.log('\n=========== OVERALL DECISION ===========');
  for (const r of results) {
    console.log(`\n[${r.variant}]`);
    if (r.parsed) {
      console.log('  ok:', r.parsed.ok, 'stage:', r.parsed.stage, 'success:', r.parsed.success);
      if (r.parsed.xpub) console.log('  xpub:', r.parsed.xpub);
      if (r.parsed.xpubMatchesExpected) console.log('  XPUB MATCHES EXPECTED ✓');
      if (!r.parsed.ok && r.parsed.error) console.log('  error:', String(r.parsed.error).slice(0, 200));
    } else {
      console.log('  (no parsed result; status:', r.outcome.status + ')');
    }
  }

  const zeroSrc = results.find((r) => r.variant === 'zero-src');
  const popupFalse = results.find((r) => r.variant === 'popup-false');
  console.log('\n=== FINAL DECISION ===');
  if (zeroSrc.parsed && zeroSrc.parsed.xpubMatchesExpected) {
    console.log('ZERO-SOURCE-CHANGE CONFIRMED');
  } else if (popupFalse.parsed && popupFalse.parsed.xpubMatchesExpected) {
    console.log('MINIMAL SOURCE CHANGE REQUIRED: popup:false in init() (1 line in trezor.ts IN_TEST branch)');
    console.log('Reason: zero-source chain works at transport level but popup:true (default) blocks in offscreen context');
  } else {
    console.log('FAILED — neither variant succeeded');
  }

  process.exit(0);
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
