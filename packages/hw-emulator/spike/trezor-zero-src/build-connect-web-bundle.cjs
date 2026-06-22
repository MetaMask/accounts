// Bundles @trezor/connect-web (the iframe-based browser SDK) for the
// offscreen document. connect-web is browser-first so this should be
// simpler than the @trezor/connect Node-SDK bundle from the C2 spike.
//
// Output: extension/trezor-connect-web.bundle.js (IIFE, exposes
// window.TrezorConnectWeb = { default: TrezorConnect }).

const { build } = require('/Users/montelai/consensys/metamask-extension/node_modules/esbuild');
const path = require('node:path');
const fs = require('node:fs');

const MMEXT = '/Users/montelai/consensys/metamask-extension/node_modules';

const entryStub = path.join(__dirname, '_entry.js');
fs.writeFileSync(
  entryStub,
  `export { default } from '@trezor/connect-web';`,
);

async function main() {
  const out = path.join(__dirname, 'extension', 'trezor-connect-web.bundle.js');
  await build({
    entryPoints: [entryStub],
    bundle: true,
    format: 'iife',
    globalName: 'TrezorConnectWeb',
    platform: 'browser',
    target: ['chrome118'],
    outfile: out,
    logLevel: 'info',
    nodePaths: [MMEXT],
    // Stub Node-only transports we don't need (same as C2 spike).
    alias: {
      'usb': path.join(__dirname, 'shims', 'empty.js'),
      'node-usb': path.join(__dirname, 'shims', 'empty.js'),
      'dgram': path.join(__dirname, 'shims', 'empty.js'),
    },
    define: {
      'process.env.NODE_ENV': '"production"',
    },
  });
  console.log('wrote', out, fs.statSync(out).size, 'bytes');
}

main().catch((e) => { console.error(e); process.exit(1); });
