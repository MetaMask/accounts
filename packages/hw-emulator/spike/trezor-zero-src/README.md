# Trezor Zero-Source-Change Transport Spike

Final, decisive transport-architecture spike (follow-up to commits
`959266d6` C2 spike, `685544fc` Phase 0 R1 spike). Validates whether
`@trezor/connect-web` can run **unmodified** in MetaMask's
chrome-extension offscreen document against a local trezor-user-env
emulator, with **zero production source change**.

## The zero-source-change thesis

`@trezor/connect-web/lib/connectSettings.js:25-32` reads
**`window.__TREZOR_CONNECT_SRC`** on every settings parse; if it's a
string it overrides `connectSrc` (and sets `debug:true`), taking
precedence over `init()` settings. So instead of editing
`app/offscreen/hardware-wallets/trezor.ts`, we inject one line into the
offscreen HTML *before the bundle runs*:

```js
window.__TREZOR_CONNECT_SRC = 'http://localhost:8088/';
```

Combined with a static server on `http://localhost:8088/` serving the
connect-web iframe assets, and `@trezor/transport-bridge` (the "Suite
Node Bridge" — a JS clone of trezord-go whose Origin whitelist INCLUDES
`localhost`) running in UDP mode on port `21328`, the iframe loads
from `http://localhost:8088/` (Origin whitelisted, loopback→loopback =
no PNA) and its default `BridgeTransport` hits transport-bridge on
21328 automatically — no `transports` override, no `popup` override,
no `IN_TEST` branch. The real `TrezorConnect.init({ manifest, env: 'webextension' })`
runs unmodified.

## TL;DR — Decision

> **`MINIMAL SOURCE CHANGE: 1 line — popup:false in init()`**

The thesis **almost** holds: the transport chain works end-to-end with
zero source change to the SDK call, EXCEPT that `connect-web`'s default
`popup:true` causes it to call `window.open()` to display a confirmation
popup, which offscreen documents cannot do — the SDK then hangs forever
waiting for a popup-handshake message that never comes.

- **PASS for the transport chain itself** — `getPublicKey` completes
  successfully with the canonical SLIP-14 xpub when `popup:false` is
  added to `init()`.
- **NO zero-source seam for `popup:false` exists** — the SDK reads
  `popup` only from `init({popup:false})` (`connectSettings.js:106-107`).
  The only `__TREZOR_*` global is `__TREZOR_CONNECT_SRC`; there is no
  URL query param, no `localStorage`/`sessionStorage` lookup, no
  feature flag.
- **The minimal unavoidable source change** is a single line in
  `app/offscreen/hardware-wallets/trezor.ts`:
  ```diff
   await TrezorConnect.init({
     manifest,
     env: 'webextension',
  +  popup: false,  // offscreen documents cannot open popups; required for headless emulator (IN_TEST only)
   });
  ```
  (Gated behind the existing `IN_TEST` branch — NOT a permanent
  production-behavior change.)

