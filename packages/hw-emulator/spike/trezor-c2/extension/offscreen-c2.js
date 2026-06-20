// Part 2 offscreen script — the actual C2 mechanism proof.
//
// Runs in a chrome-extension:// offscreen document (same origin as
// MetaMask's production offscreen). Loads the headless @trezor/connect
// SDK (no iframe), injects a BridgeTransport pointing at the local
// trezord bridge, inits the SDK, and calls getPublicKey for the SLIP-14
// path. If Part 1 passed (offscreen→loopback PNA-allowed) AND the bridge
// is reachable, this MUST return success:true with the canonical SLIP-14
// xpub.
//
// NOTE: chrome.storage is NOT exposed in this offscreen document context
// (probe-after.js confirms only chrome.{runtime,loadTimes,csi} are
// present), so we avoid it. We broadcast stage progress via
// chrome.runtime.sendMessage so the test page can surface it.

const BRIDGE_URL = 'http://127.0.0.1:21328';
const SLIP14_PATH = "m/44'/60'/0'/0";
const EXPECTED_XPUB =
  'xpub6DainZd2Amf7GkkBwKLnfBRDBBrWCf9GWCRwjbMJKweKa9MN2xqhbAH5Myh3uJXkna47WLK8qH7NYn4CsasoqAyHxa4BB5daRqaVBfauhMP';

function progress(stage, extra) {
  // Fire-and-forget progress messages — the test page listens and renders.
  try {
    chrome.runtime.sendMessage({
      type: 'c2-progress',
      stage,
      at: Date.now(),
      ...(extra || {}),
    }).catch(() => {});
  } catch {}
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === 'offscreen-c2-run') {
    runC2(msg.bridgeUrl || BRIDGE_URL)
      .then((r) => {
        progress('responding', { ok: r.ok, stage: r.stage });
        sendResponse(r);
      })
      .catch((err) => {
        progress('failed', { error: String(err) });
        sendResponse({ ok: false, error: String(err && err.stack ? err.stack : err) });
      });
    return true;
  }
});

async function runC2(bridgeUrl) {
  progress('start', { bridgeUrl });
  const sdk = window.TrezorSDK;
  if (!sdk || !sdk.TrezorConnect || !sdk.BridgeTransport || !sdk.Messages) {
    return {
      ok: false,
      stage: 'bundle-load',
      error: 'window.TrezorSDK missing expected exports',
      sdkKeys: sdk ? Object.keys(sdk) : null,
      bundleErrors: window.__bundleErrors || [],
      postBundleState: window.__postBundleState || null,
    };
  }
  const { TrezorConnect, BridgeTransport, Messages } = sdk;

  progress('transport-construct');
  let transport;
  try {
    transport = new BridgeTransport({
      url: bridgeUrl,
      messages: Messages,
      id: 'c2-spike',
    });
  } catch (err) {
    return { ok: false, stage: 'transport-construct', error: String(err) };
  }

  progress('init-start');
  try {
    await TrezorConnect.init({
      manifest: {
        appName: 'c2-spike',
        appUrl: 'http://localhost',
        email: 's@p.local',
      },
      transports: [transport],
      webusb: false,
      popup: false,
    });
  } catch (err) {
    return { ok: false, stage: 'init', error: String(err) };
  }
  progress('init-done');

  progress('getPublicKey-start', { path: SLIP14_PATH, coin: 'eth' });
  let result;
  try {
    result = await TrezorConnect.getPublicKey({
      path: SLIP14_PATH,
      coin: 'eth',
    });
  } catch (err) {
    return { ok: false, stage: 'getPublicKey-threw', error: String(err) };
  }
  progress('getPublicKey-done', { success: result && result.success });

  const xpub = result && result.payload && result.payload.xpub;
  const xpubMatches = xpub === EXPECTED_XPUB;
  return {
    ok: !!(result && result.success),
    stage: 'getPublicKey',
    success: result && result.success,
    xpub,
    xpubMatchesExpected: xpubMatches,
    expectedXpub: EXPECTED_XPUB,
    raw: JSON.parse(JSON.stringify(result || {})),
  };
}
