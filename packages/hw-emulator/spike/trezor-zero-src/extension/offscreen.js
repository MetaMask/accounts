// Part 2 logic: runs the UNMODIFIED production init+getPublicKey path
// against the zero-source-change wiring (__TREZOR_CONNECT_SRC injection).
//
// This MUST mirror app/offscreen/hardware-wallets/trezor.ts:52 EXACTLY:
//   TrezorConnect.init({ manifest, env: 'webextension' })
//   TrezorConnect.getPublicKey({ path, coin })
//
// NO `connectSrc`, NO `transports`, NO `popup` override. The ONLY
// test-side intervention is window.__TREZOR_CONNECT_SRC set in
// inject-global.js (build/wiring-time, like the Ledger navigator.hid mock).

const SLIP14_PATH = "m/44'/60'/0'/0";
const EXPECTED_XPUB =
  'xpub6DainZd2Amf7GkkBwKLnfBRDBBrWCf9GWCRwjbMJKweKa9MN2xqhbAH5Myh3uJXkna47WLK8qH7NYn4CsasoqAyHxa4BB5daRqaVBfauhMP';

function progress(stage, extra) {
  try {
    chrome.runtime.sendMessage({
      type: 'zero-src-progress', stage, at: Date.now(), ...(extra || {}),
    }).catch(() => {});
  } catch {}
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === 'offscreen-zero-src-run') {
    run()
      .then((r) => { progress('responding', { ok: r.ok, stage: r.stage }); sendResponse(r); })
      .catch((err) => { progress('failed', { error: String(err) }); sendResponse({ ok: false, error: String(err && err.stack ? err.stack : err) }); });
    return true;
  }
});

async function run() {
  progress('start');
  const sdk = window.TrezorConnectWeb && window.TrezorConnectWeb.default;
  if (!sdk || typeof sdk.init !== 'function') {
    return {
      ok: false, stage: 'bundle-load',
      error: 'TrezorConnect default export missing or init not a function',
      postBundleState: window.__postBundleState || null,
    };
  }

  // === THE PRODUCTION INIT CALL (mirrors trezor.ts:52) ===
  // In zero-source mode, this is EXACTLY what production does — no popup
  // override. If window.__SPIKE_FORCE_POPUP_FALSE is set (spike-only
  // diagnostic), popup:false is added to isolate whether popup:true is
  // the blocker.
  const spikeForcePopupFalse = window.__SPIKE_FORCE_POPUP_FALSE === true;
  const initArgs = {
    manifest: { appName: 'spike', appUrl: 'http://localhost', email: 's@p.local' },
    env: 'webextension',
  };
  if (spikeForcePopupFalse) initArgs.popup = false;

  progress('init-start', { spikeForcePopupFalse });
  try {
    await sdk.init(initArgs);
  } catch (err) {
    return { ok: false, stage: 'init', error: String(err && err.stack ? err.stack : err), postBundleState: window.__postBundleState || null };
  }
  progress('init-done', {
    iframes: window.__iframeCreations,
    iframeCount: document.querySelectorAll('iframe').length,
  });

  // Wait a moment for iframe bootstrap, then dump DOM state + message traffic.
  await new Promise((r) => setTimeout(r, 3000));
  const domState = {
    iframes: Array.from(document.querySelectorAll('iframe')).map((f) => ({
      src: f.src, sandbox: f.sandbox && f.sandbox.value, visible: f.offsetParent !== null,
    })),
    iframeCreations: window.__iframeCreations,
    messages: (window.__messages || []).slice(-15),
    messageCount: (window.__messages || []).length,
  };
  progress('pre-getPublicKey-dom', domState);

  // === THE UNMODIFIED PRODUCTION getPublicKey CALL ===
  // (with a 30s diagnostic timeout — production wouldn't need this, but
  // for the spike we want to bound the runtime and capture the failure)
  progress('getPublicKey-start', { path: SLIP14_PATH, coin: 'eth' });
  let result;
  try {
    result = await Promise.race([
      sdk.getPublicKey({ path: SLIP14_PATH, coin: 'eth' }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('getPublicKey-timeout-after-30s')), 30000),
      ),
    ]);
  } catch (err) {
    return {
      ok: false,
      stage: String(err && err.message).startsWith('getPublicKey-timeout') ? 'getPublicKey-TIMEOUT' : 'getPublicKey-threw',
      error: String(err && err.stack ? err.stack : err),
      messageCount: (window.__messages || []).length,
      messages: (window.__messages || []).slice(-25),
      allEvents: (window.__allEvents || []).slice(-15),
      openCalls: window.__openCalls || [],
      chromeAccess: window.__chromeAccess || [],
      iframeCreations: window.__iframeCreations,
      iframes: Array.from(document.querySelectorAll('iframe')).map((f) => ({
        src: f.src, sandbox: f.sandbox && f.sandbox.value, visible: f.offsetParent !== null,
      })),
    };
  }
  progress('getPublicKey-done', { success: result && result.success });

  const xpub = result && result.payload && result.payload.xpub;
  return {
    ok: !!(result && result.success),
    stage: 'getPublicKey',
    success: result && result.success,
    xpub,
    xpubMatchesExpected: xpub === EXPECTED_XPUB,
    expectedXpub: EXPECTED_XPUB,
    raw: JSON.parse(JSON.stringify(result || {})),
  };
}
