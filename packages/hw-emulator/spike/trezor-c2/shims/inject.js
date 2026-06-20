// esbuild inject module — exports are made available to every module in
// the bundle as automatic imports. Provides Node-style globals that
// @trezor/connect (Node SDK) expects in a browser context.
//
// (We don't include `process` here — that's handled by the banner, which
// runs as plain JS at the very top of the bundle before any module code.
// Injected exports are added to each module via esbuild's import system,
// which works for symbols but not for the `process` global referenced by
// module-level code in many deps.)

export { Buffer } from 'buffer';
