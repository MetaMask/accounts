# ADR-0003: Trezor transport boundary — local connect-web iframe + Suite Node Bridge (`@trezor/transport-bridge`)

| Field    | Value                                                                  |
| -------- | ---------------------------------------------------------------------- |
| Status   | Accepted (locked by 4 Phase-0 spikes; see §"Evidence")                |
| Date     | 2026-06-23                                                             |
| Context  | `feat/hw-emulators-master` planning                                    |
| Related  | [Trezor Emulator Spec](../specs/trezor-emulator.md), [ADR-0001](./0001-qr-emulator-placement.md), [ADR-0002](./0002-no-scripts-transport.md) |

## Context

The Trezor hardware wallet emulator must deliver its transport between the production `@trezor/connect-web` SDK (running in MetaMask's offscreen document) and the real-firmware emulator (`trezor-user-env` Docker). The transport choice was constrained by two structural browser barriers — both discovered empirically during Phase 0:

- **Chrome Private Network Access (PNA):** blocks a *public*-origin iframe (`connect.trezor.io`) from fetching loopback addresses (`127.0.0.1:21325`/`21328`).
- **`trezord-go` Origin whitelist:** `trezord-go` v2.0.33 403s any Origin not in its hardcoded set (`connect.trezor.io`, `suite.trezor.io` — no `chrome-extension://`, no `localhost`).

Additionally, the offscreen document inherently **cannot open popup windows** — `connect-web`'s default `popup:true` hangs indefinitely waiting for a `POPUP.LOADED` handshake that never arrives.

### The communication chain

```
MetaMask keyring → TrezorOffscreenBridge → offscreen TrezorConnectSDK (unmodified init)
  → @trezor/connect-web (CoreInIframe) → iframe loaded from connectSrc
    → BridgeTransport → HTTP POST to default port 21328 → @trezor/transport-bridge
  → transport-bridge (UDP mode, :21328) → emulator UDP (:21324) → real firmware
```

## Decision

Adopt the **"Trezor Suite way"** — the same architecture Trezor Suite uses for its own emulator E2E:

1. **`window.__TREZOR_CONNECT_SRC = 'http://localhost:8088/'`** — injected into the offscreen HTML **before the app bundle** (build/wiring-time, gated by `TREZOR_E2E=1` — the same HTML-injection pattern Ledger uses for its `navigator.hid` mock). `@trezor/connect-web`'s `connectSettings.js:25-32` reads this global on every settings parse, overriding `connectSrc` at precedence over `init()` settings. **Zero production source change.**

2. **`@trezor/transport-bridge` (the "Suite Node Bridge")** — a JS clone of `trezord-go`, run as a Node sidecar in **UDP mode** on its default port **`21328`**. Its Origin whitelist (`checkOrigin` in `transport-bridge/src/http.ts`) includes **`localhost`** (hostname suffix-match), unlike `trezord-go`'s narrow set. Talks UDP to the emulator at `:21324`. **Zero production source change.**

3. **Local static server for the connect-web iframe assets.** The iframe-internal assets (`iframe.html` + `js/iframe.<hash>.js` ~1.6MB) are fetched once from `connect.trezor.io/9/` at test-setup, cached, and served on `http://localhost:8088/`. **Zero production source change.**

4. **One IN_TEST-gated production source line: `popup: false`** in `app/offscreen/hardware-wallets/trezor.ts`, inside the `TrezorConnectSDK.init()` call. Offscreen documents have no UI and cannot `window.open()` — `core-in-iframe.js:178`'s `_popupManager.request()` hangs indefinitely waiting for a popup that never loads. **This 1 line is inherent to any offscreen-document use of `@trezor/connect-web`, not a transport-specific hack.** With `popup:false`, the popup-open step short-circuits, calls go directly to `iframe.postMessage`, and signing completes in <1s against the real firmware.

**Go G3 (zero production source change) does not fully hold — by exactly 1 line. But that line is forced by offscreen-document semantics, and ANY approach using `@trezor/connect-web` in the offscreen would need it.**

## Rationale

### 1. The `window.__TREZOR_CONNECT_SRC` global + transport-bridge on its default port means the iframe's *default* transport config finds the emulator automatically — no `connectSrc` or `transports` override needed in `trezor.ts`.

`connectSettings.js:25-32` reads `window.__TREZOR_CONNECT_SRC` and sets `connectSrc` with **precedence over `init()` input**. The iframe loads from `http://localhost:8088/` (Origin = `localhost`). The iframe's *default* `BridgeTransport` targets port 21328 — exactly where `@trezor/transport-bridge` listens in UDP mode. No `transports` param needed. The real `TrezorConnect.init({ manifest, env:'webextension' })` runs unmodified except for `popup:false`.

### 2. `localhost` iframe origin dissolves both PNA and the Origin whitelist.

- **PNA:** the iframe (`http://localhost:8088`) fetching `http://127.0.0.1:21328` is **loopback→loopback** (same address space) — PNA does not trigger. (All previous approaches failed because the iframe Origin was either public `connect.trezor.io` or `chrome-extension://`, creating a cross-address-space fetch.)
- **Origin whitelist:** `transport-bridge`'s `checkOrigin` suffix-matches `localhost` → allowed. (Bypasses `trezord-go`'s narrow whitelist entirely — the emulator's bridge is `transport-bridge`, not `trezord-go`.)

### 3. This is the exact architecture Trezor Suite uses for its own E2E tests — highest fidelity.

Trezor Suite Desktop serves the connect iframe locally, runs `transport-bridge` in UDP mode, and communicates with the emulator through this same path. Our approach differs only in where `connectSrc` is set (the `__TREZOR_CONNECT_SRC` global vs. `init()` params) and the context (chrome-extension offscreen vs. Electron). The result is the **highest practical fidelity**: real `connect-web` iframe, real `BridgeTransport`, real transport-bridge, real firmware — all exercised end-to-end in the same SDK path production uses.

### 4. The 1-line `popup:false` is inherent — and monkeypatching to avoid it is worse engineering than accepting it.

The spike searched for any zero-source seam for `popup:false` (another `window.__TREZOR_*` global? a connectSrc query param? localStorage? a feature flag?) and found none. The only way to force `popup:false` without editing `trezor.ts` is to monkeypatch `TrezorConnect.init` from the injected HTML script — wrapping the SDK to inject `popup:false` into the settings. This is fragile (ties to connect-web's internal method signature) and dishonest (hides a real semantic requirement behind a patch). A single, well-commented, `IN_TEST`-gated `popup:false` line is cleaner, more auditable, and more maintainable.

## Consequences

**Positive:**

- Production code has exactly **1 test-gated line** (`popup:false` in `trezor.ts`). All transport configuration (`connectSrc`, `transports`, the bridge process) is at build/wiring-time via the `window.__TREZOR_CONNECT_SRC` HTML injection — the same mechanism Ledger uses for its `navigator.hid` mock.
- `test/stub/keyring-bridge.js` loses its `FakeTrezorBridge` class.
- Tests exercise the **exact** production path: real `TrezorKeyring` → real `TrezorOffscreenBridge` → real `TrezorConnectSDK` → real `CoreInIframe` → real iframe → real `BridgeTransport` → real `transport-bridge` → real firmware. No mock drift.
- The emulator's `transport-bridge` sidecar is structurally simpler than Ledger's `ApduBridge` (which must reassemble 64-byte HID frames into APDUs — transport-bridge does no protocol translation, just relays hex protobuf over HTTP, then UDP to the emulator).

**Negative:**

- **G3 does not hold** (1 test-gated line). Mitigation: the line is inherent, well-commented, and identical to what any offscreen-document approach would need.
- **connect-web iframe assets must be fetched once** from `connect.trezor.io/9/` at test-setup (not bundled in `node_modules`). Adds a ~1.6MB cache step. Mitigation: cached, one-time cost; CI-downloaded or committed as a fixture.
- **`@trezor/transport-bridge` is not on npm.** The spike used the docker-bundled node-bridge via `bridge-start` on the `:9001` controller — the simplest path. Alternatively, fetch the standalone `bin.js` from `dev.suite.sldev.cz`. Either way, a one-time sourcing step.

## Alternatives considered

### Approach A — HTTP proxy on connect-web's default port (original ADR-0003 decision)

Node HTTP proxy on `:21328` forwarding to `trezord-go` `:21325`, with connect-web's *default* config hitting it. **Rejected by spike** (commit `685544fc`): Chrome PNA blocks the public `connect.trezor.io` iframe from fetching `127.0.0.1:21328`. Also: `trezord-go`'s Origin whitelist rejects the `connect.trezor.io` origin (the proxy receives the same Origin the iframe sends). Dead.

### Approach B — Production-source transport override (`IN_TEST` gate in `trezor.ts`)

`if (IN_TEST) initSettings.transports = [new BridgeTransport({url:'http://127.0.0.1:21325', messages, id})]`. **Rejected by spike** (commit `685544fc`): same PNA mechanism — the transport runs inside the public `connect.trezor.io` iframe, so the fetch is public→loopback, PNA-blocked. Even with injected transports, the iframe origin is the bottleneck.

### Approach C — Headless `@trezor/connect` (Node SDK) in the offscreen doc

Proven working in Node (`run-approach-b.cjs` in commit `685544fc` returned the real xpub). But in the chrome-extension offscreen document: **rejected by spike** (commit `959266d6`). `trezord-go` v2.0.33 403s `chrome-extension://` Origin (not in its hardcoded whitelist). `@trezor/transport-bridge`'s whitelist also rejects `chrome-extension://` (the `new URL('chrome-extension://...')` hostname does not suffix-match `'localhost'` or `'trezor.io'`). `UdpTransport` cannot be used because the browser stub is a deliberate no-op (`dgram` is Node-only). So headless-in-offscreen is blocked by Origin enforcement at both bridge variants.

### Approach D — WebUSB (`navigator.usb`) browser-API mock

Rejected in original ADR-0003 — Playwright/Puppeteer have no WebUSB automation; no Chrome fake-device flags; permission dialog unreachable. Not viable.

### Approach E — HTML-injected monkeypatch of `TrezorConnect.init` to force `popup:false` (fully zero-source variant)

The injected HTML script could wrap `TrezorConnect.init` to inject `popup:false` into its settings, preserving true zero-source. **Rejected** as worse engineering: ties the test harness to connect-web's internal method signature; hides a real semantic constraint behind a fragile patch. The 1-line `popup:false` is cleaner, more auditable, and more maintainable. If preserving G3 absolutely requires zero lines, this is the path — but it is not recommended.

## Evidence

Four Phase-0 spikes committed on `feat/hw-emulators-master` under `packages/hw-emulator/spike/`:

| Spike | Commits | Outcome |
|---|---|---|
| R1 (proxy) | `fceda3f1`, `685544fc` | ❌ Proxy DEAD (PNA) |
| R1 (Approach B, Node headless) | `685544fc` | ⚠️ Works in Node, but MM uses `connect-web` (iframe), not headless `connect` |
| C2 (headless in offscreen) | `959266d6` | ❌ BLOCKED by `trezord-go` Origin whitelist (403) |
| Zero-source (`__TREZOR_CONNECT_SRC` + transport-bridge + local iframe) | `b781c0ba` | ✅ PASS: canonical SLIP-14 xpub returned. One unavoidable line: `popup:false`. |

## Implementation risk

**R1 (offline iframe/`connectSrc`) — RESOLVED.** The solution is to serve the connect-web iframe locally (localhost origin), not from the public `connect.trezor.io`. This requires fetching the iframe assets once at test-setup (they are not in the `@trezor/connect-web` npm package; they exist only at `connect.trezor.io/9/`) and caching them. R1 originally asked whether connect-web works "offline" — the answer is yes, it works offline with a locally-served iframe and local transport-bridge. No internet needed at E2E runtime.

**New risk: iframe asset version coupling.** The cached iframe assets (`iframe.<hash>.js`) are tied to the connect-web version (`9.6.0` in `node_modules`). If connect-web upgrades, the cached assets may become stale. Mitigation: the iframe-asset fetcher includes a version assertion (compare the fetched iframe version against the installed `@trezor/connect-web` version). On mismatch, re-fetch and warn.

## Note on the in-repo `TREZOR_REPLICATION_GUIDE.md`

The existing `metamask-extension/test/e2e/speculos/TREZOR_REPLICATION_GUIDE.md` analyzed the transport decision and recommended an HTTP-proxy approach. This ADR supersedes it with 4 empirical spike results:

- The guide's `new BridgeTransport({url})` constructor claim was correct (verified: `@trezor/transport` v1.5.0 accepts `{url, messages, id}`), but the proxy it proposes is non-viable (PNA + Origin whitelist).
- The guide placed files in `test/e2e/trezor/` for both emulator core and E2E wiring; the established [ADR-0001](./0001-qr-emulator-placement.md) pattern puts the emulator core in `packages/hw-emulator/src/trezor/`.
- The guide's Step 2 (webusb-only mode) is not applicable (WebUSB is the transport that *works* in production but cannot be mocked; emulator tests need the bridge transport).

## References

- [Trezor Emulator Spec §5.3 (data flow), §12.1 (R1 — RESOLVED)](../specs/trezor-emulator.md)
- [ADR-0001](./0001-qr-emulator-placement.md) — submodule placement (reused)
- [ADR-0002](./0002-no-scripts-transport.md) — QR's no-scripts principle (Trezor's `__TREZOR_CONNECT_SRC` HTML injection is the Trezor-appropriate analog: different mechanism, same "wiring-time injection, not production source" property)
- Spike evidence: 4 commits on `feat/hw-emulators-master` (`fceda3f1`, `685544fc`, `959266d6`, `b781c0ba`) in `packages/hw-emulator/spike/`
- `@trezor/transport-bridge`: `trezor/trezor-suite` `packages/transport-bridge/` (http.ts — Origin whitelist, bin.ts — UDP mode)
- `@trezor/connect-web` globals: `connectSettings.js:25-32` — `window.__TREZOR_CONNECT_SRC`
- `core-in-iframe.js:178` — popup gate (`this._settings.popup && this._popupManager ? this._popupManager.request()`)
