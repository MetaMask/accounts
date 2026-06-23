import { getTrezorConnectSrcInjectionScript } from './html-injector';
import { TREZOR_CONNECT_SRC } from './constants';

describe('getTrezorConnectSrcInjectionScript', () => {
  it('returns a script that sets window.__TREZOR_CONNECT_SRC to the connectSrc constant', () => {
    const script = getTrezorConnectSrcInjectionScript();
    expect(script).toBe(
      `window.__TREZOR_CONNECT_SRC = '${TREZOR_CONNECT_SRC}';`,
    );
    expect(script).toContain(TREZOR_CONNECT_SRC);
  });

  it('is usable as a <script> tag body', () => {
    const script = getTrezorConnectSrcInjectionScript();
    const full = `<script>${script}</script>`;
    expect(full).toContain('<script>window.__TREZOR_CONNECT_SRC');
    expect(full).toContain('</script>');
  });
});
