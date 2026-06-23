import { TREZOR_CONNECT_SRC } from './constants';

/**
 * Produces a script string that sets `window.__TREZOR_CONNECT_SRC` on the
 * offscreen document before the `@trezor/connect-web` bundle runs.
 *
 * This is the Trezor equivalent of Ledger's HTML-injection pattern:
 * a build/wiring-time `<script>` tag patched into the offscreen HTML,
 * gated by `TREZOR_E2E=1`. Zero production source change.
 *
 * Usage in the test harness (the Ledger `patchLockdownRunForSpeculos` pattern):
 *
 *   const offscreenHtml = readFileSync('dist/offscreen.html', 'utf8');
 *   const injected = offscreenHtml.replace(
 *     '</head>',
 *     `<script>${getTrezorConnectSrcInjectionScript()}</script></head>`,
 *   );
 *   writeFileSync('dist/offscreen.html', injected);
 */
export function getTrezorConnectSrcInjectionScript(): string {
  return `window.__TREZOR_CONNECT_SRC = '${TREZOR_CONNECT_SRC}';`;
}
