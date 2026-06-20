// Runs BEFORE the bundle (script tag order in offscreen-c2.html).
// MV3 CSP blocks inline scripts, so this MUST be an external file.
// Sets up error capture for the bundle load.
window.__bundleErrors = [];
window.addEventListener('error', function (e) {
  window.__bundleErrors.push({
    type: 'error',
    message: e.message,
    filename: (e.filename || '').slice(-80),
    lineno: e.lineno,
    colno: e.colno,
    error: e.error && (e.error.stack || String(e.error)),
  });
});
window.addEventListener('unhandledrejection', function (e) {
  window.__bundleErrors.push({
    type: 'unhandledrejection',
    reason: e.reason && (e.reason.stack || String(e.reason)),
  });
});
