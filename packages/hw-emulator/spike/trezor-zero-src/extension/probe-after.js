// Runs AFTER the bundle. Captures post-load state for diagnostics.
window.__postBundleState = {
  at: Date.now(),
  connectSrc: window.__TREZOR_CONNECT_SRC,
  hasTrezorConnect: typeof (window.TrezorConnectWeb && window.TrezorConnectWeb.default),
  bundleErrors: window.__bundleErrors || [],
  hasChrome: typeof chrome,
  chromeKeys: (typeof chrome === 'object' && chrome) ? Object.keys(chrome).slice(0, 20) : null,
};
