// Test page for Part 2. Sends 'run-c2-confirm' to the service worker,
// which forwards to the offscreen document. Renders stage-progress
// messages as they arrive + the final result.

const statusEl = document.getElementById('status');
const resultsEl = document.getElementById('results');

function setProgress(msg) {
  const ts = new Date(msg.at || Date.now()).toISOString().slice(11, 19);
  const line = `[${ts}] ${msg.stage}${msg.error ? ' :: ' + msg.error : ''}${
    msg.success !== undefined ? ' (success=' + msg.success + ')' : ''
  }${msg.ok !== undefined ? ' (ok=' + msg.ok + ')' : ''}`;
  resultsEl.textContent = resultsEl.textContent + line + '\n';
}

function render(obj) {
  resultsEl.textContent = resultsEl.textContent + '\n=== FINAL ===\n' + JSON.stringify(obj, null, 2);
}

// Listen for progress broadcasts from the offscreen document.
chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === 'c2-progress') {
    setProgress(msg);
  }
});

async function main() {
  statusEl.textContent = 'sending run-c2-confirm…';
  resultsEl.textContent = '';
  const resp = await new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'run-c2-confirm' }, (r) => {
      void chrome.runtime.lastError;
      resolve(r);
    });
  });
  statusEl.textContent = 'DONE';
  render(resp || { ok: false, error: 'no response' });
}

main().catch((err) => {
  statusEl.textContent = 'ERROR';
  resultsEl.textContent = String(err && err.stack ? err.stack : err);
});
