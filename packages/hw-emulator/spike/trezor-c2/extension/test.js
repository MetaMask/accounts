// Test page — opens automatically on extension install (see background.js).
// Drives the test by messaging the service worker, then polls
// chrome.storage.local for results and renders them in the DOM
// (Playwright reads #results + #status to capture the outcome).

const statusEl = document.getElementById('status');
const resultsEl = document.getElementById('results');

function render(obj) {
  resultsEl.textContent = JSON.stringify(obj, null, 2);
}

async function waitForResults(timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const { 'pna-results': results, done } = await chrome.storage.local.get([
      'pna-results',
      'done',
    ]);
    if (done && results) return results;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('timed out waiting for pna-results');
}

async function main() {
  statusEl.textContent = 'sending run-tests to service worker…';
  // Kick off the test. (Response is also stored in storage.)
  chrome.runtime.sendMessage({ type: 'run-tests' }, () => {
    // ignore response here; we poll storage for the canonical record
    void chrome.runtime.lastError;
  });
  statusEl.textContent = 'waiting for results…';
  const results = await waitForResults();
  statusEl.textContent = 'DONE';
  render(results);
}

main().catch((err) => {
  statusEl.textContent = 'ERROR';
  resultsEl.textContent = String(err && err.stack ? err.stack : err);
});