See [§ Decision](#decision) for the full locked footprint and
orchestrator implications.

---

## How to run

```bash
# 0. prerequisites: docker daemon, metamask-speculos + metamask-extension
#    checked out next to accounts.
cd packages/hw-emulator/spike/trezor-zero-src

# 1. expose playwright + ws to this dir (gitignored)
ln -sfn /Users/montelai/consensys/metamask-speculos/node_modules node_modules

# 2. fetch the connect-web iframe assets from connect.trezor.io/9/ once
#    (gitignored; cached). Done by: see serve-assets.cjs for the file list.
#    Manual equivalent:
#    curl -sS https://connect.trezor.io/9/iframe.html -o connect-web-assets/iframe.html
#    curl -sS https://connect.trezor.io/9/js/iframe.8de5c65ea252d50fbe84.js \
#      -o connect-web-assets/js/iframe.8de5c65ea252d50fbe84.js
#    (Note: the iframe.js hash may change between connect-web versions; check
#    the iframe.html script src for the current filename.)

# 3. fetch @trezor/transport-bridge from the trezor-suite CDN
#    curl -sS https://dev.suite.sldev.cz/transport-bridge/develop/dist/bin.js \
#      -o transport-bridge/bin.js
#    (NOT on npm; this is the same bundled JS the trezor-user-env Docker
#    image ships at /trezor-user-env/src/binaries/node-bridge/bin.js —
#    you can also docker cp it out of the container.)

# 4. boot trezor-user-env (emulator T2T1 + SLIP-14 seed + node bridge)
docker compose -f docker-compose.yml up -d
sleep 25
NODE_PATH=/Users/montelai/consensys/metamask-speculos/node_modules node boot.cjs

# 5. start the static asset server
node serve-assets.cjs &

# 6. build the @trezor/connect-web bundle for the offscreen document
node build-connect-web-bundle.cjs

# 7a. run the popup:true (default, "pure zero-source") variant — EXPECTED TO HANG
NODE_PATH=/Users/montelai/consensys/metamask-speculos/node_modules \
  node run-zero-src.cjs 2>&1 | tee zero-src-result.log
# (or use the inline single-variant driver — see zero-src-default-result.log
# for the captured output; the dual-driver has a session-leak bug between
# variants that the single-variant inline driver avoids.)

# 7b. run the popup:false variant — EXPECTED TO SUCCEED
#     (edit inject-global.js to uncomment window.__SPIKE_FORCE_POPUP_FALSE = true,
#      or use the inline driver — see popup-false-result.log)

# 8. tear down
pkill -f serve-assets.cjs
docker compose -f docker-compose.yml down
```

## Files

- `docker-compose.yml` — boots `trezor-user-env` with `:21328` (node bridge)
  and `:21324/udp` (emulator UDP debug-link) exposed.
- `boot.cjs` — drives the `:9001` controller to start emulator (SLIP-14
  seed), start the bundled node-bridge, and verify `/enumerate` returns
  the device with `Origin: http://localhost:8088` whitelisted.
- `transport-bridge/bin.js` — `@trezor/transport-bridge` JS bundle
  (fetched from `dev.suite.sldev.cz`, gitignored). Alternative to the
  bundled node-bridge inside the docker image; we used the docker-bundled
  one in the end (simpler setup), but transport-bridge is the
  production-intended sidecar for the orchestrator's plan.
- `connect-web-assets/{iframe.html,js/iframe.<hash>.js,trezor-connect.js}` —
  iframe assets fetched from `https://connect.trezor.io/9/` once
  (gitignored). Served by `serve-assets.cjs`.
- `serve-assets.cjs` — static file server on `127.0.0.1:8088` with
  permissive CORS so the chrome-extension:// parent can embed the iframe.
- `build-connect-web-bundle.cjs` + `shims/empty.js` — esbuild bundling of
  `@trezor/connect-web` (browser SDK) into an IIFE the offscreen document
  can `<script src=>` load. Exposes `window.TrezorConnectWeb.default`.
  Much simpler than the C2 spike's Node-SDK bundle (connect-web is
  browser-first — no Node built-ins).
- `extension/` — minimal MV3 extension:
  - `manifest.json` — `host_permissions` for `127.0.0.1:21328` and
    `localhost:8088` (the latter for the iframe fetch).
  - `inject-global.js` — **THE zero-source-change intervention**: sets
    `window.__TREZOR_CONNECT_SRC = 'http://localhost:8088/'`. Also
    installs diagnostic interceptors (iframe creation, window.message,
    window.open, BroadcastChannel). Includes the spike-only diagnostic
    knob `window.__SPIKE_FORCE_POPUP_FALSE` (commented out by default).
  - `background.js` — service worker. Creates the offscreen doc + opens
    the test page on install.
  - `offscreen.{html,js}` — offscreen document. Loads `inject-global.js`
    BEFORE the bundle (replicates the pre-bundle HTML injection pattern).
    Calls `init({manifest, env: 'webextension'})` + `getPublicKey()`.
  - `probe-{before,after}.js` — error capture + post-load state dump
    (offscreen console is invisible without these).
  - `test.{html,js}` — page that drives the test + renders results.
  - `trezor-connect-web.bundle.js` — gitignored build artifact.
- `run-zero-src.cjs` — Playwright driver (dual-variant; has a known
  session-leak bug between variants — use the single-variant inline
  driver pattern from `zero-src-default-result.log` /
  `popup-false-result.log` for clean reproduction).
- `*.log` — captured stdout from the runs (committed as evidence).

---

