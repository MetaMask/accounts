// MV3 service worker for Part 2 (full C2 confirmation).
// On install: create the c2 offscreen document (which loads the bundled
// headless @trezor/connect SDK) and open the test page.

const OFFSCREEN_URL = 'offscreen-c2.html';

async function hasOffscreenDocument() {
  if ('getContext' in chrome.runtime) {
    const ctx = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
    });
    return ctx.length > 0;
  }
  return await chrome.offscreen.hasDocument();
}

async function ensureOffscreen() {
  if (await hasOffscreenDocument()) return;
  await chrome.offscreen.createDocument({
    url: OFFSCREEN_URL,
    reasons: ['DOM_PARSER'],
    justification:
      'Run headless @trezor/connect against the local trezord bridge — the production C2 mechanism (transport runs inside the chrome-extension:// offscreen context).',
  });
}

chrome.runtime.onInstalled.addListener(async () => {
  try {
    await ensureOffscreen();
  } catch (err) {
    console.error('ensureOffscreen on install failed:', err);
  }
  try {
    await chrome.tabs.create({ url: chrome.runtime.getURL('test-c2.html') });
  } catch (err) {
    console.error('tabs.create failed:', err);
  }
});

// Forward 'run-c2-confirm' to the offscreen document and relay the
// response back to the sender. (offscreen-c2.js does the real work.)
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === 'run-c2-confirm') {
    chrome.runtime
      .sendMessage({ type: 'offscreen-c2-run', bridgeUrl: msg.bridgeUrl })
      .then((r) => sendResponse(r))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }
});
