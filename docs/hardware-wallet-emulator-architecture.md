# Hardware Wallet Emulator Architecture

> **Master document** covering the Ledger (Speculos), Trezor, and QR hardware wallet emulators in MetaMask E2E testing. This is the canonical reference for how each emulator works, how it integrates with the extension, and how to maintain it.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Shared Architecture](#2-shared-architecture)
3. [Ledger Emulator (Speculos)](#3-ledger-emulator-speculos)
4. [Trezor Emulator](#4-trezor-emulator)
5. [QR Emulator](#5-qr-emulator)
6. [Comparison Matrix](#6-comparison-matrix)
7. [The Extension's Offscreen Document](#7-the-extensions-offscreen-document)
8. [E2E Test Infrastructure](#8-e2e-test-infrastructure)
9. [Chrome Flags & CSP](#9-chrome-flags--csp)
10. [Service Lifecycle Management](#10-service-lifecycle-management)
11. [Troubleshooting Guide](#11-troubleshooting-guide)

---

## 1. Overview

MetaMask E2E tests for hardware wallets use **real device firmware** running in emulators, not mocks or stubs. This ensures signatures come from actual cryptographic implementations, catching real-world bugs that mocks would miss.

```
┌─────────────────────────────────────────────────────────────┐
│                    MetaMask Extension                        │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ LedgerKeyring│  │ TrezorKeyring│  │  QRKeyring   │         │
│  │(hw-transport)│  │(connect-web) │  │(camera+zxing)│         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                  │                  │                │
│         ▼                  ▼                  ▼                │
│  navigator.hid      connect-web iframe    getUserMedia        │
│  (mocked)           (local iframe)        (fake camera)       │
└─────────┼──────────────────┼──────────────────┼──────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
   │   Speculos    │  │  CORS Proxy  │  │  Y4M Video   │
   │   (Docker)    │  │  + Bridge    │  │  Feed        │
   │  Real Ledger  │  │  (Docker)    │  │  (Rendered)  │
   │   firmware    │  │  Real Trezor │  │  QR codes    │
   └──────────────┘  │   firmware   │  └──────────────┘
                      └──────────────┘
```

---

## 2. Shared Architecture

### 2.1 Package Location

All emulators live in `@metamask/hw-emulator` (`accounts/packages/hw-emulator/`):

```
packages/hw-emulator/src/
├── ledger/          # Speculos emulator
├── trezor/          # Trezor emulator
├── qr/              # QR emulator
├── ble/             # BLE emulator (unused in E2E)
├── factory.ts       # createEmulator() dispatch
├── types.ts         # HardwareWalletEmulator interface
└── index.ts         # Public exports
```

### 2.2 The `HardwareWalletEmulator` Interface

All emulators implement this interface:

```typescript
export type HardwareWalletEmulator = {
  start(): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
  getInteraction(): DeviceInteraction;
  approveTransaction(): Promise<void>;
  approveSigning(): Promise<void>;
  rejectTransaction(): Promise<void>;
  navigateToMainMenu(): Promise<void>;
};
```

### 2.3 Factory

```typescript
const emulator = createEmulator(EmulatorType.Ledger, options);
const emulator = createEmulator(EmulatorType.Trezor, options);
const emulator = createEmulator(EmulatorType.Qr, options);
```

### 2.4 Keyring Wiring (keyrings.ts)

All three keyrings are wired identically — **no IN_TEST overrides** (removed as part of this work):

```typescript
// MV3 (Chrome)
hardwareKeyringBuilderFactory(TrezorKeyring, TrezorOffscreenBridge),
hardwareKeyringBuilderFactory(LedgerKeyring, LedgerOffscreenBridge),
qrKeyringBuilderFactory(QrKeyring, QrKeyringScannerBridge, { ... }),
```

The **production keyring code runs unmodified** in tests. The emulators intercept at the transport/IO boundary, not at the keyring level.

---

## 3. Ledger Emulator (Speculos)

### 3.1 How It Works

Ledger uses **Speculos** — a Docker container running real Ledger Nano firmware compiled for the host CPU. The transport is mocked at the `navigator.hid` (WebHID) boundary.

```
Extension offscreen doc
  │
  ├── <script> speculos-webhid-mock.HASH.js </script>
  │   (replaces navigator.hid with WebSocket-connected mock)
  │
  └── navigator.hid.sendReport(data)
        │
        ▼ WebSocket :9876
  ApduBridge (Node)
  │  HID frame → APDU reassembly
  │  APDU → Speculos TCP :9999
  ▼
  Speculos Docker (real firmware)
  │  Processes APDU
  │  Returns response APDU
  ▼
  ApduBridge → HID frame encoding
  │  WebSocket → mock → navigator.hid inputreport
  ▼
  Extension receives response
```

### 3.2 Components

| File | Purpose |
|------|---------|
| `ledger/speculos.ts` | Main orchestrator (implements `HardwareWalletEmulator`) |
| `ledger/client.ts` | `SpeculosClient` — TCP socket to :9999 (APDU), REST to :5001 (buttons, screenshots) |
| `ledger/apdu-bridge.ts` | Node WebSocket server (:9876) bridging HID frames ↔ APDU ↔ Speculos TCP |
| `ledger/webhid-mock-script.ts` | Browser script that replaces `navigator.hid` with WebSocket mock |
| `ledger/process-manager.ts` | Native binary spawning (Linux) |
| `ledger/docker-manager.ts` | Docker Compose lifecycle |
| `ledger/device-interaction.ts` | Button press automation via Speculos REST API |
| `ledger/constants.ts` | Seeds, addresses, ports |
| `shared/lib/speculos-webhid-mock.ts` | The WebHID mock implementation (HID framing, WebSocket client) |
| `app/offscreen/speculos-init.ts` | Installs the WebHID mock in the offscreen document |

### 3.3 WebHID Mock

The `SpeculosPlugin` (webpack plugin) injects the mock into all extension HTML pages:

1. **`entryOption` hook**: Adds `scripts/speculos-webhid-mock` as a webpack entry point
2. **`emit` hook**: Finds compiled chunk, injects `<script src>` tag into HTML files

The mock replaces `navigator.hid` with a fake that:
- Creates a fake `HIDDevice` (Ledger vendor ID `0x2c97`)
- Routes `sendReport()` calls through a WebSocket to the `ApduBridge`
- Receives `inputreport` events from the `ApduBridge`

### 3.4 Ports

| Port | Purpose |
|------|---------|
| 9999 | Speculos APDU TCP (protocol messages) |
| 5001 | Speculos REST API (buttons, screenshots) |
| 9876 | ApduBridge WebSocket (HID frame relay) |

### 3.5 E2E Wiring

| File | Purpose |
|------|---------|
| `test/e2e/speculos/docker-compose.yml` | Speculos Docker service |
| `test/e2e/speculos/shared-context.ts` | `startSharedSpeculos()` / `stopSharedSpeculos()` |
| `test/e2e/speculos/with-speculos-fixtures.ts` | `withSpeculosFixtures()` — patches HTML, wraps `withFixtures` |
| `test/e2e/speculos/build-config.ts` | `SPECULOS_E2E=1` env validation |
| `test/e2e/speculos/cleanup.ts` | Orphan process/port cleanup |
| `test/e2e/tests/hardware-wallets/ledger/ledger-helpers.ts` | Device interaction helpers |

### 3.6 Chrome Flags

```javascript
if (process.env.SPECULOS_E2E === '1') {
  args.push('--enable-features=WebHID', '--disable-features=WebHidBlocklist');
}
```

### 3.7 Device Interaction

Speculos exposes a REST API for device control:
- `POST /button/right` — press right button
- `POST /button/left` — press left button
- `POST /button/both` — press both buttons (confirm)
- `GET /screenshot` — capture screen PNG
- `POST /events` — touch screen (for Nano Flex touchscreen models)

The `ApduBridge` also emits `signing-apdu` events when it detects signing-related APDU messages, which test helpers use to time button presses.

---

## 4. Trezor Emulator

### 4.1 How It Works

Trezor uses **trezor-user-env** — a Docker container running real Trezor firmware compiled for the host CPU. The transport is mocked at the `@trezor/connect-web` iframe boundary.

```
Extension offscreen doc
  │
  ├── <script> trezor-connect-src.js </script>
  │   (sets window.__TREZOR_CONNECT_SRC = "http://localhost:8188/")
  │
  └── TrezorConnectSDK (connect-web)
      │  parseConnectSettings reads __TREZOR_CONNECT_SRC
      │  Creates iframe from localhost:8188/iframe.html
      │  iframe loads connect-web core JS
      ▼
  iframe core (localhost:8188)
  │  BridgeTransport POSTs to :21328/:21325
  ▼
  CORS Proxy (Node, :21328/:21325)
  │  Adds CORS headers
  │  Forwards to trezord-go bridge :21329
  ▼
  trezor-user-env Docker (real firmware)
  │  trezord-go (:21329) → emulator UDP (:21324)
  │  WebSocket Controller (:9001) — device control
  ▼
  CORS Proxy → iframe → TrezorConnectSDK
  │  Protobuf responses flow back
  ▼
  Extension receives response
```

### 4.2 Components

| File | Purpose |
|------|---------|
| `trezor/trezor-emulator.ts` | Main orchestrator (implements `HardwareWalletEmulator`) |
| `trezor/controller-client.ts` | WebSocket client to :9001 (emulator control: start, setup, press-yes/no, screenshot) |
| `trezor/sidecar-manager.ts` | Static asset server (:8188) + CORS proxy (:21328, :21325) |
| `trezor/docker-manager.ts` | trezor-user-env Docker Compose lifecycle |
| `trezor/device-interaction.ts` | Multi-model button/touch dispatch |
| `trezor/model-profiles.ts` | Per-model interaction config (5 models: T1B1, T2T1, T3B1, T3T1, T3W1) |
| `trezor/constants.ts` | Ports, SLIP-14 seed, protobuf message types |
| `trezor/html-injector.ts` | Generates the `__TREZOR_CONNECT_SRC` injection script |

### 4.3 The TrezorPlugin (Webpack)

The TrezorPlugin injects `__TREZOR_CONNECT_SRC` into the offscreen document using the **raw asset** approach (NOT a webpack entry point):

```javascript
// TrezorPlugin emit hook
compilation.assets['chrome/scripts/trezor-connect-src.js'] = new RawSource(
  'window.__TREZOR_CONNECT_SRC = "http://localhost:8188/";'
);
// Inject <script src="scripts/trezor-connect-src.js"> into offscreen.html
```

**Why raw asset (not webpack entry):** Webpack entry points wrap the code in a chunk loader that depends on shared runtime chunks. The chunk loader runs before the deferred bundle scripts — but the shared chunks aren't loaded yet (the script tag is non-deferred). This causes the chunk loader to hang indefinitely, blocking the offscreen document from booting.

The raw asset approach writes the JS file directly to the compilation output, bypassing webpack's module system entirely.

### 4.4 The `corsValidator` Constraint

`@trezor/connect` has a `corsValidator` that validates `connectSrc` URLs:

```javascript
const corsValidator = (url) => {
  if (url.match(/^https:\/\/([A-Za-z0-9\-_]+\.)*trezor\.io\//)) return url;
  if (url.match(/^https?:\/\/localhost:[58][0-9]{3}\//)) return url;  // localhost only!
  // ... other patterns
  // Returns undefined if no match
};
```

**Critical:** `127.0.0.1` is REJECTED. Only `localhost` passes. The port must start with `5` or `8` and be 4 digits (e.g., 8188).

### 4.5 The `__TREZOR_CONNECT_SRC` Global

When `window.__TREZOR_CONNECT_SRC` is set to a string, `parseConnectSettings()`:
1. Sets `settings.connectSrc = globalSrc` (overriding the default `connect.trezor.io`)
2. Sets `settings.debug = true`
3. This happens AFTER `settings.iframeSrc` is derived from `connectSrc`, so the iframe loads from the local server

### 4.6 The IN_TEST Overrides

In `app/offscreen/hardware-wallets/trezor.ts`:

```typescript
TrezorConnectSDK.init({
  ...msg.params,
  env: 'webextension',
  popup: false,  // Required: offscreen docs can't open popups
  ...(process.env.IN_TEST ? {
    connectSrc: 'http://localhost:8188/',
    trustedHost: true,
    coreMode: 'iframe',
  } : {}),
});
```

- `popup: false` — offscreen documents cannot call `window.open()`. Without this, `TrezorConnectSDK.init()` hangs.
- `connectSrc` — points the iframe to our local asset server (with `trustedHost: true` to bypass the corsValidator for init-time settings)
- `coreMode: 'iframe'` — prevents `handleBeforeCall` from switching to `core-in-suite-desktop` (which doesn't exist in E2E)

### 4.7 The `lazyLoad` Keyring Setting

The Trezor keyring passes `lazyLoad: true` to `bridge.init()`. This causes `TrezorConnectSDK.init()` to skip iframe creation — the iframe is created lazily on the first actual method call (e.g., `getPublicKey`). This is correct for production (lazy load = faster startup) and works in E2E because the emulator auto-confirms operations via the debug link.

### 4.8 Ledger Init Skip

When `__TREZOR_CONNECT_SRC` is set (Trezor build), the offscreen document **skips Ledger initialization**:

```typescript
const isTrezorBuild = typeof globalThis.__TREZOR_CONNECT_SRC !== 'undefined';
if (process.env.IN_TEST && !isTrezorBuild) {
  await initWebHIDMockForSpeculos();  // Skipped for Trezor
}
if (!isTrezorBuild) {
  await Promise.race([initLedger(), ledgerInitTimeout]);  // Skipped for Trezor
}
```

This prevents the Speculos WebHID mock from interfering with Trezor tests and reduces startup time.

### 4.9 Ports

| Port | Purpose |
|------|---------|
| 8188 | Static asset server (iframe.html, iframe.JS, workers) |
| 21328 | CORS proxy → bridge :21329 (connect-web default BridgeTransport port) |
| 21325 | CORS proxy → bridge :21329 (secondary BridgeTransport port) |
| 21329 | Docker-mapped trezord-go bridge HTTP |
| 21324 | Docker-mapped emulator UDP debug-link |
| 9001 | Docker-mapped trezor-user-env WebSocket controller |
| 9002 | Dashboard (visual emulator screen) |

**Port 8188 (not 8088):** Port 8088 is used by the Solana WebSocket mock server (`test/e2e/websocket/solana-mocks.ts`). Using 8188 avoids the conflict.

### 4.10 Device Interaction

The trezor-user-env emulator **auto-confirms operations via the debug link**. No manual button press is needed for `getPublicKey` or signing operations. The WebSocket controller (`:9001`) provides manual control if needed:

- `emulator-press-yes` — confirm on device
- `emulator-press-no` — reject on device
- `emulator-click {x, y}` — touchscreen tap (for touchscreen models)
- `emulator-swipe {direction}` — swipe gesture
- `emulator-get-screenshot` — capture screen
- `emulator-get-screen-content` — read screen layout

### 4.11 E2E Wiring

| File | Purpose |
|------|---------|
| `test/e2e/trezor/docker-compose.yml` | trezor-user-env Docker service |
| `test/e2e/trezor/setup.cjs` | Pre-starts Docker + emulator + bridge + servers |
| `test/e2e/trezor/setup-log.cjs` | Same as setup.cjs with request logging |
| `test/e2e/trezor/iframe-assets/` | Cached connect-web iframe assets (iframe.html, JS) |
| `test/e2e/trezor/.gitignore` | Ignores iframe-assets/ and transport-bridge-bin.js |
| `test/e2e/tests/hardware-wallets/trezor/trezor-account.spec.ts` | Account connect smoke test |

### 4.12 Fetching Iframe Assets

The connect-web iframe assets (`iframe.html` + `iframe.HASH.js`) are NOT in the `@trezor/connect-web` npm package — they exist only at `https://connect.trezor.io/9/`. They must be fetched once and cached:

```bash
mkdir -p test/e2e/trezor/iframe-assets/js
curl -sL -o test/e2e/trezor/iframe-assets/iframe.html 'https://connect.trezor.io/9/iframe.html'
# Extract the JS hash from iframe.html, then fetch:
curl -sL -o test/e2e/trezor/iframe-assets/js/iframe.HASH.js 'https://connect.trezor.io/9/js/iframe.HASH.js'
```

---

## 5. QR Emulator

### 5.1 How It Works

The QR emulator uses **pure TypeScript synthesis** (not real firmware). QR codes are rendered as a Y4M video file and fed to Chrome's fake camera. The QR keyring's production scanner pipeline (`getUserMedia` → `zxing` → `URDecoder`) runs unmodified.

```
Extension
  │
  ├── getUserMedia (Chrome fake camera)
  │     ▼
  │   Y4M video feed (--use-file-for-fake-video-capture)
  │     Contains rendered QR codes (UR-encoded signing requests)
  │
  └── QrKeyringScannerBridge
      │  zxing decodes QR from video
      │  URDecoder parses UR format
      ▼
  Account/signing data flows to keyring
```

### 5.2 Components

| File | Purpose |
|------|---------|
| `qr/qr-emulator.ts` | Main orchestrator |
| `qr/constants.ts` | Seed, addresses, Y4M feed path |
| `qr/derive-account-address.ts` | Account derivation from seed |
| `qr/signer.ts` | Transaction/message signing |
| `qr/render-to-y4m.ts` | Renders QR codes to Y4M video format |

### 5.3 Chrome Flags

```javascript
if (process.env.QR_E2E === '1') {
  args.push('--use-fake-device-for-media-stream');
  args.push('--use-fake-ui-for-media-stream');
  if (process.env.QR_E2E_Y4M) {
    args.push(`--use-file-for-fake-video-capture=${process.env.QR_E2E_Y4M}`);
  }
}
```

- `--use-fake-device-for-media-stream`: Replaces the real camera with a fake device
- `--use-fake-ui-for-media-stream`: Auto-accepts the camera permission prompt
- `--use-file-for-fake-video-capture`: Feeds a Y4M video file as the camera input

### 5.4 QR Code Rendering

QR codes are rendered to a Y4M video file using a multi-step pipeline:
1. Encode the signing request as a UR (Uniform Resource) format
2. Render each UR fragment as a PPM image (QR code)
3. Convert PPM frames to Y4M video format
4. Feed the Y4M file to Chrome's fake camera

### 5.5 No Docker Required

Unlike Ledger and Trezor, the QR emulator does NOT use Docker. The Y4M file is generated at test time by the `@metamask/hw-emulator` QR module and fed to Chrome via flags.

### 5.6 E2E Wiring

| File | Purpose |
|------|---------|
| `test/e2e/tests/hardware-wallets/qr/qr-helpers.ts` | QR test helpers (connect, sign, render Y4M) |
| `test/e2e/tests/hardware-wallets/qr/qr-send.spec.ts` | ETH send |
| `test/e2e/tests/hardware-wallets/qr/qr-sign.spec.ts` | Message signing |
| `test/e2e/tests/hardware-wallets/qr/qr-error-modals.spec.ts` | Error handling |

---

## 6. Comparison Matrix

| Aspect | Ledger (Speculos) | Trezor | QR |
|--------|-------------------|--------|-----|
| **Firmware** | Real Ledger firmware | Real Trezor firmware | Pure TS synthesis |
| **Transport mock** | `navigator.hid` (browser API) | `connect-web` iframe URL | Camera input (Y4M) |
| **Transport injection** | Webpack entry (separate JS chunk) | Raw asset (emit hook) | Chrome flags (no injection) |
| **CSP changes** | None | `frame-src http://localhost:8188` | None |
| **Production source changes** | None | `popup: false` (1 line, inherent to offscreen) | None |
| **Docker** | ✅ Speculos | ✅ trezor-user-env | ❌ |
| **Chrome flags** | `--enable-features=WebHID` | None | `--use-fake-device-for-media-stream` |
| **Device approval** | Manual (REST API buttons) | Auto (debug link) | N/A (QR is one-way) |
| **Deterministic seed** | SLIP-14 in Speculos config | SLIP-14 via `emulator-setup` | SLIP-14 in TS constants |
| **Signing** | Real ECDSA (Ledger firmware) | Real ECDSA (Trezor firmware) | TS ECDSA (eth-sig-util) |
| **Offscreen init** | WebHID mock + Ledger init | Trezor handler only | Standard (no changes) |

---

## 7. The Extension's Offscreen Document

### 7.1 Boot Sequence

The offscreen document (`app/offscreen/offscreen.ts`) initializes in this order:

1. **WebHID mock** (Ledder only) — `initWebHIDMockForSpeculos()` replaces `navigator.hid`
2. **Post-message stream** — `initializePostMessageStream()` for Snap communication
3. **Trezor handler** — `initTrezor()` registers `chrome.runtime.onMessage` listener
4. **Lattice handler** — `initLattice()` registers message listener
5. **Ledger handler** — `initLedger()` initializes `@ledgerhq/hw-transport-webhid` (skipped for Trezor builds)
6. **Send `isBooted: true`** — signals background script that offscreen is ready

### 7.2 Trezor Message Flow

```
Popup/SW → chrome.runtime.sendMessage → Offscreen doc
  │
  └── trezor.ts onMessage listener
      ├── TrezorAction.init → TrezorConnectSDK.init()
      ├── TrezorAction.getPublicKey → TrezorConnectSDK.getPublicKey()
      ├── TrezorAction.signTransaction → TrezorConnectSDK.ethereumSignTransaction()
      ├── TrezorAction.signMessage → TrezorConnectSDK.ethereumSignMessage()
      ├── TrezorAction.signTypedData → TrezorConnectSDK.ethereumSignTypedData()
      └── TrezorAction.dispose → TrezorConnectSDK.dispose()
```

Each action sends a response via `sendResponse()` (async — the listener returns `true`).

### 7.3 The TrezorConnectSDK in the Offscreen Doc

`@trezor/connect-web` uses `CoreInIframe` mode:
- Creates a hidden `<iframe>` pointing to the connect-web core JS
- Parent communicates with iframe via `postMessage`
- The iframe's `BridgeTransport` sends HTTP requests to the bridge

In production: iframe loads from `connect.trezor.io/9/`
In E2E: iframe loads from `localhost:8188/` (our asset server)

---

## 8. E2E Test Infrastructure

### 8.1 Test Runner

Tests use Mocha + Selenium WebDriver (`test/e2e/run-e2e-test.js`).

### 8.2 The `withFixtures` Helper

`test/e2e/helpers.js` provides `withFixtures()`:
1. Starts Anvil (local Ethereum node)
2. Seeds account state
3. Launches Chrome with the extension
4. Waits for `.controller-loaded` CSS class (10s default timeout)
5. Runs the test callback
6. Checks for unexpected network hosts (privacy snapshot)
7. Tears down

### 8.3 The Privacy Snapshot

`privacy-snapshot.json` is a whitelist of hosts the extension can make network requests to during tests. New hosts cause test failures. When adding a new emulator that makes external requests, add the host:

```json
[
  "connect.trezor.io",
  "data.trezor.io",
  ...
]
```

---

## 9. Chrome Flags & CSP

### 9.1 Chrome Flags by Emulator

| Flag | Ledger | Trezor | QR |
|------|--------|--------|-----|
| `--enable-features=WebHID` | ✅ | — | — |
| `--disable-features=WebHidBlocklist` | ✅ | — | — |
| `--use-fake-device-for-media-stream` | — | — | ✅ |
| `--use-fake-ui-for-media-stream` | — | — | ✅ |
| `--use-file-for-fake-video-capture` | — | — | ✅ |

Trezor needs **zero Chrome flags** — the transport is entirely HTTP-based (no browser APIs to enable/disable).

### 9.2 Content Security Policy

The extension's CSP (`extension_pages` in manifest.json) controls what resources pages can load:

**Default CSP:**
```
script-src 'self' 'wasm-unsafe-eval'; object-src 'none'; frame-ancestors 'none'; font-src 'self';
```

**Trezor build adds:**
```
frame-src http://localhost:8188;
```

This allows the offscreen document to load an iframe from the local asset server.

**Critical:** Never add `'unsafe-inline'` to `script-src`. It triggers LavaMoat's security check, which blocks the controller from initializing (`.controller-loaded` timeout).

---

## 10. Service Lifecycle Management

### 10.1 Ledger

Services are managed by `startSharedSpeculos()` / `stopSharedSpeculos()`:
- Starts Docker + ApduBridge (via `withSpeculosFixtures`)
- Both run for the duration of the describe block
- Cleanup on `SIGTERM`/`SIGINT`

### 10.2 Trezor

Services are pre-started by `test/e2e/trezor/setup-log.cjs` (or `setup.cjs`):
1. Docker Compose `up -d` (trezor-user-env)
2. Wait for controller on `:9001`
3. `emulator-start` (boot firmware) + `emulator-setup` (load SLIP-14 seed)
4. `bridge-start` (start node-bridge inside container)
5. Wait 5s for bridge HTTP to bind
6. Start iframe asset server (`:8188`) and CORS proxies (`:21328`, `:21325`)

The services stay alive as long as the setup process runs. The test connects to them directly (no lifecycle management in the test itself).

### 10.3 QR

Services are inline — `renderToY4m()` generates the video file before the test. The file is passed to Chrome via `QR_E2E_Y4M` env var → `--use-file-for-fake-video-capture` flag. No persistent services needed.

---

## 11. Troubleshooting Guide

### 11.1 `.controller-loaded` Timeout

**Cause:** Chrome can't load the MetaMask controller within 10s.

**Diagnostics:**
1. Check if Docker is consuming too much memory (`docker stats`)
2. Check for stale processes (`ps aux | grep node`)
3. For Trezor: verify `__TREZOR_CONNECT_SRC` is set (not `undefined`)
4. For Trezor: verify Ledger init is being skipped (check document title for debug log)

**Common fixes:**
- Kill stale Node.js/Chrome processes
- Ensure only one emulator's services are running at a time
- For Trezor: verify the `isTrezorBuild` check fires (offscreen doc skips Ledger init)

### 11.2 Zero Requests to Asset/Proxy Server

**Cause:** The iframe never loads from the local server.

**Diagnostics:**
1. Check `corsValidator` — `127.0.0.1` is REJECTED, only `localhost` passes
2. Check for port conflicts (port 8088 = Solana WS mock)
3. Check `connectSrc` is set correctly (not `undefined`)
4. Check the `iframeSrc` starts with `http://`

### 11.3 "Select an account" Timeout

**Cause:** The `getPublicKey` request never reaches the device.

**Diagnostics:**
1. Check the CORS proxy log for requests from the iframe
2. Check the bridge status: `curl -X POST http://127.0.0.1:21329/`
3. Check device enumeration: `curl -X POST http://127.0.0.1:21329/enumerate`
4. Check emulator screen: `node -e "...emulator-get-screen-content..."`

### 11.4 Privacy Snapshot Error

**Cause:** The extension made a network request to a host not in `privacy-snapshot.json`.

**Fix:** Add the host to `privacy-snapshot.json`:
```bash
node -e "
const fs = require('fs');
const snap = JSON.parse(fs.readFileSync('./privacy-snapshot.json', 'utf8'));
if (!snap.includes('NEW_HOST')) {
  snap.push('NEW_HOST');
  fs.writeFileSync('./privacy-snapshot.json', JSON.stringify(snap, null, 2));
}
"
```

### 11.5 Chrome Version Mismatch

**Cause:** Chrome auto-updated; the cached chromedriver is incompatible.

**Fix:**
```bash
rm -rf ~/.cache/selenium/chromedriver/
# Re-run — selenium-manager will download the matching version
```

Or use Chrome for Testing:
```bash
SE_BROWSER_PATH="/tmp/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"
```

---

## Appendix A: Transport Boundary Decision History

### Ledger: Browser API Mock (`navigator.hid`)
Speculos speaks APDU-over-TCP, but the browser speaks HID frames. The `ApduBridge` translates between them. The mock sits at `navigator.hid` because that's the lowest practical boundary — the Ledger transport library uses WebHID directly.

### Trezor: HTTP/iframe Mock
Trezor's `@trezor/connect-web` uses an iframe loaded from `connect.trezor.io`. The mock sits at the iframe URL because `corsValidator` provides a supported override mechanism (`__TREZOR_CONNECT_SRC`). The bridge API is HTTP-based, so a CORS proxy handles the transport.

### QR: Camera Input Mock
The QR keyring reads QR codes via the device camera. The mock sits at the camera input because Chrome provides built-in fake camera support (`--use-fake-device-for-media-stream`). No code injection needed — just flags.

---

## Appendix B: Key Decisions

| Decision | Rationale |
|----------|-----------|
| Port 8188 (not 8088) | Port 8088 is used by Solana WebSocket mock |
| `localhost` (not `127.0.0.1`) | `corsValidator` only allows `localhost` URLs |
| Raw asset (not webpack entry) | Chunk loader hangs in offscreen doc context |
| No `'unsafe-inline'` in CSP | LavaMoat blocks controller initialization |
| Skip Ledger init for Trezor | Avoids WebHID mock interference + startup overhead |
| Pre-start services (not in before hook) | Docker startup memory contention crashes Chrome |
| No `autoApprove` | trezor-user-env auto-confirms via debug link |
| `popup: false` | Offscreen documents cannot call `window.open()` |
