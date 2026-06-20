// Offscreen document script — runs in a chrome-extension:// DOM context.
// Listens for 'offscreen-fetch' messages from the service worker and
// performs the actual fetch from THIS context (the most representative
// of where @trezor/connect-web would run in production MetaMask).

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === 'offscreen-fetch') {
    const url = msg.url || 'http://127.0.0.1:21325/';
    const method = msg.method || 'GET';
    const t0 = Date.now();
    fetch(url, { method })
      .then(async (res) => {
        const text = await res.text();
        sendResponse({
          ok: true,
          status: res.status,
          statusText: res.statusText,
          bodySnippet: text.slice(0, 400),
          ms: Date.now() - t0,
        });
      })
      .catch((err) => {
        sendResponse({
          ok: false,
          errorName: err && err.name,
          errorMessage: err && err.message,
          errorString: String(err),
          ms: Date.now() - t0,
        });
      });
    return true; // async response
  }
});
