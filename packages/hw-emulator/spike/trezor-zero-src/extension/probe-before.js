// Runs BEFORE the bundle. Registers error/unhandledrejection listeners
// so bundle-load failures are visible (offscreen console is invisible).
window.__bundleErrors = [];
window.addEventListener('error', function (e) {
  window.__bundleErrors.push({
    type: 'error', message: e.message,
    filename: (e.filename || '').slice(-100), lineno: e.lineno, colno: e.colno,
    error: e.error && (e.error.stack || String(e.error)),
  });
});
window.addEventListener('unhandledrejection', function (e) {
  window.__bundleErrors.push({
    type: 'unhandledrejection',
    reason: e.reason && (e.reason.stack || String(e.reason)),
  });
});
