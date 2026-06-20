// Bundles @trezor/connect's NODE entry point (lib/index.js — same code path
// Phase 0's Approach B used) + @trezor/transport into a browser-ready IIFE.
//
// We bypass the package's "browser" field (which redirects to a stub that
// throws "Method_InvalidPackage") by importing the Node entry directly.
// The Node SDK has NO iframe — when given `transports:[new BridgeTransport(...)]`
// it runs the transport from the calling thread (here: the offscreen document).
// That is exactly the C2 mechanism.
//
// Run:   node build-connect-bundle.cjs

const { build } = require('/Users/montelai/consensys/metamask-extension/node_modules/esbuild');
const path = require('node:path');
const fs = require('node:fs');

const MMEXT = '/Users/montelai/consensys/metamask-extension/node_modules';
const banner = fs.readFileSync(path.join(__dirname, 'shims', 'banner.js'), 'utf8');

// Direct paths to the Node entry points — bypass the browser field.
const entryStub = path.join(__dirname, '_entry.js');
fs.writeFileSync(
  entryStub,
  `
  // Direct path bypasses @trezor/connect's "browser" field (which redirects
  // to a Method_InvalidPackage stub). The Node entry has no iframe.
  import TrezorConnect from ${JSON.stringify(path.join(MMEXT, '@trezor/connect/lib/index.js'))};
  import { BridgeTransport, Messages } from ${JSON.stringify(path.join(MMEXT, '@trezor/transport/lib/index.js'))};
  export { TrezorConnect, BridgeTransport, Messages };
  `,
);

async function main() {
  const out = path.join(__dirname, 'extension', 'trezor-connect.bundle.js');
  await build({
    entryPoints: [entryStub],
    bundle: true,
    format: 'iife',
    globalName: 'TrezorSDK',
    // platform: 'node' would be ideal but we want browser-ready shims.
    // Use 'browser' so esbuild provides shimmed built-ins where possible.
    platform: 'browser',
    target: ['chrome118'],
    outfile: out,
    logLevel: 'info',
    nodePaths: [MMEXT],
    banner: { js: banner },
    inject: [path.join(__dirname, 'shims', 'inject.js')],
    // Conditions: prefer "node" / "require" over "browser" / "import"
    // so the SDK's Node entry code path is used inside sub-dependencies.
    conditions: ['node', 'require'],
    mainFields: ['main', 'module'],
    alias: {
      'usb': path.join(__dirname, 'shims', 'empty.js'),
      'node-usb': path.join(__dirname, 'shims', 'empty.js'),
      'dgram': path.join(__dirname, 'shims', 'empty.js'),
      'node-fetch': path.join(__dirname, 'shims', 'node-fetch.js'),
      'crypto': path.join(MMEXT, 'crypto-browserify/index.js'),
      'stream': path.join(MMEXT, 'stream-browserify/index.js'),
      // @trezor/utxo-lib pulls in Bitcoin-only address types (p2tr, p2pkh,
      // ...) that transitively require crypto.createHash (crypto-browserify
      // doesn't expose it). We're only testing Ethereum getPublicKey, so
      // stub the whole module (see shims/utxo-lib/{,lib/*}.js). Address
      // subpaths used by @trezor/connect are aliased to matching stub files.
      '@trezor/utxo-lib': path.join(__dirname, 'shims', 'utxo-lib'),
      '@trezor/utxo-lib/lib/address': path.join(__dirname, 'shims', 'utxo-lib', 'lib', 'address.js'),
      '@trezor/utxo-lib/lib/txWeightCalculator': path.join(__dirname, 'shims', 'utxo-lib', 'lib', 'txWeightCalculator.js'),
    },
    define: {
      'process.env.NODE_ENV': '"production"',
      'process.env.TREZOR_BROWSER_DEEPLINK': '""',
      'process.platform': '"browser"',
    },
  });
  console.log('wrote', out, fs.statSync(out).size, 'bytes');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
