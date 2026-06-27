# Trezor Hardware Wallet Emulator — Design Specification

| Field     | Value                                                              |
| --------- | ------------------------------------------------------------------ |
| Status    | Draft                                                              |
| Author    | (pending)                                                          |
| Branch    | `feat/hw-emulators-master`                                         |
| Package   | `@metamask/hw-emulator` (new `src/trezor/` submodule)             |
| Consumer  | `metamask-extension` (via `file:` resolution against local build)  |
| Related   | [ADR-0003](../adr/0003-trezor-transport-boundary.md), [QR Emulator Spec](./qr-emulator.md), [ADR-0001](../adr/0001-qr-emulator-placement.md), [ADR-0002](../adr/0002-no-scripts-transport.md) |

## 1. Purpose

The Trezor emulator is a **real Trezor firmware device running in Docker**, driven by tests the way a physical Trezor would be. It wraps the official [`trezor/trezor-user-env`](https://github.com/trezor/trezor-user-env) Docker image, and delivers its transport through the **"Trezor Suite" architecture**: a locally-served connect-web iframe (Origin = `localhost`, bypassing Chrome Private Network Access) + `@trezor/transport-bridge` (the Suite Node Bridge, a JS clone of `trezord-go`, running in UDP mode as a Node sidecar). The production `TrezorKeyring`, `TrezorOffscreenBridge`, offscreen `TrezorConnectSDK` (`@trezor/connect-web`), and the entire connect-web → `BridgeTransport` → `transport-bridge` → emulator chain run with exactly one unavoidable `IN_TEST`-gated line (`popup: false` — inherent to offscreen documents). All transport configuration (`connectSrc`, `transports`, the bridge process) is at build/wiring-time via `window.__TREZOR_CONNECT_SRC` HTML injection, matching the Ledger `navigator.hid` mock pattern. See [ADR-0003](../adr/0003-trezor-transport-boundary.md).

The existing `FakeTrezorBridge` test stub in `metamask-extension` is deleted, and the `process.env.IN_TEST` override in `app/scripts/wallet-init/keyrings.ts` is removed. The Trezor keyring then uses the real `TrezorOffscreenBridge` (MV3) / `TrezorConnectBridge` (MV2) in all builds — exactly as QR already does.

This is the **closest structural analog to Ledger/Speculos** in the `hw-emulator` family: real device-side firmware and crypto (not pure-TS synthesis like QR), with the transport mocked at the lowest practical boundary.

## 2. Goals

- **G1** — One canonical Trezor device emulator that any test (unit, integration, or E2E) can drive, for all five trezor-user-env-supported models (`T1B1`, `T2T1`, `T3B1`, `T3T1`, `T3W1`).
- **G2** — Production `TrezorKeyring` + `@trezor/connect-web` run unmodified in tests. Zero `if (IN_TEST)` branches for Trezor in `app/scripts/wallet-init/keyrings.ts`.
- **G3** — **Near-zero production source change.** All transport configuration (`connectSrc`, `transports`, the bridge process) is at build/wiring-time via `window.__TREZOR_CONNECT_SRC` HTML injection — the same mechanism Ledger uses for its `navigator.hid` mock. Exactly **one** unavoidable production-source line remains: `popup: false` in `TrezorConnectSDK.init()` (IN_TEST-gated), required because offscreen documents cannot open popup windows — this line is inherent to *any* approach using `@trezor/connect-web` in the offscreen. See [ADR-0003](../adr/0003-trezor-transport-boundary.md).
- **G4** — Real Trezor firmware crypto. Signatures come from the real `trezor-emu-core` binary running real firmware, exactly as Ledger signatures come from real Speculos firmware. No synthetic ECDSA.
- **G5** — Symmetry with the Ledger/Speculos pattern: real device firmware, transport mocked at the lowest practical boundary, a Node relay (`TrezorBridgeProxy`) that doubles as the assertion/error-injection layer — the direct analog of Ledger's `ApduBridge`.
- **G6** — Full Ledger-parity E2E suite (8 specs: account, send, erc20, erc721, sign, personal-sign, error-modals, forget-device).

## 3. Non-Goals

- **N1** — Firefox E2E support. Chrome-only, mirroring Ledger (WebHID) and QR (fake-camera) precedent.
- **N2** — Physical-device testing. The emulator is the only Trezor target for automated tests.
- **N3** — Replacing or modifying `FakeLedgerBridge`. Out of scope; only `FakeTrezorBridge` is removed.
- **N4** — Vendoring or forking `trezor-user-env` Python source. The emulator *wraps* the official Docker image with TypeScript modules; it does not port the Python controller. (Mirrors how Ledger wraps `ghcr.io/ledgerhq/speculos` rather than vendoring Speculos's Python.)
- **N5** — WebUSB browser-API mocking. Rejected as non-viable — see [ADR-0003](../adr/0003-trezor-transport-boundary.md).
- **N6** — Cross-repo CI workflow design at the GitHub Actions level. The spec describes the build-order contract (inherited from QR); concrete CI wiring is implementation work.
- **N7** — A standalone `@metamask/trezor-emulator` package. Decided against; reuses the [ADR-0001](../adr/0001-qr-emulator-placement.md) submodule decision — `src/trezor/` inside `@metamask/hw-emulator`.

## 4. Background

### 4.1 Current state of Trezor testing in `metamask-extension`

| File | Role |
| --- | --- |
| `app/scripts/wallet-init/keyrings.ts` (lines 34–37) | Contains a `process.env.IN_TEST` override that swaps the Trezor bridge for `FakeTrezorBridge` in test builds. **Production code contaminated with a test hook** — the same antipattern QR just eliminated. |
| `test/stub/keyring-bridge.js` (lines 72–178) | `FakeTrezorBridge` — returns canned `{id,success,payload}` shapes for `getPublicKey` / `ethereumSignTransaction` / `ethereumSignMessage` / `ethereumSignTypedData`. Signs with hardcoded `KNOWN_PRIVATE_KEYS` via `@ethereumjs/tx` / `eth-sig-util`. Never touches a device, never runs `@trezor/connect-web`. |
| `app/offscreen/hardware-wallets/trezor.ts` | MV3 production handler: runs `TrezorConnectSDK.init()` + `.getPublicKey()` / `.ethereumSign*()` in the offscreen document. Imports `@trezor/connect-web`. |
| `app/scripts/lib/offscreen-bridge/trezor-offscreen-bridge.ts` | MV3 service-worker bridge → `chrome.runtime.sendMessage` → offscreen handler. |
| (no `test/e2e/tests/hardware-wallets/trezor/`) | No Trezor E2E suite exists today. |

### 4.2 The Ledger/Speculos precedent (the pattern to mirror)

| Concern | Ledger | Trezor (this spec) |
| --- | --- | --- |
| Production keyring wiring | Real `LedgerOffscreenBridge` | Real `TrezorOffscreenBridge` |
| Test keyring wiring | Real `LedgerOffscreenBridge` (no `IN_TEST` override) | Real `TrezorOffscreenBridge` (no `IN_TEST` override) |
| Transport mocked at | Browser API boundary (`navigator.hid` via injected WebHID mock script) | HTTP boundary (Node proxy on connect-web's *default* `BridgeTransport` port `21328`, forwarding to `trezord-go` `21325`) — **no browser-side mock** |
| Test-only branches in production code | None | None |
| Device emulator | Speculos (Docker, real firmware) | trezor-user-env (Docker, real firmware) |
| Node relay | `ApduBridge` (WebSocket ↔ HID-frame ↔ APDU ↔ Speculos TCP) | `TrezorBridgeProxy` (HTTP `21328` ↔ `21325`, transparent forward + hooks) — *no protocol translation* |
| Device control API | Speculos REST (`pressButton`, `getScreenshot`) | trezor-user-env WS controller (`:9001` — `emulator-press-yes/no`, `emulator-input`, `emulator-click`, `emulator-swipe`, `emulator-get-screenshot`) |

**Two structural simplifications vs Ledger:** (1) Trezor needs *no* browser-side mock — the proxy is Node-side, so the entire LavaMoat/offscreen-injection class of edge cases that Ledger fights disappears. (2) `trezord-go` already speaks `@trezor/connect-web`'s native HTTP protocol, so the relay does *no* protocol translation — it is a transparent forward with optional hooks, strictly simpler than Ledger's `ApduBridge` (which reassembles HID frames into APDUs).

### 4.3 trezor-user-env primer

`trezor/trezor-user-env` is the official Trezor dev/test environment: a Python controller + Docker image that launches real Trezor firmware emulators. The Docker image bundles three things this emulator depends on:

| Component | Port | Role |
| --- | --- | --- |
| WebSocket controller | `9001` | JSON command API — drives everything from a test harness (`emulator-start`, `emulator-setup`, `emulator-press-yes/no`, `emulator-input`, `emulator-click`, `emulator-swipe`, `emulator-get-screenshot`, `bridge-start/stop`, …). This is the analog of Speculos's REST API. |
| `trezord-go` bridge | `21325` | HTTP API that `@trezor/connect-web`'s `BridgeTransport` talks to. This is *already* the production transport endpoint. |
| Emulator UDP debug-link | `21324` | Raw protobuf UDP; mapped to the bridge via trezord's `-ed 21324:21325` flag. Not used directly by the emulator (the bridge exposes it over HTTP). |

Supported models: `T1B1` (Trezor One, physical buttons), `T2T1` (Model T / Safe 3, touchscreen), `T3B1`, `T3T1`, `T3W1` (Safe 5 family, touchscreen).

## 5. Architecture

### 5.1 Component layout

```
accounts/packages/hw-emulator/
└── src/
    ├── trezor/                       ← NEW submodule (this spec)
    │   ├── index.ts                  ← Public exports
    │   ├── trezor-emulator.ts        ← TrezorEmulator implements HardwareWalletEmulator
    │   ├── controller-client.ts      ← WS client to :9001 (device control: buttons, seed, screenshot)
    │   ├── sidecar-manager.ts        ← manages @trezor/transport-bridge Node process (UDP mode) + static server for connect-web iframe assets
    │   ├── html-injector.ts          ← injects window.__TREZOR_CONNECT_SRC into offscreen HTML (Ledger navigator.hid pattern)
    │   ├── docker-manager.ts         ← trezor-user-env container lifecycle (docker compose)
    │   ├── device-interaction.ts     ← multi-model approve/reject/navigate dispatch
    │   ├── model-profiles.ts         ← per-model interaction + screen-layout config
    │   ├── constants.ts              ← ports, SLIP-14 seed, derived addresses per model
    │   ├── resilience.ts             ← retry/backoff (REUSED from ledger/, shared copy)
    │   └── *.test.ts                 ← colocated unit tests
    ├── ledger/                       ← existing
    ├── qr/                           ← existing
    ├── ble/                          ← existing
    ├── factory.ts                    ← existing — replace Trezor "not implemented" throw
    └── types.ts                      ← existing — EmulatorType.Trezor already declared

metamask-extension/
└── test/e2e/trezor/                  ← NEW wiring (mirrors test/e2e/speculos/)
    ├── docker-compose.yml            ← trezor-user-env service
    ├── constants.ts                  ← Trezor ports, seed-derived addresses (mirror speculos/constants.ts)
    ├── shared-context.ts             ← startSharedTrezor / stopSharedTrezor
    ├── with-trezor-fixtures.ts       ← per-test fixture wrapper
    ├── build-config.ts               ← env validation (TREZOR_E2E=1) — near-zero Chrome flags
    ├── cleanup.ts                    ← port/process cleanup with Trezor ports
    └── test-helper.ts                ← Docker lifecycle helpers
└── test/e2e/tests/hardware-wallets/trezor/   ← NEW specs (mirror ledger/)
    ├── trezor-helpers.ts             ← shared helpers (account connect, approve, reject, seed balances)
    ├── trezor-account.spec.ts
    ├── trezor-send.spec.ts
    ├── trezor-erc20.spec.ts
    ├── trezor-erc721.spec.ts
    ├── trezor-sign.spec.ts
    ├── trezor-personal-sign.spec.ts
    ├── trezor-error-modals.spec.ts
    └── trezor-forget-device.spec.ts
```

**Notably absent vs Ledger:** no `webhid-mock-script.ts` (no browser-API mock — Trezor uses `window.__TREZOR_CONNECT_SRC` HTML injection instead), no `*-hid-framing.ts` (no HID framing; HTTP carries hex protobuf), no `bridge-proxy.ts` (replaced by `@trezor/transport-bridge` sidecar + local iframe server).

### 5.2 Component responsibilities

| Component | Responsibility | Library deps |
| --- | --- | --- |
| `trezor-emulator.ts` | Orchestrates lifecycle: start Docker → wait for controller `:9001` → `emulator-start` + `emulator-setup` (load seed) → start `sidecar-manager` (transport-bridge + iframe-asset server) → inject `window.__TREZOR_CONNECT_SRC` → expose `DeviceInteraction`. Implements the `HardwareWalletEmulator` interface from `types.ts`. | `ws`, internal modules |
| `controller-client.ts` | Promise-based WebSocket client to `ws://127.0.0.1:9001/`. Wraps the controller protocol: `emulator-start`, `emulator-setup`, `emulator-press-yes/no`, `emulator-input`, `emulator-click`, `emulator-swipe`, `emulator-get-screenshot`, `bridge-start/stop`, `background-check`, `ping`. Auto-increments message ids; resolves on `{success, id, response}`. | `ws` |
| `sidecar-manager.ts` | Spawns `@trezor/transport-bridge` as a child process in **UDP mode** (default port `21328`, talks UDP to emulator `:21324`). Also starts a static HTTP server serving the connect-web iframe assets (fetched once from `connect.trezor.io/9/` at test-setup, cached, served on `http://localhost:8088/`). Lifecycle: `start()` / `stop()`. | `child_process` (Node built-in), `http` |
| `html-injector.ts` | Injects `window.__TREZOR_CONNECT_SRC = 'http://localhost:8088/'` into the offscreen HTML **before the app bundle** — the same build/wiring-time injection pattern Ledger uses for its `navigator.hid` mock. This tells `@trezor/connect-web`'s `CoreInIframe` to load the iframe from the locally-served assets, bypassing Chrome Private Network Access. Zero production source change. | — |
| `docker-manager.ts` | `docker compose -f <composeFile> up -d` / `down`. Healthcheck via controller `ping`. Port-mapping `9001`, `21325` (host) → container. Mirrors `ledger/docker-manager.ts`. | `docker` (external binary) |
| `device-interaction.ts` | Implements `DeviceInteraction` (the interface returned by `getInteraction()`). `approveTransaction` / `approveSigning` / `rejectTransaction` / `navigateToMainMenu` dispatch to `controller-client` via the active `ModelProfile`. | internal |
| `model-profiles.ts` | `Record<TrezorModel, ModelProfile>`. `ModelProfile = { interaction: 'button' \| 'touch', confirm: PressAction, reject: PressAction, scroll?: SwipeAction, layout: 'oled-128x64' \| 'touch-240x280' }`. Encodes the per-model approval sequence. | — |
| `constants.ts` | `TREZOR_CONNECT_SRC='http://localhost:8088/'`, `TREZOR_TRANSPORT_BRIDGE_PORT=21328`, `TREZOR_BRIDGE_PORT=21325`, `TREZOR_CONTROLLER_PORT=9001`, `TREZOR_EMULATOR_PORT=21324`, `TREZOR_EMULATOR_SEED` (SLIP-14), `TREZOR_ADDRESSES` (derived per model). | — |
| `resilience.ts` | Reused verbatim from `ledger/` (or hoisted to a shared `internal/` if preferred during implementation). | — |

### 5.3 The transport data flow (Suite way — local iframe + transport-bridge)

```
CONNECT / ACCOUNT-DERIVATION FLOW (device → MM):

  TrezorEmulator.start()
    → docker-manager: docker compose up trezor-user-env
    → controller-client (ws://127.0.0.1:9001):
        emulator-start   { model: 'T2T1', wipe: true }
        emulator-setup   { mnemonic: TREZOR_EMULATOR_SEED, pin:'', passphrase_protection:false, label:'MetaMask Test' }
        bridge-start     { }                              # boots @trezor/transport-bridge (UDP mode) on :21328
    → sidecar-manager: start static server serving connect-web iframe assets on http://localhost:8088/
    → html-injector: injects window.__TREZOR_CONNECT_SRC = 'http://localhost:8088/' into offscreen HTML
                      (build/wiring-time, before the app bundle — Ledger navigator.hid pattern)

  Test navigates MM → "Connect Trezor" → real TrezorOffscreenBridge → offscreen
    TrezorConnectSDK.init({ ...msg.params, env: 'webextension' })            # UNMODIFIED, no connectSrc/transports
    → connectSettings.js:25-32 reads window.__TREZOR_CONNECT_SRC → overrides connectSrc
    → CoreInIframe loads iframe from http://localhost:8088/ (Origin = localhost)
    TrezorConnectSDK.getPublicKey({ path, coin:'ETH' })
      → iframe posts CALL to core
      → core runs default BridgeTransport → HTTP POST /enumerate to default port 21328 (transport-bridge)
      → transport-bridge relays → UDP :21324 → emulator firmware computes pubkey
    → MM receives real Trezor-derived pubkey. addAccounts() derives real addresses.

SIGN / APPROVE FLOW (bidirectional):

  Test triggers a sign in MM → offscreen TrezorConnectSDK.ethereumSignTransaction(...)
    → iframe core runs BridgeTransport → /call (EthereumSignTx protobuf, hex-encoded)
    → transport-bridge → UDP :21324 → emulator firmware shows confirm screen
  Test (or DeviceInteraction.approveTransaction):
    → controller-client (ws://127.0.0.1:9001):
        emulator-press-yes   # T1B1
        -- or --
        emulator-click {x,y} # touchscreen models (confirm coords from ModelProfile)
    → emulator firmware confirms → signs → response flows back
    → MM receives real Trezor signature → broadcasts.

REJECT FLOW:
  DeviceInteraction.rejectTransaction → controller-client emulator-press-no (or click reject coords)
    → emulator returns Failure → MM shows rejection modal.

ERROR-INJECTION (for trezor-error-modals.spec):
  The test driver injects error responses at the transport-bridge layer (TBD during Phase 1 —
  either via a proxy-in-front-of-transport-bridge or by sending debug commands to the controller).
```

> **Note:** `popup: false` is required in `TrezorConnectSDK.init()` because offscreen documents cannot `window.open()` — this is the **one unavoidable production-source line** (IN_TEST-gated). All other transport configuration is at build/wiring-time. See ADR-0003 §"Decision".

## 6. Public API contract

### 6.1 Factory

```ts
import { createEmulator, EmulatorType } from '@metamask/hw-emulator';

const emulator = createEmulator(EmulatorType.Trezor, {
  model: 'T2T1',                       // default; one of T1B1 | T2T1 | T3B1 | T3T1 | T3W1
  seed: TREZOR_EMULATOR_SEED,          // default SLIP-14; override per-instance
  label: 'MetaMask Test',
  connectSrcPort: 8088,                // default; static server for connect-web iframe assets
  transportBridgePort: 21328,          // default; @trezor/transport-bridge HTTP port
  controllerPort: 9001,                // default; container port
  composeFile: undefined,              // optional override of docker-compose path
  display: false,                      // VNC off by default (set true to debug)
});
```

### 6.2 `TrezorEmulator` interface

`TrezorEmulator` implements `HardwareWalletEmulator` (interface symmetry with Speculos and QrEmulator):

```ts
export interface TrezorEmulator extends HardwareWalletEmulator {
  // ── HardwareWalletEmulator ──────────────────────────────────────────
  start(): Promise<void>;                       // docker up, controller setup, sidecar start + iframe serve, HTML inject
  stop(): Promise<void>;                        // sidecar stop, docker down, controller close
  isRunning(): boolean;
  getInteraction(): DeviceInteraction;          // TrezorDeviceInteraction (multi-model)
  approveTransaction(): Promise<void>;          // press-yes / click-confirm per active ModelProfile
  approveSigning(): Promise<void>;              // semantic alias
  rejectTransaction(): Promise<void>;           // press-no / click-reject per active ModelProfile
  navigateToMainMenu(): Promise<void>;          // model-specific navigation sequence

  // ── Trezor-specific accessors (for test helpers) ────────────────────
  getModel(): TrezorModel;
  getControllerClient(): TrezorControllerClient;
  getSidecarManager(): TrezorSidecarManager;
  getScreenshot(): Promise<Buffer>;             // delegates to controller emulator-get-screenshot
}
```

### 6.3 `TrezorSidecarManager` — the sidecar manager

```ts
export interface TrezorSidecarManager {
  start(): Promise<void>;   // starts transport-bridge (UDP mode, :21328) + static server for iframe assets (:8088)
  stop(): Promise<void>;
  isRunning(): boolean;
}
```

> **Note on error injection:** Unlike the original `TrezorBridgeProxy` (which sat between connect-web and trezord-go and could inject HTTP-level errors), the `TrezorSidecarManager` is a pass-through: it only manages the transport-bridge and iframe-server processes. Error injection for `trezor-error-modals.spec` will be handled at a different layer (either via the controller `:9001` sending debug commands to the emulator, or by a thin proxy in front of transport-bridge — to be resolved during Phase 1 implementation).

### 6.4 Constants (exported)

```ts
// packages/hw-emulator/src/trezor/constants.ts

/** Canonical SLIP-14 test mnemonic (matches trezor-connect's own test preset). */
export const TREZOR_EMULATOR_SEED = 'all all all all all all all all all all all all';

/** Default model. Trezor Model T / Safe 3 (touchscreen, flagship). */
export const TREZOR_DEFAULT_MODEL: TrezorModel = 'T2T1';

/** connectSrc override: the URL of the locally-served connect-web iframe assets. */
export const TREZOR_CONNECT_SRC = 'http://localhost:8088/';

/** @trezor/transport-bridge HTTP port (default). The iframe's BridgeTransport hits this. */
export const TREZOR_TRANSPORT_BRIDGE_PORT = 21328;

/** Emulator UDP debug-link port (informational; transport-bridge talks to this). */
export const TREZOR_EMULATOR_PORT = 21324;

/**
 * Trezor protobuf message type IDs used for signing detection.
 * (Verified against @trezor/protobuf message definitions.)
 */
export const TREZOR_MSG = {
  EthereumSignTx: 58,
  EthereumSignMessage: 60,
  EthereumSignTypedData: 495,
} as const;

/**
 * Derived addresses m/44'/60'/0'/0/n (n=0..4) for TREZOR_EMULATOR_SEED, per model.
 * Computed once during implementation and hardcoded (analog of SPECULOS_LEDGER_ADDRESSES).
 * T1B1 and T2T1+ derive identically (same BIP-32 path); the per-model map exists
 * for forward-compat if model-specific paths are ever needed.
 */
export const TREZOR_ADDRESSES: Record<TrezorModel, Hex[]>;
export const TREZOR_ADDRESS: Hex; // = TREZOR_ADDRESSES[TREZOR_DEFAULT_MODEL][0]
```

### 6.5 Model profiles

```ts
// packages/hw-emulator/src/trezor/model-profiles.ts

export type TrezorModel = 'T1B1' | 'T2T1' | 'T3B1' | 'T3T1' | 'T3W1';
export type Interaction = 'button' | 'touch';

export interface ModelProfile {
  model: TrezorModel;
  interaction: Interaction;
  layout: 'oled-128x64' | 'touch-240x280';
  confirm: 'press-yes' | { click: { x: number; y: number } };
  reject: 'press-no' | { click: { x: number; y: number } };
  scrollApproach?: 'swipe-up' | 'swipe-down';
}

export const MODEL_PROFILES: Record<TrezorModel, ModelProfile>;
```

## 7. Implementation files

All emulator-core files live under `accounts/packages/hw-emulator/src/trezor/`. See §5.1 for the tree.

### 7.1 Files to add (`accounts` repo)

- `src/trezor/index.ts`
- `src/trezor/trezor-emulator.ts`
- `src/trezor/controller-client.ts`
- `src/trezor/bridge-proxy.ts`
- `src/trezor/docker-manager.ts`
- `src/trezor/device-interaction.ts`
- `src/trezor/model-profiles.ts`
- `src/trezor/constants.ts`
- Colocated unit tests for each (`.test.ts`).
- `src/trezor/README.md` documenting the public API and usage examples.

### 7.2 Files to modify (`accounts` repo)

| File | Change |
| --- | --- |
| `packages/hw-emulator/src/factory.ts` | Replace `throw new Error('Trezor emulator is not yet implemented')` with `case EmulatorType.Trezor: return new TrezorEmulator(options as TrezorEmulatorOptions);`. (`EmulatorType.Trezor` already declared in `types.ts`.) |
| `packages/hw-emulator/src/index.ts` | Re-export `TrezorEmulator`, `TrezorEmulatorOptions`, `TrezorBridgeProxy`, `TrezorModel`, `MODEL_PROFILES`, and the `TREZOR_*` constants. |
| `packages/hw-emulator/package.json` | Confirm `ws` already present (yes, from ledger/). No new runtime deps expected — `http` is Node built-in; the controller protocol is plain JSON over WS. Bump version per release process. |
| `packages/hw-emulator/CHANGELOG.md` | Add entry: `feat(hw-emulator): add Trezor hardware wallet emulator ([#TODO](...))`. |

### 7.3 Files to add (`metamask-extension` repo)

- `test/e2e/trezor/docker-compose.yml` (trezor-user-env service, ports `9001`/`21325`).
- `test/e2e/trezor/constants.ts`, `shared-context.ts`, `with-trezor-fixtures.ts`, `build-config.ts`, `cleanup.ts`, `test-helper.ts`.
- `test/e2e/tests/hardware-wallets/trezor/trezor-helpers.ts` + 8 specs (§8.3).
- `.github/workflows/e2e-trezor.yml` (mirrors `e2e-speculos.yml`; implementation-phase).

### 7.4 Files to modify / delete (`metamask-extension` repo)

| File | Action |
| --- | --- |
| `test/stub/keyring-bridge.js` | Delete `FakeTrezorBridge` class (lines 72–178). **Leave `FakeLedgerBridge` untouched** (out of scope, N3). |
| `app/scripts/wallet-init/keyrings.ts` | Remove the `trezorBridge` line from the `IN_TEST` overrides object (lines 36–37). The MV3 path then always passes `TrezorOffscreenBridge`; MV2 always passes `TrezorConnectBridge` — mirroring how QR always passes `QrKeyringScannerBridge`. |
| `test/e2e/webdriver/chrome.js` | Add a `TREZOR_E2E=1` block. **Near-zero flags** — no WebHID/WebUSB needed. Likely just an env-validation marker; add flags only if R1 (§12.1) surfaces a need. |

## 8. Test architecture

### 8.1 Unit tests — `accounts/packages/hw-emulator/src/trezor/*.test.ts`

Jest, colocated. No Docker, no browser. Mocked WS + HTTP. Cover:

- **`controller-client`**: each controller command produces the correct WS `{type, id, …}` frame and resolves with `{response}` on the matching reply. Reconnect/backoff on socket drop.
- **`bridge-proxy`**: forwards `/enumerate`/`/acquire`/`/call`/`/release` verbatim to the upstream (stubbed `fetch`/`http.request`); correctly parses the 6-byte protobuf header to extract `msgType`; emits `'signing-call'` for msgType ∈ {58,60,495} and *not* for others; `injectErrorResponse` short-circuits the next matching `/call` and returns the injected JSON; pass-through resumes after one injection.
- **`device-interaction`**: for a `button` profile, `approveTransaction` issues `emulator-press-yes`; for a `touch` profile, issues `emulator-click` at the profile's confirm coords. Parametrized over all five models.
- **`model-profiles`**: every `TrezorModel` has a complete `ModelProfile` (no `undefined` fields); `confirm`/`reject` shapes match `interaction`.
- **`docker-manager`**: composes the correct `docker compose` invocation; healthcheck polls controller `ping` with backoff.

### 8.2 Integration with `accounts/packages/keyring-eth-trezor`

A small Node-side integration test wiring the real `TrezorConnectBridge` against a running emulator (requires Docker; gated behind an env flag so it doesn't run in plain `yarn test:unit`). Exercises `addAccounts` / `signTransaction` / `signPersonalMessage` / `signTypedData` end-to-end through the proxy + real firmware, asserting signatures recover to `TREZOR_ADDRESS`. (Mirrors QR's `emulator.test.ts` integration shape, but needs the Docker daemon — so it lives behind a `TREZOR_INTEGRATION=1` gate.)

### 8.3 E2E tests — `metamask-extension/test/e2e/tests/hardware-wallets/trezor/*.spec.ts`

Playwright, Chrome only. 8 specs mirroring the Ledger suite under `test/e2e/tests/hardware-wallets/ledger/`:

| Spec | Covers |
| --- | --- |
| `trezor-account.spec.ts` | Account connect, derivation against `TREZOR_ADDRESSES`, unlock, disconnect |
| `trezor-send.spec.ts` | EIP-1559 ETH send; legacy send (type 0) if the gas-estimation path cooperates (QR skipped type 0 for a non-device reason) |
| `trezor-erc20.spec.ts` | ERC-20 token send |
| `trezor-erc721.spec.ts` | ERC-721 NFT send |
| `trezor-sign.spec.ts` | EIP-712 typed-data v4 signing |
| `trezor-personal-sign.spec.ts` | Personal message signing |
| `trezor-error-modals.spec.ts` | Rejection on-device; `bridge-proxy.injectErrorResponse` for transport errors; device-disconnect modal |
| `trezor-forget-device.spec.ts` | Forget device flow |

Specs parametrize over `model` where the interaction differs. The **primary validation model is `T2T1`** (flagship, matches trezor-connect's own tests); the other four models run as a secondary matrix with a lower flakiness bar — per-model layout issues are documented, not blocking (see R2, §12.2).

## 9. Consumer integration (`metamask-extension`)

### 9.1 `package.json` — `file:` resolution (inherited from QR)

The QR work already flipped `@metamask/hw-emulator` to `file:../accounts/packages/hw-emulator`. Trezor adds no new package entry — it slots into the existing submodule. Only a `yarn install` + `yarn lavamoat:auto` is needed to pick up the new `src/trezor/` exports (no new runtime deps are expected, so LavaMoat impact is minimal — see §11).

### 9.2 Build order contract (inherited from QR)

1. `cd accounts && yarn build` (produces `packages/hw-emulator/dist/` with `src/trezor/`).
2. `cd metamask-extension && yarn install` (resolves the `file:` symlink).
3. `cd metamask-extension && yarn lavamoat:auto` (regenerate policies; expected to be a no-op or near-no-op since no new runtime deps).
4. `cd metamask-extension && yarn build:test`.

### 9.3 Cleanup tasks in `metamask-extension`

| File | Action |
| --- | --- |
| `app/scripts/wallet-init/keyrings.ts` | Remove the `trezorBridge` line from the `IN_TEST` overrides object (lines 36–37). Remove the `overrides?.trezorBridge \|\|` fallbacks in both the MV2 (line 62) and MV3 (line 77) `hardwareKeyringBuilderFactory(TrezorKeyring, …)` calls. MV2 always passes `TrezorConnectBridge`; MV3 always passes `TrezorOffscreenBridge`. (OneKey lines 66/81 are untouched — they always passed the real bridge.) |
| `app/offscreen/hardware-wallets/trezor.ts` | **ADD** the one unavoidable `IN_TEST`-gated line: `popup: false` inside the `TrezorConnectSDK.init()` call. Offscreen documents cannot open popup windows — `core-in-iframe.js:178`'s `_popupManager.request()` hangs indefinitely without this. This is the **only production-source change** required by the transport architecture. See [ADR-0003](../adr/0003-trezor-transport-boundary.md). |
| `app/offscreen/offscreen.html` (or the test-build entry) | **Inject** `<script>window.__TREZOR_CONNECT_SRC = 'http://localhost:8088/';</script>` into the offscreen HTML before the app bundle — the **same build/wiring-time injection pattern Ledger uses** for its `navigator.hid` mock. Gated by `TREZOR_E2E=1` in the test harness. **Not a production source change** — wiring-time only. |
| `test/stub/keyring-bridge.js` | Delete `FakeTrezorBridge` (lines 72–178). Leave `FakeLedgerBridge` (181–364), `KNOWN_PUBLIC_KEY*`, `KNOWN_PRIVATE_KEYS` untouched. |
| `test/e2e/webdriver/chrome.js` | Add the `TREZOR_E2E=1` block per §7.4. |

## 10. CI & concurrency

### 10.1 Local / developer workflow

```bash
# Terminal 1 — accounts
cd accounts
git switch feat/hw-emulators-master
yarn install && yarn build

# Terminal 2 — metamask-extension
cd metamask-extension
git switch <trezor-emulator-consumer-branch>
yarn install && yarn build:test

# Run a single Trezor E2E
TREZOR_E2E=1 yarn test:e2e:single \
  test/e2e/tests/hardware-wallets/trezor/trezor-account.spec.ts \
  --browser=chrome
```

### 10.2 Concurrency model

- **Unit tests** (`accounts`): unlimited Jest parallelism; WS + HTTP are mocked.
- **E2E tests** (`metamask-extension`): one Chromium + one trezor-user-env container per Playwright worker. Each worker allocates a unique proxy port (`TREZOR_BRIDGE_PROXY_PORT` base + worker offset) and unique container ports via `docker-compose` project naming, mirroring how Speculos handles multi-device presets. Button automation (`:9001`) is per-container, so workers don't contend.

### 10.3 CI matrix

| OS | Chrome |
| --- | --- |
| Linux (Docker) | ✅ Full path (trezor-user-env runs natively Linux) |
| macOS | ✅ Local dev (trezor-user-env Docker image supports macOS incl. Apple Silicon under emulation) |
| Windows | ⚠️ Verify Docker Desktop trezor-user-env compatibility |

### 10.4 Cross-repo CI

Inherited from QR (§10.4 of the QR spec): both repos checked out as siblings, `accounts` built first. The build-order contract in §9.2 is the spec-level constraint; the concrete workflow is implementation work.

## 11. Dependencies

### 11.1 Runtime deps

No new runtime dependencies are expected. The Trezor emulator uses:

- **`ws`** — already a `hw-emulator` dependency (used by `ledger/apdu-bridge.ts`). Reused for `controller-client.ts`.
- **Node `http`** — built-in. Used by `bridge-proxy.ts`.
- **`docker compose`** — external binary, already a `hw-emulator` runtime requirement (Ledger). Reused for `docker-manager.ts`.

### 11.2 External runtime requirements

- **Docker** — required to run `ghcr.io/trezor/trezor-user-env:latest`. Already a Ledger requirement.
- The `trezor-user-env` Docker image is pulled on first run (large; cache it in CI).

### 11.3 No `@trezor/*` packages added to `hw-emulator`

`hw-emulator/src/trezor/` does **not** import `@trezor/connect-web`, `@trezor/transport`, or `@trezor/protobuf`. The proxy speaks raw HTTP (transparent forward) and parses only the 6-byte protobuf *header* (a `Buffer.readUInt16BE(0)`) — it never encodes/decodes protobuf bodies. This keeps `hw-emulator`'s dependency surface clean and avoids coupling to trezor-suite version churn. (If signing-detection ever needs body-level decoding, `@trezor/protobuf` can be added then — but the header-only design avoids it.)

## 12. Risks and open questions

### 12.1 R1 — `connect-web` iframe / `connectSrc` offline behavior

**RESOLVED (2026-06-23, 4 Phase-0 spikes).** The original R1 asked whether `@trezor/connect-web` could run offline with default settings against the emulator. Answer: the **public `connect.trezor.io` iframe is blocked** by Chrome Private Network Access (PNA) from reaching loopback, and `trezord-go`'s Origin whitelist rejects non-Trezor origins. The solution adopted: serve the **connect-web iframe locally** (`http://localhost:8088/`), use **`@trezor/transport-bridge`** (Suite Node Bridge, which whitelists `localhost`) instead of `trezord-go`, and inject `window.__TREZOR_CONNECT_SRC` via pre-bundle HTML script (the Ledger `navigator.hid` pattern). The only unavoidable production-source line is `popup: false` (offscreen docs cannot open popups). Full evidence in [ADR-0003](../adr/0003-trezor-transport-boundary.md) and 4 spike commits (`fceda3f1`, `685544fc`, `959266d6`, `b781c0ba`).

**Status:** ✅ RESOLVED by spikes. Transport architecture locked (ADR-0003).

### 12.2 R2 — multi-model screen-layout flakiness

All five models are in scope (G1), but they span two interaction paradigms and two screen layouts (`oled-128x64` for T1B1, `touch-240x280` for the rest). The `emulator-click` coordinates in `ModelProfile` are firmware-version-dependent; a firmware bump could shift confirm-button locations.

**Mitigation:** Primary validation is `T2T1` (flagship, matches trezor-connect's tests). The other four models run as a secondary matrix; per-model layout flakiness is documented, not blocking. `emulator-get-screenshot` + `emulator-get-screen-content` provide a debug path when a coordinate drifts. Pin the trezor-user-env firmware version in `docker-compose.yml` for reproducibility.

**Status:** Acknowledged; tuning parameter, not architectural.

### 12.3 R3 — `trezor-user-env` Docker image size & availability

The image is large (bundles firmware for all models). First-pull is slow; CI should cache it. If `ghcr.io/trezor/trezor-user-env:latest` is ever unavailable, tests block.

**Mitigation:** Pin a digest in `docker-compose.yml` for reproducibility; mirror to an internal registry if CI reliability demands it.

**Status:** Operational, not architectural.

### 12.4 R4 — `trezord-go` default-port assumption

The design relies on `@trezor/connect-web`'s `BridgeTransport` defaulting to port `21328` and the proxy occupying that port. If a future connect-web version changes the default port, the proxy port must track it.

**Mitigation:** The default port is a named constant in `@trezor/transport` (`DEFAULT_PORT = 21328`); pin the `@trezor/connect-web` version that `keyring-eth-trezor` resolves, and assert the proxy port in a unit test that reads the constant. If the constant moves, the unit test fails loudly before E2E silently breaks.

**Status:** Acknowledged; version-pinning mitigates.

### 12.5 R5 — LavaMoat policy drift in `metamask-extension`

Expected to be a no-op or near-no-op (no new runtime deps — §11). Standard `yarn lavamoat:auto` if anything surfaces.

**Status:** Acknowledged; no architectural risk.

## 13. Migration plan (ordered)

| Phase | Scope | Exit criterion |
| --- | --- | --- |
| **0. Spike (R1) — ✅ COMPLETE** | 4 spikes investigating the transport boundary: (1) proxy + default config (PNA — dead), (2) transport-injection (PNA + Origin — dead), (3) headless in offscreen (Origin whitelist — blocked), (4) Suite way — local iframe + `__TREZOR_CONNECT_SRC` + `@trezor/transport-bridge`. | ✅ Transport architecture LOCKED. 4 spike commits (`fceda3f1`, `685544fc`, `959266d6`, `b781c0ba`) on `feat/hw-emulators-master`. Decision recorded in [ADR-0003](../adr/0003-trezor-transport-boundary.md). |
| **1. Core emulator** | Implement `controller-client.ts`, `sidecar-manager.ts` (transport-bridge + iframe-asset server), `html-injector.ts` (`__TREZOR_CONNECT_SRC` injection), `docker-manager.ts`, `device-interaction.ts`, `model-profiles.ts`, `constants.ts`. Full unit test coverage (§8.1). | All unit tests green; transport-bridge starts + iframe served + `window.__TREZOR_CONNECT_SRC` injected successfully. |
| **2. Cleanup in `metamask-extension`** | Delete `FakeTrezorBridge`; remove the `trezorBridge` override in `keyrings.ts` (§9.3). | `keyrings.ts` has zero Trezor `IN_TEST` branches; build:test succeeds. |
| **3. Factory wiring** | Implement `trezor-emulator.ts`, wire `factory.ts`, export from `index.ts`. | `createEmulator(EmulatorType.Trezor, {})` returns a working `TrezorEmulator`. |
| **4. Integration test** | `keyring-eth-trezor` integration test (§8.2), gated `TREZOR_INTEGRATION=1`. | `addAccounts` + a sign round-trip against real firmware PASS. |
| **5. E2E wiring** | `test/e2e/trezor/` (docker-compose, shared-context, with-trezor-fixtures, build-config, cleanup, test-helper). | `startSharedTrezor()` brings up a usable emulator + transport-bridge sidecar + iframe-asset server + HTML injection. |
| **6. E2E specs** | `trezor-account.spec.ts` first (smoke), then the remaining 7 (§8.3). | Account smoke green on T2T1; remaining specs green on T2T1; secondary-model matrix run + documented. |
| **7. Documentation** | `src/trezor/README.md`, this spec finalised, CHANGELOG entries, supersede `test/e2e/speculos/TREZOR_REPLICATION_GUIDE.md` (correcting its `BridgeTransport({url})` / port-21325 errors — see ADR-0003). | Docs current; old guide marked superseded. |

## 14. References

- [ADR-0003: Trezor transport boundary](../adr/0003-trezor-transport-boundary.md)
- [QR Emulator Spec](./qr-emulator.md) — the architectural template (same package, same factory pattern)
- [ADR-0001: emulator placement](../adr/0001-qr-emulator-placement.md) — submodule decision (reused)
- [ADR-0002: no-scripts transport](../adr/0002-no-scripts-transport.md) — QR's transport principle (Trezor's `window.__TREZOR_CONNECT_SRC` HTML injection is the Trezor-appropriate analog: different mechanism, same "wiring-time injection, not production source" property)
- Ledger precedent: `packages/hw-emulator/src/ledger/` (especially `apdu-bridge.ts`, `client.ts`, `docker-manager.ts`)
- `trezor/trezor-user-env` — https://github.com/trezor/trezor-user-env
- Trezor firmware emulator docs — https://docs.trezor.io/trezor-firmware/core/emulator/index.html
- `@trezor/connect-web` / `@trezor/transport` — now developed in `trezor/trezor-suite` (the `trezor/connect` repo was merged in Nov 2023)
- Existing (now-superseded) analysis: `metamask-extension/test/e2e/speculos/TREZOR_REPLICATION_GUIDE.md`
