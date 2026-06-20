// Banner injected at the top of the bundle — runs as plain JS before any
// bundled module executes. Provides `global` and `process` (esbuild's
// `inject` handles `Buffer` separately, in shims/inject.js).

var global = globalThis.global || globalThis;
var process = globalThis.process || {
  env: { NODE_ENV: 'production' },
  platform: 'browser',
  browser: true,
  nextTick: function (fn) { Promise.resolve().then(fn); },
  version: '',
  versions: {},
};