## Asset-sourcing resolution (critical for the implementation plan)

**The connect-web iframe assets are NOT shipped in
`node_modules/@trezor/connect-web/`** — only the parent-side SDK
(`lib/index.js` etc.). The iframe-side code
(`iframe.html` + the `iframe.<hash>.js` core bundle) is only available
at `https://connect.trezor.io/9/`.

- `find node_modules/@trezor -name "*.html"` returns only
  `trezor-usb-permissions.html` (the WebUSB permission popup), NOT
  `iframe.html`.
- `find node_modules/@trezor -name "iframe*"` returns nothing (only
  `lib/iframe/` directory with parent-side iframe-management code, not
  the iframe-internal assets themselves).

**Implementation plan consequence**: production MetaMask must either
(a) bundle the iframe assets into the extension at build time (fetch
once from `connect.trezor.io`, ship them as extension resources, serve
from a `chrome-extension://` URL), or (b) continue hitting
`connect.trezor.io` live (current production behavior, which works for
real users who have internet but breaks for the offline emulator E2E
path). This spike uses approach (a) — assets fetched once, served from
`http://localhost:8088/`. Approach (a) is what the orchestrator should
adopt for the emulator-only wiring; it does NOT touch production source.

The specific files needed (trezor-connect v9.6.0 / iframe-9.7.3 era):
- `iframe.html` (1446 bytes) — the iframe document shell
- `js/iframe.8de5c65ea252d50fbe84.js` (1.6 MB) — the iframe core bundle
  (note: the hash WILL change between connect versions — re-fetch and
  update the URL pattern when pinning a new version)

Workers (`blockbook-worker`, `blockfrost-worker`, etc.) are referenced
by the iframe bundle but are NOT needed for `getPublicKey` (those are
blockchain-link workers for Bitcoin/Altcoin account discovery).
404s on worker fetches are logged but harmless.

## Popup behavior (critical for the implementation plan)

**`popup:true` (the connect-web default) FAILS in the offscreen document.**

Mechanism: when a method is invoked (any method, not just signing ones),
`core-in-iframe.js:178` does:
```js
if (this._settings.popup && this._popupManager) {
    this._popupManager.request();   // <-- calls window.open(popupSrc)
}
```
`PopupManager.request()` → `open()` → `openWrapper(url)` → in
non-`web-extension-with-tab` contexts, `window.open(popupSrc)`. In the
offscreen document, `chrome.tabs` is undefined, so
`isWebExtensionWithTab()` returns false and `window.open` is called
directly. The offscreen document has no UI and cannot open windows.

The captured `window.open` call from the spike:
```
http://localhost:8088/popup.html?version=9.6.0&env=webextension&extension-id=...&cs-ver=1
```
The SDK then waits for a `POPUP.LOADED` handshake message from the
popup window. Since no real popup was opened, no handshake ever
arrives → infinite hang (our 30s diagnostic timeout catches it; the SDK
itself has a `POPUP_OPEN_TIMEOUT` of ~3 minutes that would eventually
fall through to a "show popup request" UI banner, but in headless
offscreen that just no-ops).

**`popup:false` WORKS**: when `popup:false` is set in `init()`, the
`if (this._settings.popup && ...)` check at `core-in-iframe.js:178`
short-circuits, the `request()` call is skipped, and the method call
goes directly to `iframe.postMessage(...)`. The iframe processes the
call against the transport, returns the response via
`postMessage(RESPONSE_EVENT)`, and the SDK resolves the promise.

With `popup:false`, `getPublicKey` completes in **<1 second** with the
canonical SLIP-14 xpub:
```
xpub6DainZd2Amf7GkkBwKLnfBRDBBrWCf9GWCRwjbMJKweKa9MN2xqhbAH5Myh3uJXkna47WLK8qH7NYn4CsasoqAyHxa4BB5daRqaVBfauhMP
```

### Zero-source seam hunt for `popup:false` (NEGATIVE result)

Searched exhaustively:
- **`window.__TREZOR_*` globals**: only `__TREZOR_CONNECT_SRC` exists
  (`connect-web/lib/connectSettings.js:26`). No global for popup.
- **URL query params on `connectSrc`/`iframeSrc`**: the popup URL itself
  is built from query params (`popup/index.js:169`:
  `params.set('version', ...); params.set('env', ...); ...`), but
  NOTHING READS query params FROM the iframe URL or the parent URL to
  set `popup:false`.
