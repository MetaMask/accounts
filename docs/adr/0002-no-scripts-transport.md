# ADR-0002: No-scripts transport architecture for the QR emulator

| Field    | Value                                                                  |
| -------- | ---------------------------------------------------------------------- |
| Status   | Accepted                                                               |
| Date     | 2026-06-19                                                             |
| Context  | `feat/hw-emulators-master` planning                                    |
| Related  | [QR Emulator Spec](../specs/qr-emulator.md), [ADR-0001](./0001-qr-emulator-placement.md) |

## Context

The QR hardware wallet emulator must deliver its output (BC-UR-encoded QR codes) and receive its input (sign-request QR codes that MetaMask renders) through some transport. The transport choice determines:

- **Where test hooks live.** A transport that mocks at a high abstraction layer (e.g. `QrKeyringBridge.requestScan`) forces production code to be aware of test mode. A transport that mocks at a low layer (e.g. OS device) keeps production code clean.
- **What runs for real.** A transport that bypasses the camera skips exercising the scanner overlay, zxing decoder, and `@ngraveio/bc-ur` fountain decoder. A transport that runs through the real camera exercises the full production pipeline.
- **Browser portability.** A transport that relies on `page.addInitScript` or build-time bundle injection works in any browser. A transport that relies on Chrome-only flags restricts the test matrix.
- **Concurrency.** A transport that uses synthetic MediaStreams can run many parallel instances in one browser. A transport that uses the OS camera device is limited by the OS camera device model.

The team considered a three-layer design ("L1 bridge-mock / L2 frame-feed / L3 camera-feed") and an explicit rejection of script injection. This ADR records the no-scripts decision and its rationale.

## Decision

Adopt the **no-scripts transport architecture**. The emulator produces QR codes as Y4M files on disk. Chrome's `--use-fake-device-for-media-stream` and `--use-file-for-fake-video-capture=<path>` flags feed those files to the production `getUserMedia` implementation. The production scanner UI, zxing decoder, `@ngraveio/bc-ur` fountain decoder, `QrKeyringScannerBridge`, and `QrKeyring` all run unmodified.

For sign-request capture (the bidirectional case), the test driver uses **only Playwright's native DOM APIs** (`locator.screenshot()`, `locator.click()`) — never `page.addInitScript` and never `page.evaluate`. The test driver decodes screenshots in Node via `@zxing/library` and routes reconstructed URs to the emulator.

No transport adapter abstraction, no script injection helpers, no build variants.

## Rationale

Three factors drove the decision:

### 1. The no-scripts architecture is the only one that lets us delete `FakeQrBridge` without replacing it with anything in the bundle.

The current `metamask-extension` QR test path uses `process.env.IN_TEST` to swap `QrKeyringScannerBridge` for `FakeQrBridge` at build time:

```ts
const overrides = process.env.IN_TEST
  ? { qrBridge: require('../../../test/stub/keyring-bridge').FakeQrBridge }
  : {};
qrKeyringBuilderFactory(QrKeyring, overrides?.qrBridge || QrKeyringScannerBridge, ...);
```

This is a **test hook in production code** — exactly the antipattern we are trying to eliminate. Any transport that operates at the `QrKeyringBridge` layer would replace `FakeQrBridge` with another `QrKeyringBridge` implementation, leaving the production-code test hook in place. Only a transport that operates below that layer (at the OS camera device) lets us delete the hook entirely.

### 2. Mocking at the OS camera boundary is **lower in the stack** than the Ledger equivalent and exercises strictly more of the production pipeline.

The Ledger/Speculos pattern mocks at the browser API boundary (`navigator.hid` via an injected WebHID mock script). Everything above that — `LedgerOffscreenBridge`, APDU framing, the entire Ledger JS stack — runs for real. The QR equivalent mocks at the OS device boundary (`getUserMedia` via Chrome flag). Everything above that — `QrKeyringScannerBridge`, scanner overlay, zxing, `@ngraveio/bc-ur` decoder, `QrKeyring` — runs for real.

The QR boundary is lower than Ledger's, which means QR tests exercise **more** of the production pipeline than Ledger tests do, not less. This is a stronger fidelity guarantee, not a weaker one.

### 3. The trade-offs of no-scripts are acceptable and well-mitigated.

