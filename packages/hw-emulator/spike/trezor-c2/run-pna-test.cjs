// Part 1: PNA gating test for Trezor C2 spike.
//
// For each of the two manifest variants (with / without host_permissions
// for http://127.0.0.1:21325), load a minimal MV3 extension in Chrome
// via Playwright and have it:
//   (a) fetch http://127.0.0.1:21325/ from the OFFSCREEN DOCUMENT
//   (b) fetch the same URL from the BACKGROUND SERVICE WORKER
//
// Captures the exact status code, body snippet, or error name/message
// for each, so we can distinguish:
//   - success → chrome-extension:// → loopback is NOT PNA-blocked
//   - "Failed to fetch" + console CORS-PNA warning → PNA-blocked
//   - permission-denied error → missing host_permissions (not PNA)
//
// PNA is keyed on address space (loopback), not port — so this answers
// the gating question regardless of the eventual production port.
//
// Prereqs:
//   * loopback-server.cjs already running on http://127.0.0.1:21325
//     (`node loopback-server.cjs`)
//   * node_modules symlinked to metamask-speculos (has playwright)

const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { chromium } = require('playwright');

const SPIKE_DIR = __dirname;
const EXT_SRC = path.join(SPIKE_DIR, 'extension');

// Locate the Playwright-bundled Chromium. We use the headed build
// (chromium-NNNN/chrome-mac-arm64/...) because MV3 extensions don't
// load in the headless shell. The metamask-speculos checkout ships
// playwright 1.59.1 which resolves to chromium-1208.
function findChromium() {
  if (process.env.PW_CHROMIUM_PATH) return process.env.PW_CHROMIUM_PATH;
  const candidates = [
    '/Users/montelai/Library/Caches/ms-playwright/chromium-1208/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  // Fallback: let Playwright decide (it will use its registry).
  return undefined;
}

// Build a one-shot extension dir using the requested manifest variant.
function buildExtDir(variant) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'c2-pna-'));
  // Copy all extension files except manifest variants.
  for (const name of fs.readdirSync(EXT_SRC)) {
    if (name.startsWith('manifest.')) continue;
    fs.copyFileSync(path.join(EXT_SRC, name), path.join(tmp, name));
  }
  // Install the requested manifest as the active manifest.json.
  fs.copyFileSync(
    path.join(EXT_SRC, `manifest.${variant}.json`),
    path.join(tmp, 'manifest.json'),
  );
  return tmp;
}

async function runVariant(variant) {
  const extDir = buildExtDir(variant);
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'c2-pna-ud-'));
  const launchArgs = [
    `--disable-extensions-except=${extDir}`,
    `--load-extension=${extDir}`,
    '--no-first-run',
    '--no-default-browser-check',
  ];
  const executablePath = findChromium();

  const header = `=== variant: ${variant} ===\next dir: ${extDir}\nuser data: ${userDataDir}\nexec: ${executablePath || '(playwright default)'}\n`;
  process.stdout.write(header);

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: launchArgs,
    executablePath,
    viewport: { width: 800, height: 600 },
  });

  let outcome;
  try {
    // Wait for the test.html tab that background.js opens on install.
    // The page is created with about:blank first; we wait for it to
    // navigate to the chrome-extension://.../test.html URL.
    const testPage = await context.waitForEvent('page', { timeout: 15000 });
    await testPage.waitForURL(/test\.html(\?.*)?$/, { timeout: 15000 });
    await testPage.waitForLoadState('domcontentloaded', { timeout: 10000 });

    // Wait for #status == 'DONE' (or ERROR).
    await testPage.waitForFunction(
      () => {
        const s = document.getElementById('status');
        return s && (s.textContent === 'DONE' || s.textContent === 'ERROR');
      },
      null,
      { timeout: 20000 },
    );

    const status = await testPage.textContent('#status');
    const resultsText = await testPage.textContent('#results');
    outcome = { variant, status, resultsText };
  } catch (err) {
    outcome = { variant, status: 'DRIVER_ERROR', error: String(err && err.stack ? err.stack : err) };
  } finally {
    try { await context.close(); } catch {}
  }
  return outcome;
}

function classify(variantResult) {
  const text = variantResult.resultsText || '';
  // Parse the stored JSON to inspect per-context outcomes.
  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = null; }
  if (!parsed) return { pna: 'UNKNOWN', reason: 'results not JSON' };

  function ctxSummary(name) {
    const c = parsed[name];
    if (!c) return { name, ok: false, reason: 'missing' };
    if (c.ok) return { name, ok: true, status: c.status, ms: c.ms };
    return {
      name,
      ok: false,
      errorName: c.errorName,
      errorMessage: c.errorMessage,
    };
  }
  return {
    sw: ctxSummary('sw'),
    offscreen: ctxSummary('offscreen'),
  };
}

async function main() {
  const variants = ['with', 'without'];
  const outcomes = [];
  for (const v of variants) {
    const r = await runVariant(v);
    outcomes.push({ ...r, classified: classify(r) });
    console.log('\n--- result:', v, '---');
    console.log('status:', r.status);
    console.log('results:', r.resultsText);
    console.log('classified:', JSON.stringify(classify(r), null, 2));
  }

  // Decision per task spec:
  //   (a) offscreen fetch (with host_permissions) SUCCEEDS → C2 viable.
  const withOff = outcomes.find((o) => o.variant === 'with');
  const offOk = withOff && withOff.classified && withOff.classified.offscreen && withOff.classified.offscreen.ok;
  const swOk = withOff && withOff.classified && withOff.classified.sw && withOff.classified.sw.ok;

  console.log('\n=== PNA DECISION ===');
  if (offOk && swOk) {
    console.log('C2 PNA-ALLOWED');
    console.log('Both offscreen document and service worker (chrome-extension:// origin) successfully fetched http://127.0.0.1:21325 with host_permissions.');
  } else if (offOk || swOk) {
    console.log('C2 PARTIAL');
    console.log('Only one of {offscreen,sw} succeeded with host_permissions.');
  } else {
    console.log('C2 PNA-BLOCKED');
    console.log('chrome-extension:// → loopback fetch failed even with host_permissions. See per-context errors above.');
  }

  const withoutOff = outcomes.find((o) => o.variant === 'without');
  const withoutAnyOk =
    withoutOff &&
    withoutOff.classified &&
    ((withoutOff.classified.offscreen && withoutOff.classified.offscreen.ok) ||
      (withoutOff.classified.sw && withoutOff.classified.sw.ok));
  console.log('\n=== HOST_PERMISSIONS IMPLICATION ===');
  if (withoutAnyOk) {
    console.log('NO_NEW_HOST_PERMISSIONS_NEEDED');
    console.log('Loopback fetch succeeded even WITHOUT host_permissions for 127.0.0.1:21325 — extension origins may fetch loopback without explicit permission.');
  } else {
    console.log('HOST_PERMISSIONS_REQUIRED');
    console.log('Loopback fetch failed without host_permissions; production MM extension MUST add `http://127.0.0.1:21325/*` (or the trezord URL) to host_permissions for C2.');
  }

  process.exit(0);
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
