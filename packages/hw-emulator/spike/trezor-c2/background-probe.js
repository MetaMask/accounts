// Background SW for the bridge-origin probe. Same as background.js BUT
// additionally does a POST /enumerate against the REAL trezord-go bridge
// to determine whether the offscreen document's Origin gets whitelisted.

const LOOPBACK_URL = 'http://127.0.0.1:21325/';
const BRIDGE_ENUMERATE_URL = 'http://127.0.0.1:21325/enumerate';
const OFFSCREEN_URL = 'offscreen.html';

async function hasOffscreenDocument() {
  if ('getContext' in chrome.runtime) {
    const ctx = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
    return ctx.length > 0;
  }
  return await chrome.offscreen.hasDocument();
}

async function ensureOffscreen() {
  if (await hasOffscreenDocument()) return;
  await chrome.offscreen.createDocument({
    url: OFFSCREEN_URL,
    reasons: ['DOM_PARSER'],
    justification: 'Probe offscreen context PNA + Origin behavior against the real trezord-go bridge.',
  });
}

async function swFetch(url, method) {
  const t0 = Date.now();
  try {
    const res = await fetch(url, { method });
    const text = await res.text();
    return {
      context: 'service-worker',
      ok: true,
      status: res.status,
      statusText: res.statusText,
      bodySnippet: text.slice(0, 400),
      ms: Date.now() - t0,
    };
  } catch (err) {
    return {
      context: 'service-worker',
      ok: false,
      errorName: err && err.name,
      errorMessage: err && err.message,
      ms: Date.now() - t0,
    };
  }
}

async function offscreenFetch(url, method) {
  const t0 = Date.now();
  try {
    const res = await chrome.runtime.sendMessage({ type: 'offscreen-fetch', url, method });
    return { context: 'offscreen-document', ms: Date.now() - t0, ...res };
  } catch (err) {
    return {
      context: 'offscreen-document',
      ok: false,
      errorName: err && err.name,
      errorMessage: err && err.message,
      ms: Date.now() - t0,
    };
  }
}

async function runTests() {
  await ensureOffscreen();
  // 1. Simple GET to synthetic-loopback-style URL (proves PNA again)
  const swGet = await swFetch(LOOPBACK_URL, 'GET');
  const offGet = await offscreenFetch(LOOPBACK_URL, 'GET');
  // 2. POST /enumerate against the REAL trezord-go bridge (Origin check)
  const swPostEnum = await swFetch(BRIDGE_ENUMERATE_URL, 'POST');
  const offPostEnum = await offscreenFetch(BRIDGE_ENUMERATE_URL, 'POST');
  const results = {
    loopbackGet: { sw: swGet, offscreen: offGet },
    bridgeEnumeratePost: { sw: swPostEnum, offscreen: offPostEnum },
    startedAt: new Date().toISOString(),
  };
  await chrome.storage.local.set({ 'pna-results': results, done: true });
  return results;
}

chrome.runtime.onInstalled.addListener(async () => {
  try { await ensureOffscreen(); } catch (err) { console.error(err); }
  try { await chrome.tabs.create({ url: chrome.runtime.getURL('test.html') }); } catch (err) { console.error(err); }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === 'run-tests') {
    runTests().then((r) => sendResponse({ ok: true, results: r })).catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }
});