| Trade-off | Mitigation |
| --- | --- |
| Chrome-only (no Firefox). | Ledger E2E is also Chrome-only (WebHID is Chrome-only). Firefox can be added later via a thin `getUserMedia`-override script if a need is demonstrated. |
| Slower per test (~3–5s per scan vs <5ms for bridge mock). | Keep E2E test count small (5–10 critical paths). The QR keyring already has comprehensive Jest unit tests for breadth. |
| Single-video-device-per-Chrome limit. | Already in the concurrency model: one Chromium instance per Playwright worker, each with a unique Y4M feed path. |
| Cannot test the scanner overlay UI in isolation. | The scanner overlay is already covered by Jest unit tests (`useDecoderLifecycle.test.ts`, `qr-utils.test.ts`). |

## Consequences

**Positive:**

- Production code (`app/scripts/wallet-init/keyrings.ts`) has zero QR-related test hooks after cleanup.
- `test/stub/keyring-bridge.js` loses its `FakeQrBridge` class and frozen `KNOWN_QR_*` artifacts.
- `test/e2e/tests/hardware-wallets/qr-account.spec.ts` can be unskipped and rewritten to assert against emulator-derived addresses.
- Tests exercise the **exact** production path. Any production bug in the scanner, decoder, or keyring is caught. No mock drift.
- The emulator package has one job: synthesise URs and render QR files. Clean boundary, no transport abstractions to maintain.
- Symmetric with the real device model: a real QR device has no "fast path" that bypasses the camera. Why should our tests?

**Negative:**

- Firefox E2E is unsupported. Acceptable: Ledger is in the same boat.
- CI requires Chrome flags support, which is universal across Linux/macOS/Windows Chromium builds.
- Parallel test shards require parallel Chrome instances (one Y4M feed per worker). Slightly heavier than pure-JS mocks but standard for Playwright hardware-wallet testing.

## Alternatives considered

### L1 — Bridge mock transport (`createQrTransport('bridge-mock', ...)`)

Replaces `QrKeyringBridge.requestScan` with a stub that returns emulator-generated URs directly.

- **Why considered:** Fast (<5ms), works in any browser, exercises keyring logic without camera.
- **Why rejected:**
  - Forces production code to retain a test hook (`overrides?.qrBridge ||`), preventing deletion of `FakeQrBridge`'s structural footprint.
  - Skips the scanner overlay, zxing decoder, and `@ngraveio/bc-ur` decoder — all production code that can break.
  - The "fast" benefit is redundant: the QR keyring's Jest unit tests already cover this layer with a 3-line mock bridge.

### L2 — Frame-feed transport (`createQrTransport('frame-feed', ...)`)

Overrides `navigator.mediaDevices.getUserMedia` via `page.addInitScript` to return a synthetic `MediaStream` built from a `<canvas>` drawing QR frames at 5fps. zxing consumes the synthetic stream through its normal `BrowserQRCodeReader` pipeline.

- **Why considered:** Exercises the scanner overlay UI and zxing decoder without requiring the OS camera. Could run in Firefox.
- **Why rejected:**
  - Requires script injection (`page.addInitScript`), which is exactly what we are rejecting.
  - The scanner overlay UI is already covered by Jest unit tests (`useDecoderLifecycle.test.ts`). E2E coverage at this layer adds little.
  - Firefox support is not currently a requirement (Ledger E2E is also Chrome-only).
  - Adds a transport abstraction that must be maintained alongside L3.

### L3-only with transport adapter contract

A unified `QrTransportAdapter` interface (`getInitScript`, `getLaunchArgs`, `beforeScan`) supporting L1/L2/L3 from one package.

- **Why considered:** Maximum flexibility; future-proof for Firefox.
- **Why rejected:** All three adapters exist only because L1 and L2 need to bypass the camera. Once you commit to no-scripts, L1 collapses into "ordinary Jest unit tests" and L2 disappears. The adapter abstraction becomes a single-implementation interface — pure overhead.

## Implementation risk

One risk identified during design:

**R1 — Chrome fake-camera fps ↔ zxing decoder compatibility.** Chrome loops the Y4M at the file's declared fps; MM's scanner samples via `requestAnimationFrame` and feeds frames to zxing. A mismatch could in principle cause repeated-frame reads that confuse the fountain decoder. Mitigation: one-hour spike before locking the implementation plan (see [Spec §12.1](../specs/qr-emulator.md#121-r1--chrome-fake-camera-fps--zxing-decoder-compatibility)). If flaky, bump Y4M fps from 5 to 10–15. This is a tuning parameter, not an architectural risk.

## References

- [QR Emulator Spec §5.3 (data flow), §12.1 (R1)](../specs/qr-emulator.md)
- Chrome flag documentation: https://peter.sh/experiments/chromium-command-line-flags/#use-fake-device-for-media-stream
- Ledger precedent: `getWebHidMockScript()` in `packages/hw-emulator/src/ledger/`