- **localStorage/sessionStorage lookups**: none in `connectSettings.js`
  or `core-in-iframe.js`.
- **Feature flags / env checks**: `env === 'webextension'` is checked
  for `isCoreModeDisabled` (blocks the core-in-popup *fallback*) but
  does NOT disable the per-method popup-open attempt.

**Conclusion**: the only way to set `popup:false` is via the init()
call. No zero-source seam exists. The minimal unavoidable source change
is a 1-line addition to `trezor.ts`.

## End-to-end mechanism (the verified path)

```
┌─────────────────────────────────────────────────────────────────┐
│ Chrome (MV3 extension)                                          │
│                                                                 │
│  background.js (SW)                                             │
│       │                                                         │
│       │ chrome.offscreen.createDocument                         │
│       ▼                                                         │
│  offscreen.html  (chrome-extension://<id> — secure context)     │
│   ├─ <script src="inject-global.js">                            │
│   │    window.__TREZOR_CONNECT_SRC = 'http://localhost:8088/';  │
│   ├─ <script src="trezor-connect-web.bundle.js">                │
│   └─ <script src="offscreen.js">                                │
│        sdk.init({manifest, env:'webextension',                  │
│                   popup:false  /* ← minimal source change */})  │
│        sdk.getPublicKey({path, coin})                           │
│             │                                                   │
│             │ document.createElement('iframe')                  │
│             ▼                                                   │
│      iframe@http://localhost:8088/iframe.html                   │
│       ├─ Origin: http://localhost:8088  (PNA: loopback ✓,       │
│       │                                bridge whitelist ✓)      │
│       └─ <script src="js/iframe.<hash>.js">                     │
│            BridgeTransport → POST /enumerate, /acquire, /call   │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  │ HTTP POST (Origin:
                                  │   http://localhost:8088)
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│ http://127.0.0.1:21328  (@trezor/transport-bridge, UDP mode)    │
│  - Origin whitelist: connect.trezor.io, suite.trezor.io,        │
│    localhost:*  ← accepts http://localhost:8088                  │
│  - enumerates emulator at 127.0.0.1:21324 via UDP               │
└─────────────────────────────────────────────────────────────────┘
                                  │ UDP
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│ trezor-emu-core-T2T1 (Docker, SLIP-14 seed)                     │
│  → GetPublicKey → xpub6DainZd2Amf7...                           │
└─────────────────────────────────────────────────────────────────┘
```

Verified message traffic (from `popup-false-result.log`):
1. `UI_EVENT/iframe-bootstrap` (iframe → parent, "I'm alive")
2. `UI_EVENT/iframe-loaded` (iframe core ready, `useBroadcastChannel:true`)
3. `DEVICE_EVENT/device-connect` (full Features payload — device
   acquired by transport, authenticity checks reported)
4. `RESPONSE_EVENT id=1 success=true` (init/transport-info)
5. (popup:false skips the popup-open step)
6. (SDK sends getPublicKey via iframe.postMessage)
7. `RESPONSE_EVENT id=2 success=true` (xpub returned)

## Decision

> **`MINIMAL SOURCE CHANGE: 1 line — popup:false in init()`**

### Locked footprint (the diff to production source)

In `app/offscreen/hardware-wallets/trezor.ts` (location approximate;
orchestrator to confirm the exact file/line), inside the existing
`IN_TEST` branch (or whatever the emulator-only override mechanism
becomes — same branch as the Ledger `navigator.hid` mock):

```diff
 await TrezorConnect.init({
   manifest,
   env: 'webextension',
+  popup: false,
 });
```

**That's the entire unavoidable source change.** No `connectSrc`
override, no `transports` override, no `IN_TEST`-specific TrezorConnect
factory, no monkey-patching. Just `popup: false`, because offscreen
documents can't open UI windows.

### Wiring-time interventions (zero-source-change, acceptable like Ledger)

The orchestrator must additionally ship these as build/wiring-time
infrastructure (NOT production source — analogous to how the Ledger
emulator path injects a `navigator.hid` mock):

