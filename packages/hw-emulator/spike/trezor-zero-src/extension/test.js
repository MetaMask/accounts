// Test page. Sends 'run-zero-src' to the SW (which forwards to offscreen),
// renders stage-progress + final result.

const statusEl = document.getElementById('status');
const resultsEl = document.getElementById('results');

function setProgress(msg) {
  const ts = new Date(msg.at || Date.now()).toISOString().slice(11, 19);
  // Render the full message body so diagnostics (iframe state, etc.) are visible.
  const { type, at, stage, ...rest } = msg;
  const summary = Object.keys(rest).length
    ? ' :: ' + JSON.stringify(rest).slice(0, 600)
    : '';
  const line = `[${ts}] ${stage}${summary}`;
  resultsEl.textContent = resultsEl.textContent + line + '\n';
}

function render(obj) {
  resultsEl.textContent = resultsEl.textContent + '\n=== FINAL ===\n' + JSON.stringify(obj, null, 2);
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === 'zero-src-progress') setProgress(msg);
});

async function main() {
  statusEl.textContent = 'sending run-zero-src…';
  resultsEl.textContent = '';
  const resp = await new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'run-zero-src' }, (r) => {
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
