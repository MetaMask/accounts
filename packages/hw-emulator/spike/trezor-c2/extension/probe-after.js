// Runs AFTER the bundle (script tag order in offscreen-c2.html).
// Captures the post-bundle state of window.TrezorSDK and the chrome
// object, so offscreen-c2.js can report it back via messaging.
window.__postBundleState = {
  at: Date.now(),
  typeofChrome: typeof chrome,
  chromeKeys: (typeof chrome === 'object' && chrome) ? Object.keys(chrome).slice(0, 30) : null,
  hasStorage: typeof chrome === 'object' && chrome && typeof chrome.storage,
  hasRuntime: typeof chrome === 'object' && chrome && typeof chrome.runtime,
  hasTrezorSDK: typeof window.TrezorSDK,
  sdkKeys: window.TrezorSDK ? Object.keys(window.TrezorSDK) : null,
  bundleErrors: window.__bundleErrors || [],
};
