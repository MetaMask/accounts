// MV3 service worker for the C2 PNA spike.
//
// Responsibilities:
//   1. On install: create the offscreen document + open the test page
//      (so Playwright can find it without computing the extension ID).
//   2. On 'run-tests' message from the test page:
//        (b) do a SW-direct fetch to http://127.0.0.1:21325/
//        (a) ask the offscreen document to do the same fetch
//      Record both results (status, body, or exact error) in
//      chrome.storage.local under key 'pna-results' and set 'done':true.
//
// All timing/errors are captured verbatim — the goal is to see exactly
// what Chrome allows/blocks in each context.

const LOOPBACK_URL = 'http://127.0.0.1:21325/';
const OFFSCREEN_URL = 'offscreen.html';

async function hasOffscreenDocument() {
  if ('getContext' in chrome.runtime) {
    const ctx = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
    });
    return ctx.length > 0;
  }
  // Older fallback.
  return await chrome.offscreen.hasDocument();
}

async function ensureOffscreen() {
  if (await hasOffscreenDocument()) return;
  await chrome.offscreen.createDocument({
    url: OFFSCREEN_URL,
    reasons: ['DOM_PARSER'],
    justification:
      'Run a fetch from chrome-extension:// offscreen context to test PNA behavior (mirrors how @trezor/connect-web would run here in production).',
  });
}

async function swFetch() {
  const t0 = Date.now();
  try {
    const res = await fetch(LOOPBACK_URL, { method: 'GET' });
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
      errorString: String(err),
      ms: Date.now() - t0,
    };
  }
}

async function offscreenFetch() {
  const t0 = Date.now();
  try {
    const res = await chrome.runtime.sendMessage({ type: 'offscreen-fetch', url: LOOPBACK_URL });
    return { context: 'offscreen-document', ms: Date.now() - t0, ...res };
  } catch (err) {
    return {
      context: 'offscreen-document',
      ok: false,
      errorName: err && err.name,
      errorMessage: err && err.message,
      errorString: String(err),
      ms: Date.now() - t0,
    };
  }
}

async function runTests() {
  await ensureOffscreen();
  const sw = await swFetch();
  const off = await offscreenFetch();
  const results = {
    loopbackUrl: LOOPBACK_URL,
    startedAt: new Date().toISOString(),
    sw,
    offscreen: off,
  };
  await chrome.storage.local.set({ 'pna-results': results, done: true });
  return results;
}

chrome.runtime.onInstalled.addListener(async () => {
  try {
    await ensureOffscreen();
  } catch (err) {
    console.error('ensureOffscreen on install failed:', err);
  }
  // Open the test page automatically so Playwright can latch on without
  // computing the extension ID.
  try {
    await chrome.tabs.create({ url: chrome.runtime.getURL('test.html') });
  } catch (err) {
    console.error('tabs.create failed:', err);
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === 'run-tests') {
    runTests()
      .then((r) => sendResponse({ ok: true, results: r }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true; // async response
  }
  if (msg && msg.type === 'ping') {
    sendResponse({ ok: true, pong: true });
    return false;
  }
});
