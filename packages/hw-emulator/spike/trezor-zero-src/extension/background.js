// Service worker. Creates the offscreen doc + opens the test page on
// install so Playwright can latch on without computing the extension ID.

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
    justification: 'Run @trezor/connect-web in chrome-extension:// offscreen context to validate zero-source-change Trezor transport architecture.',
  });
}

chrome.runtime.onInstalled.addListener(async () => {
  try { await ensureOffscreen(); } catch (e) { console.error('offscreen:', e); }
  try { await chrome.tabs.create({ url: chrome.runtime.getURL('test.html') }); } catch (e) { console.error('tab:', e); }
});

// Relay messages between test page and offscreen doc.
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === 'run-zero-src') {
    chrome.runtime.sendMessage({ type: 'offscreen-zero-src-run' })
      .then((r) => sendResponse(r))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }
});