1. **Offscreen HTML injection** (1 line in the offscreen HTML template,
   gated behind the existing emulator-only build flag — same mechanism
   as the Ledger mock injection):
   ```html
   <script>window.__TREZOR_CONNECT_SRC = 'http://localhost:8088/';</script>
   ```
   (Or set via JS before `TrezorConnect.init()` runs.)

2. **Static asset server** (`serve-assets.cjs` or equivalent) on
   `http://localhost:8088/` serving the cached connect-web iframe
   assets. Ships with the emulator test harness, NOT with the
   production extension.

3. **Cached connect-web iframe assets** — fetched once at build/test
   setup time from `https://connect.trezor.io/9/iframe.html` and
   `.../js/iframe.<hash>.js`. Pinned to a known-good version (this
   spike used connect v9.6.0 / iframe-9.7.3 era).

4. **transport-bridge sidecar** (or the docker-bundled node-bridge)
   running in UDP mode on `127.0.0.1:21328`, talking UDP to the
   emulator on `127.0.0.1:21324`. Ships with the emulator test
   harness, NOT with the production extension.

5. **`host_permissions`** entries for `127.0.0.1:21328/*` and
   `localhost:8088/*` in the emulator-only build's manifest (or the
   manifest-overrides mechanism MetaMask uses for test builds). NOT in
   the production manifest.

### Why this is NOT the FAILED case

The transport chain works. The Origin whitelist on transport-bridge
INCLUDES `localhost`, so the iframe's `http://localhost:8088` Origin
is accepted (verified: HTTP 200 on POST /enumerate with
`Origin: http://localhost:8088`). PNA does NOT block the
chrome-extension:// parent from loading the http:// iframe (verified:
iframe loads successfully, iframe-bootstrap message received). The
iframe's BridgeTransport talks to transport-bridge on the same
loopback, no PNA. The whole chain works end-to-end.

The single unavoidable source change (`popup: false`) is a fundamental
constraint of offscreen documents, not a deficiency of this particular
architecture. ANY approach that uses `@trezor/connect-web` in the
offscreen document would need this same line.

## Side note: what changed vs the C2 spike

The C2 spike (`959266d6`) tried to use the headless Node `@trezor/connect`
SDK directly in the offscreen document (no iframe) and got blocked by
trezord-go v2.0.33's hardcoded Origin whitelist (which excludes
`chrome-extension://`).

This spike uses the real `@trezor/connect-web` (iframe-based) with
`__TREZOR_CONNECT_SRC` redirecting the iframe to `http://localhost:8088/`.
Because the iframe's Origin becomes `http://localhost:8088` (not
`chrome-extension://`), and transport-bridge (the JS bridge) accepts
localhost Origins, the Origin-whitelist blocker disappears. PNA also
disappears because both the iframe origin and the transport target are
loopback.

The lesson: don't try to skip the iframe (the SDK's popup/UI flow is
too tightly coupled to having a real iframe). Use the real iframe, just
host it locally via `__TREZOR_CONNECT_SRC`.

## Required follow-ups for the orchestrator

1. Update **spec §6.1 / §9.3** (transport section) with:
   - Lock the architecture: connect-web in offscreen + locally-served
     iframe via `__TREZOR_CONNECT_SRC` + transport-bridge sidecar.
   - Document the 1-line `popup:false` source change as the entire
     production footprint.
2. Update **ADR-0003**:
   - Mark C2 (headless Node SDK in offscreen) as REJECTED — Origin
     whitelist blocks it.
   - Mark this approach (Option A with local connectSrc iframe) as
     LOCKED.
   - Record the asset-sourcing decision (fetch + cache iframe assets).
3. Implementation plan must include:
   - A build step that fetches and caches `iframe.html` + `iframe.<hash>.js`.
   - A test-harness component that serves these on `http://localhost:8088/`.
   - A test-harness component that runs transport-bridge in UDP mode.
   - A manifest-overrides entry adding `127.0.0.1:21328/*` and
     `localhost:8088/*` to `host_permissions` for emulator test builds.
   - The 1-line `popup:false` in `trezor.ts`, gated on `process.env.IN_TEST`.
4. **G3 (zero production source change) does NOT hold for Trezor** —
   this 1-line `popup:false` is the unavoidable minimum. G3 should be
   marked as "1-line exception" or revised to allow this specific
   minimal change.
