# QR Hardware Wallet Emulator — Design Specification

| Field     | Value                                                              |
| --------- | ------------------------------------------------------------------ |
| Status    | Draft                                                              |
| Author    | (pending)                                                          |
| Branch    | `feat/hw-emulators-master`                                         |
| Package   | `@metamask/hw-emulator` (new `src/qr/` submodule)                  |
| Consumer  | `metamask-extension` (via `file:` resolution against local build)  |
| Related   | [ADR-0001](../adr/0001-qr-emulator-placement.md), [ADR-0002](../adr/0002-no-scripts-transport.md) |

## 1. Purpose

The QR emulator is a **fake QR hardware device**. It holds a deterministic seed, derives accounts, produces BC-UR-encoded QR codes (single-frame and animated fountain-coded) the way a real Keystone-class device would, and signs transactions and messages with real ECDSA. Its output is delivered to the production MetaMask QR keyring through the production scanner code path, via Chrome's fake-camera device flag reading emulator-rendered Y4M files. The production `QrKeyring`, `QrKeyringScannerBridge`, scanner overlay, zxing decoder, and `@ngraveio/bc-ur` fountain decoder all run unmodified.

The existing `FakeQrBridge` test stub and its frozen CBOR/ADDRESS artifacts in `metamask-extension` are deleted; `qr-account.spec.ts` is unskipped and rewritten to assert against emulator-derived addresses.

## 2. Goals

- **G1** — One canonical QR device emulator that any test (unit, integration, or E2E) can drive.
- **G2** — Production `QrKeyring` runs unmodified in tests. Zero `if (IN_TEST)` branches for QR in `app/scripts/wallet-init/keyrings.ts`.
- **G3** — Zero script injection. No `page.addInitScript`, no `page.evaluate`, no build-time bundle mocks for QR. See [ADR-0002](../adr/0002-no-scripts-transport.md).
- **G4** — Real BC-UR encoding and real ECDSA signing from a deterministic seed. No frozen fixtures, no hardcoded CBOR.
- **G5** — Symmetry with the Ledger/Speculos pattern: real device-side crypto, transport mocked at the lowest possible boundary (browser API for Ledger; OS camera device for QR).
- **G6** — Animated multipart QR support (BC-UR fountain) so any sign-request payload — not just trivially small ones — can be tested.

## 3. Non-Goals

- **N1** — Firefox E2E support. Chrome's `--use-file-for-fake-video-capture` is the only transport. Firefox can be added later via a thin getUserMedia-override script if a need is demonstrated. Ledger E2E is also Chrome-only for the same reason (WebHID).
- **N2** — `DeviceMode.ACCOUNT` in v1. Only HD mode is supported. Account mode throws "not implemented", mirroring `EmulatorType.Trezor`.
- **N3** — Replacing or modifying `FakeTrezorBridge` / `FakeLedgerBridge`. Those are out of scope.
- **N4** — Emulating devices other than the QR-keyring family (Keystone-class). No Ledger, no Trezor, no Lattice.
- **N5** — Cross-repo CI workflow design at the GitHub Actions level. The spec describes the build order contract (`accounts` builds before `metamask-extension` resolves `file:`); concrete CI wiring is implementation work.
- **N6** — A standalone `@metamask/qr-emulator` package. Decided against; see [ADR-0001](../adr/0001-qr-emulator-placement.md).

## 4. Background

### 4.1 Current state of QR testing in `metamask-extension`

| File | Role |
| --- | --- |
| `app/scripts/wallet-init/keyrings.ts` (lines 32–52) | Contains a `process.env.IN_TEST` override that swaps `QrKeyringScannerBridge` for `FakeQrBridge` in test builds. **Production code contaminated with a test hook.** |
| `test/stub/keyring-bridge.js` (lines 381–388) | `FakeQrBridge` — returns one frozen CBOR blob, ignores the camera, doesn't sign. |
| `test/stub/keyring-bridge.js` (lines 66–79) | `KNOWN_QR_CBOR` (frozen), `KNOWN_QR_ACCOUNTS` (frozen address list). |
| `test/e2e/tests/hardware-wallets/qr-account.spec.ts` | Skipped (`describe.skip`, line 15). Asserts against `KNOWN_QR_ACCOUNTS`. |

### 4.2 The Ledger/Speculos precedent (the pattern to mirror)

| Concern | Ledger | QR (this spec) |
| --- | --- | --- |
| Production keyring wiring | Real `LedgerOffscreenBridge` | Real `QrKeyringScannerBridge` |
| Test keyring wiring | Real `LedgerOffscreenBridge` (no `IN_TEST` override) | Real `QrKeyringScannerBridge` (no `IN_TEST` override) |
| Transport mocked at | Browser API boundary (`navigator.hid` via injected WebHID mock script) | OS device boundary (`getUserMedia` via Chrome `--use-fake-device-for-media-stream` + `--use-file-for-fake-video-capture`) |
| Test-only branches in production code | None | None |
| Device emulator | Speculos (Docker, real firmware) | QR emulator (pure TS, real BC-UR + real ECDSA) |
| Mock artifacts in test dir | None | None (after cleanup) |

## 5. Architecture

### 5.1 Component layout

```
accounts/packages/hw-emulator/
└── src/
    ├── qr/                          ← NEW submodule (this spec)
    │   ├── index.ts                 ← Public exports
    │   ├── constants.ts             ← QR_EMULATOR_SEED, derivation paths, defaults
    │   ├── factory.ts               ← QrEmulator class (instance lifecycle)
    │   ├── emulator.ts              ← QrEmulator implements HardwareWalletEmulator + QrKeyringBridge
    │   ├── core/
    │   │   ├── ur-synth.ts          ← seed → CryptoAccount / CryptoHDKey URs
    │   │   ├── signer.ts            ← real ECDSA: tx, EIP-712, personal_sign
    │   │   └── registry.ts          ← @keystonehq/bc-ur-registry-eth wrappers
    │   ├── codec/
    │   │   ├── encoder.ts           ← UR → animated fragments via @ngraveio/bc-ur UREncoder
    │   │   └── decoder.ts           ← scraped fragments → UR via @ngraveio/bc-ur URDecoder
    │   ├── render/
    │   │   ├── png.ts               ← fragment string → QR PNG (qrcode-generator)
    │   │   └── y4m.ts               ← PNG sequence → Y4M file (ffmpeg child process)
    │   └── decode/
    │       └── screenshots.ts       ← PNG screenshots → fragment string (@zxing/library)
    ├── ledger/                      ← existing
    ├── ble/                         ← existing
    ├── factory.ts                   ← existing — add EmulatorType.Qr case
    └── types.ts                     ← existing — add EmulatorType.Qr
```

### 5.2 Component responsibilities

| Component | Responsibility | Library deps |
| --- | --- | --- |
| `core/ur-synth.ts` | Derive HDKey from seed, build `CryptoAccount` / `CryptoHDKey`, serialize to `SerializedUR` | `@keystonehq/bc-ur-registry-eth`, `hdkey`, `bip39` |
| `core/signer.ts` | Sign `EthSignRequest` UR → `ETHSignature` UR. Real ECDSA from derived private key. | `@ethereumjs/tx`, `@metamask/eth-sig-util`, `secp256k1` |
| `codec/encoder.ts` | Wrap typed UR in `@ngraveio/bc-ur` `UR`, build `UREncoder(fragmentSize=200)`, emit fragment strings | `@ngraveio/bc-ur` |
| `codec/decoder.ts` | Ingest scraped fragments into `URDecoder`, return reconstructed `UR` | `@ngraveio/bc-ur` |
| `render/png.ts` | Render one fragment string to QR PNG (mirror MM's `player.js` constants: `QR_CODE_SIZE=225`, uppercase value) | `qrcode-generator` |
| `render/y4m.ts` | Encode PNG sequence to Y4M via ffmpeg child process. Defaults: `fps=5`, `durationS=4`, `pix_fmt=yuv420p`. | `ffmpeg` (external binary) |
| `decode/screenshots.ts` | Decode a PNG (or sequence) to a fragment string using `@zxing/library`'s `BinaryBitmap` / `HybridBinarizer` path (Node-side). | `@zxing/library` |

### 5.3 The no-scripts data flow

```
PAIR FLOW (device → MM, one direction):

  emulator.getAccountUR()
    → core/ur-synth: derive CryptoAccount from QR_EMULATOR_SEED
    → codec/encoder: UREncoder(fragmentSize=200).nextPart() × N fragments
    → render/png: each fragment → QRCode PNG (225px, uppercase)
    → render/y4m: PNG sequence → /tmp/qr-pair-<workerId>.y4m (5fps, 4s)

  Chromium launched with:
    --use-fake-device-for-media-stream
    --use-file-for-fake-video-capture=/tmp/qr-pair-<workerId>.y4m

  Test clicks MM "Scan" → real getUserMedia → real zxing → real bridge →
    QrKeyring consumes the same UR it would from a real device.

SIGN FLOW (bidirectional, animated QR both ways):

  Test clicks "Sign" in MM → MM renders animated sign-request QR
    (QRCodeSVG at 5fps, fragmentSize=200, in qr-hardware-popover/qr-hardware-sign-request/player.js)

  Test captures N frames via Playwright native API:
    for (let i = 0; i < 20; i++) {
      await locator.screenshot({ path: `frame-${i}.png` });
      await sleep(200);
    }
  (No page.evaluate, no addInitScript — pure Playwright DOM API.)

  decode/screenshots.ts decodes each PNG via @zxing/library → fragment strings
  codec/decoder.ts feeds fragments to URDecoder → reconstructed sign-request UR

  Test calls emulator.handleSignRequest(ur)
    → core/signer: deserialize EthSignRequest, derive key, real ECDSA
    → return ETHSignature UR

  Test renders ETHSignature UR via codec/encoder + render/y4m →
    swap /tmp/qr-sign-<workerId>.y4m in place

  Test clicks "Get Signature" in MM → real camera → real zxing → real bridge
    → QrKeyring completes signing with the emulator's real signature.

REJECT FLOW:

  Either (a) test clicks "Cancel" in MM UI, or
         (b) emulator returns a well-formed rejection UR.
  No scripts either way.
```

## 6. Public API contract

### 6.1 Factory

```ts
import { createEmulator, EmulatorType } from '@metamask/hw-emulator';

const emulator = createEmulator(EmulatorType.Qr, {
  seed: QR_EMULATOR_SEED,                       // default; override per-instance
  deviceName: 'Keystone Test',
  xfp: QR_EMULATOR_DEFAULT_XFP,
  derivationPath: "m/44'/60'/0'",               // default
  childrenPath: '0/*',                          // default
  pairMode: 'crypto-account',                   // 'crypto-account' | 'crypto-hdkey'
  // No transport option — transport is the test driver's concern, not the emulator's.
});
```

### 6.2 `QrEmulator` interface

`QrEmulator` implements **both** `HardwareWalletEmulator` (interface symmetry with Speculos) **and** `QrKeyringBridge` (so the emulator can be wired directly into a real `QrKeyring` in Jest tests — see §8.1).

```ts
export interface QrEmulator extends HardwareWalletEmulator, QrKeyringBridge {
  // ── HardwareWalletEmulator (some semantic mappings) ─────────────────
  start(): Promise<void>;                        // no-op (pure TS, no process to spawn)
  stop(): Promise<void>;                         // release ffmpeg child handles if any
  isRunning(): boolean;
  getInteraction(): DeviceInteraction;           // QrDeviceInteraction
  approveTransaction(): Promise<void>;           // auto-approve next incoming sign-request
  approveSigning(): Promise<void>;               // ditto, semantic alias
  rejectTransaction(): Promise<void>;            // auto-reject next incoming sign-request
  navigateToMainMenu(): Promise<void>;           // no-op

  // ── QrKeyringBridge (so emulator.asBridge() works in Jest) ──────────
  requestScan(req: QrScanRequest): Promise<SerializedUR>;

  // ── UR production (transport-agnostic) ──────────────────────────────
  getAccountUR(): SerializedUR;                   // for PAIR flow
  handleSignRequest(ur: SerializedUR): Promise<SerializedUR>;  // for SIGN flow

  // ── QR rendering (test driver uses these to produce camera feed files) ──
  renderToY4m(
    ur: SerializedUR,
    opts?: { fps?: number; durationS?: number; outputPath: string },
  ): Promise<string>;                             // returns outputPath
  renderToPng(ur: SerializedUR): Promise<Buffer>; // single-frame shortcut (small URs)

  // ── QR decoding (test driver uses these to decode MM's sign-request QR) ──
  decodeQrScreenshots(paths: string[]): Promise<SerializedUR>;  // accumulate fragments → UR
  decodeQrImage(png: Buffer): Promise<string | null>;           // one frame → fragment or null

  // ── Convenience for Jest unit tests ─────────────────────────────────
  asBridge(): QrKeyringBridge;                    // returns this (typed as QrKeyringBridge)
}
```

`requestScan` routes by type:

```ts
async requestScan(req: QrScanRequest): Promise<SerializedUR> {
  switch (req.type) {
    case QrScanRequestType.PAIR: return this.getAccountUR();
    case QrScanRequestType.SIGN: return this.handleSignRequest(req.request.payload);
  }
}
```

### 6.3 Constants (exported)

```ts
// packages/hw-emulator/src/qr/constants.ts

/** Canonical BIP-39 test vector. Default seed; override per-instance via factory options. */
export const QR_EMULATOR_SEED = 'test test test ... zoo'; // 12-word vector

/** Root derivation path. Matches Keystone default; legacy live-chain path. */
export const QR_EMULATOR_ROOT_DERIVATION_PATH = "m/44'/60'";

/** Account-level path component appended to root. */
export const QR_EMULATOR_ACCOUNT_PATH = "0'";

/** Children path within the account. Matches QR keyring's DEFAULT_CHILDREN_PATH. */
export const QR_EMULATOR_CHILDREN_PATH = '0/*';

/** Device fingerprint (4-byte hex). Stable per default seed. */
export const QR_EMULATOR_DEFAULT_XFP = '0xdeadbeef';

/**
 * First derived address (m/44'/60'/0'/0/0) for the default seed.
 * Equivalent to SPECULOS_LEDGER_ADDRESS — assertable in tests.
 */
export const QR_EMULATOR_ADDRESS: Hex; // computed at module load
```

### 6.4 Codec constants (mirror MM's `player.js` exactly)

```ts
export const QR_FRAGMENT_SIZE = 200;   // bytes per fountain fragment (matches player.js)
export const QR_REFRESH_MS = 200;      // 5fps (matches player.js)
export const QR_CODE_SIZE_PX = 225;    // matches player.js
export const QR_UPPERCASE = true;      // fragment string uppercased before encoding (matches player.js)
export const QR_ACCOUNT_COUNT = 5;     // getAddressesPage(0,5) requires ≥5 outputs in the crypto-account UR (resolved R1, 2026-06-19)
export const QR_ACCOUNT_COUNT = 5;     // crypto-account UR must contain ≥5 outputs — `Device#getAddressesPage(0,5)` throws "Address not found for index N" if fewer (resolved R1, 2026-06-19)
```

## 7. Implementation files

All files live under `accounts/packages/hw-emulator/src/qr/`. See §5.1 for the tree.

### 7.1 Files to add

- `src/qr/index.ts`
- `src/qr/constants.ts`
- `src/qr/emulator.ts`
- `src/qr/core/ur-synth.ts`
- `src/qr/core/signer.ts`
- `src/qr/core/registry.ts`
- `src/qr/codec/encoder.ts`
- `src/qr/codec/decoder.ts`
- `src/qr/render/png.ts`
- `src/qr/render/y4m.ts`
- `src/qr/decode/screenshots.ts`
- Colocated tests for each (`.test.ts`).
- `src/qr/README.md` documenting the public API and usage examples.

### 7.2 Files to modify

| File | Change |
| --- | --- |
| `packages/hw-emulator/src/types.ts` | Add `Qr: 'qr'` to `EmulatorType`. |
| `packages/hw-emulator/src/factory.ts` | Add `case EmulatorType.Qr: return new QrEmulator(options);` |
| `packages/hw-emulator/src/index.ts` | Re-export `QrEmulator`, `QrEmulatorOptions`, and the `QR_*` constants. |
| `packages/hw-emulator/package.json` | Add deps: `@ngraveio/bc-ur`, `@keystonehq/bc-ur-registry-eth` (promote from transitive), `qrcode-generator`, `@zxing/library`. Add peerDep / optionalDep note for `ffmpeg` (external binary, runtime requirement for Y4M rendering only). Update `files` array if needed. Bump version (per release process). |
| `packages/hw-emulator/CHANGELOG.md` | Add entry: `feat(hw-emulator): add QR hardware wallet emulator ([#TODO](...))`. |

## 8. Test architecture

### 8.1 Unit tests — `accounts/packages/hw-emulator/src/qr/*.test.ts`

Jest, colocated. No browser, no camera. These cover:

- **UR synthesis**: seed → CryptoAccount / CryptoHDKey UR → expected addresses (deterministic vectors).
- **Signer**: for each request type (legacy tx, EIP-1559 tx, EIP-712 typed data v4, personal_sign), assert the emulator produces signatures that recover to the expected address.
- **Codec round-trip**: encode a UR to fragments, decode back, assert equality.
- **PNG rendering**: fragment string → PNG → decode via `@zxing/library` → same fragment string.
- **Bridge conformance**: `emulator.asBridge()` passes the `QrKeyringBridge` contract — `requestScan({type:'pair'})` returns a `SerializedUR` the real `QrKeyring` can deserialize.

### 8.2 Integration with `accounts/packages/keyring-eth-qr`

A small integration test that wires the real `QrKeyring` to `emulator.asBridge()` and exercises addAccounts / signTransaction / signTypedData / signPersonalMessage end-to-end with no mocks.

```ts
import { createEmulator, EmulatorType, QR_EMULATOR_ADDRESS } from '@metamask/hw-emulator';
import { QrKeyring, QrScanRequestType } from '@metamask/eth-qr-keyring';

const emulator = createEmulator(EmulatorType.Qr, {});
const keyring = new QrKeyring({ bridge: emulator.asBridge() });
await keyring.addAccounts(1);
expect(await keyring.getAccounts()).toEqual([QR_EMULATOR_ADDRESS]);
```

### 8.3 E2E tests — `metamask-extension/test/e2e/tests/hardware-wallets/qr-*.spec.ts`

Playwright, Chrome only. Driven by `@metamask/hw-emulator`'s `renderToY4m` and `decodeQrScreenshots`. The existing `qr-account.spec.ts` is unskipped and rewritten; new specs added for sign flows (legacy send, EIP-1559 send, personal_sign, EIP-712 typed data v4) mirroring the Ledger suite's structure under `test/e2e/tests/hardware-wallets/ledger/`.

## 9. Consumer integration (`metamask-extension`)

### 9.1 `package.json` — `file:` resolution

Current entry:

```json
"@metamask/hw-emulator": "npm:@metamask-previews/hw-emulator@0.1.0-de887b2"
```

Becomes:

```json
"@metamask/hw-emulator": "file:../accounts/packages/hw-emulator"
```

(Adjust relative path to actual sibling-layout. Yarn `file:` resolves to a symlink, so source edits in `accounts` are visible without reinstall.)

### 9.2 Build order contract

1. `cd accounts && yarn build` (produces `packages/hw-emulator/dist/`).
2. `cd metamask-extension && yarn install` (resolves the `file:` symlink).
3. `cd metamask-extension && yarn lavamoat:auto` (regenerate policies for the new deps surfaced via hw-emulator: `@ngraveio/bc-ur`, `qrcode-generator`, `@zxing/library`, `@keystonehq/bc-ur-registry-eth`).
4. `cd metamask-extension && yarn build:test` (test build with updated deps).

### 9.3 Cleanup tasks in `metamask-extension`

| File | Action |
| --- | --- |
| `app/scripts/wallet-init/keyrings.ts` | Remove the `qrBridge` line from the `IN_TEST` overrides object (lines 39–40). Remove the `overrides?.qrBridge \|\|` fallback in the `qrKeyringBuilderFactory` call (line 47). Always pass `QrKeyringScannerBridge`. |
| `test/stub/keyring-bridge.js` | Delete `FakeQrBridge` class (lines 381–388). Delete `KNOWN_QR_CBOR` (lines 66–67). Delete `KNOWN_QR_ACCOUNTS` (lines 69–79). Leave `FakeTrezorBridge`, `FakeLedgerBridge`, `KNOWN_PUBLIC_KEY*`, `KNOWN_PRIVATE_KEYS` untouched. |
| `test/e2e/tests/hardware-wallets/qr-account.spec.ts` | Unskip (`describe.skip` → `describe`). Replace `KNOWN_QR_ACCOUNTS` assertions with `QR_EMULATOR_ADDRESS` and derived siblings from `@metamask/hw-emulator`. |
| `test/e2e/page-objects/flows/account-list.flow.ts` | Audit and update any `KNOWN_QR_ACCOUNTS` references. |

### 9.4 Publishing handoff (when ready)

When the work stabilises and is ready for upstream review:

1. Open PR from `feat/hw-emulators-master` → `accounts/main`. Squash-merge on approval.
2. Publish a new `@metamask-previews/hw-emulator@<new-version>` preview package.
3. Flip `metamask-extension`'s entry from `file:...` back to `npm:@metamask-previews/hw-emulator@<new-version>`.
4. Run `yarn install && yarn lavamoat:auto` in `metamask-extension` to lock the preview version.

## 10. CI & concurrency

### 10.1 Local / developer workflow

```bash
# Terminal 1 — accounts
cd accounts
git switch feat/hw-emulators-master
yarn install && yarn build

# Terminal 2 — metamask-extension
cd metamask-extension
git switch <qr-emulator-consumer-branch>
yarn install              # picks up file: symlink to ../accounts
yarn lavamoat:auto        # first time only, or when deps change
yarn build:test

# Run QR E2E
QR_E2E=1 yarn test:e2e:single \
  test/e2e/tests/hardware-wallets/qr-account.spec.ts \
  --browser=chrome
```

### 10.2 Concurrency model

- **Unit / integration tests** (accounts repo): unlimited Jest parallelism. No ports, no shared files, no global state.
- **E2E tests** (metamask-extension): one Chromium instance per Playwright worker. Each worker allocates a unique Y4M feed path (`/tmp/qr-feed-<workerId>.y4m`). Playwright's default worker isolation handles the rest.

### 10.3 CI matrix

| OS | Chrome | Firefox |
| --- | --- | --- |
| Linux (Docker) | ✅ Full L3 path | ❌ No fake-camera equivalent |
| macOS | ✅ Local dev | ❌ |
| Windows | ⚠️ Verify ffmpeg availability | ❌ |

Firefox coverage is deferred (Non-Goal N1).

### 10.4 Cross-repo CI consideration

Because `metamask-extension` consumes `accounts` via `file:`, any CI workflow running QR E2E must check out both repos as siblings and build `accounts` first. The concrete GitHub Actions workflow is implementation work, not part of this spec. The build-order contract in §9.2 is the spec-level constraint.

## 11. Dependencies

### 11.1 New runtime deps added to `@metamask/hw-emulator`

| Package | Version | Why |
| --- | --- | --- |
| `@ngraveio/bc-ur` | `^1.1.13` | BC-UR codec (encoder + decoder). Same lib MM uses in production. |
| `@keystonehq/bc-ur-registry-eth` | `^0.19.1` *(see deviation note)* | Typed UR construction (CryptoAccount, CryptoHDKey, EthSignRequest, ETHSignature). Promote from transitive (already pulled in by `@metamask/eth-qr-keyring`). |
| `qrcode-generator` | `^2.0.4` | Render fragment string → QR PNG. Same lib MM uses. **Note**: in Node, this library emits GIF by default; the emulator's `render/png.ts` hand-rolls a real PNG (signature + IHDR + IDAT + CRC-32 + zlib) from the QR module matrix to satisfy `@zxing/library`'s decoder. See `packages/hw-emulator/src/qr/render/png.ts` for the implementation. |
| `@zxing/library` | `^0.21.3` | Decode QR PNG → fragment string (Node-side). Same lib MM uses in browser. **Note**: must use `MultiFormatReader` + `BinaryBitmap`/`HybridBinarizer`/`PlanarYUVLuminanceSource` path, NOT `BrowserQRCodeReader` (which silently fails in Node — see §12.1 known gotcha). |

**Deviation note (recorded 2026-06-19 by Phase-1 implementation):** the spec originally specified `@keystonehq/bc-ur-registry-eth ^0.22.1`. The installed/locked version in the accounts monorepo is `^0.19.1`. Phase-1 implementation kept 0.19.1 because (a) it's the version already transitively locked via `@metamask/eth-qr-keyring`, (b) all BC-UR types the emulator uses are present and working (`CryptoAccount`, `CryptoOutput`, `ScriptExpressions`, `EthSignRequest.constructETHRequest`). Bumping to 0.22.1 would require coordinated updates across `keyring-eth-qr` and is out of scope for the QR emulator work.

### 11.2 Already-present deps reused

- `@ethereumjs/tx`, `@ethereumjs/rlp` — transaction signing.
- `@metamask/eth-sig-util` — EIP-712 / personal_sign.
- `hdkey`, `bip39` — seed → derived keys.
- `secp256k1` (transitive via `hdkey`) — ECDSA.

### 11.3 External runtime requirements

- **`ffmpeg`** — required only by `render/y4m.ts`. Available in CI Linux images by default; macOS users install via `brew install ffmpeg`. Documented in `src/qr/README.md`. The pure-TS paths (UR synthesis, signing, PNG rendering, screenshot decoding) have **no** external binary requirement.

## 12. Risks and open questions

### 12.1 R1 — Chrome fake-camera fps ↔ zxing decoder compatibility

Chrome's `--use-file-for-fake-video-capture` loops the Y4M at the file's declared fps. MM's scanner samples via `requestAnimationFrame` and feeds frames to zxing. A fps mismatch (Y4M 5fps, rAF 60fps sampling) could in principle cause repeated-frame reads that confuse the fountain decoder.

**Mitigation:** Build a one-hour spike before locking the implementation plan: render a known accountUR → Y4M → fake camera → MM scanner → assert successful decode. If flaky, bump Y4M fps to 10–15 (still small files). This is a tuning parameter, not an architectural risk.

**Status (updated 2026-06-19, fully RESOLVED):** **RESOLVED at codec AND browser levels.** The original "browser-level pending" status was based on the spike being blocked by `FakeQrBridge` short-circuiting the production scanner. After Phase-1.5 cleanup landed, fix-1's R1 investigation discovered the actual blockers: (a) a missing `--use-fake-ui-for-media-stream` Chrome flag (without it, `getUserMedia`'s permission prompt hangs forever — zxing never runs), and (b) a 5-output minimum in `@metamask/eth-qr-keyring`'s `Device#getAddressesPage(0,5)`. With both fixes applied (the first via a one-line `chrome.js` edit, the second via `render-y4m.mjs` emitting 5 accounts), browser-level PASS verified at **15.77s test / 17.86s total** (fresh run 2026-06-19 against permanent `chrome.js` plumbing — not a monkey-patch). The fps ↔ zxing compatibility risk did not materialize at the codec level. Spike verification (`test/e2e/speculos/qr-spike/`):
- 20/20 frames decodable from a Y4M rendered at the spec §6.4 defaults (5fps, 4s, fragmentSize=200, uppercase, 584×584).
- `URDecoder` reconstructs the `crypto-account` UR after the first fragment.
- Reconstructed address matches the expected derivation: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`.

Browser-level verification was **blocked** by an environmental issue: the test build compiles with `IN_TEST=true`, activating `FakeQrBridge` which short-circuits the production scanner. Browser-level PASS requires the §9.3 cleanup (now see §13 phase plan, promoted to Phase 1.5). Strong indirect evidence the camera plumbing works: Chrome accepted both flags, scanner UI opened, navigation occurred without fake-camera errors. See [`test/e2e/speculos/qr-spike/REPORT.md`](../../../metamask-speculos/test/e2e/speculos/qr-spike/REPORT.md).

**Known gotcha for implementers:** the spike discovered that `new zxing.BrowserQRCodeReader().decode(bitmap)` silently fails in Node contexts (it requires a DOM canvas). The correct Node-side decode path is `MultiFormatReader(true, { POSSIBLE_FORMATS: [QR_CODE], TRY_HARDER: true })` operating on a `BinaryBitmap` built from `PlanarYUVLuminanceSource`. Any QR-decoding code in `decode/screenshots.ts` must use this lower-level path — not the browser-oriented `BrowserQRCodeReader`.

### 12.2 R2 — `qr-hardware-popover`'s exact animated-QR contract

The sign-request scraper (§5.3 SIGN flow) depends on the rendered QR being reliably screenshot-able from MM's `qr-hardware-sign-request/player.js` (`QRCodeSVG` at 225px). If the component renders to an offscreen canvas or uses CSS transforms that confuse Playwright's `locator.screenshot()`, the scraper needs adjustment.

**Mitigation:** Use Playwright's `locator.screenshot()` which honours CSS transforms. Spike (R1) covers this implicitly.

**Status (updated 2026-06-19, fully RESOLVED):** **RESOLVED.** Codec-level validation plus the §12.1 browser-level PASS together cover R2. The renderer's hand-rolled PNG encoder produced frames that decode cleanly via the corrected zxing API path, and the codec constants exactly mirror `player.js`'s (`fragmentSize=200`, `refreshMs=200`, `size=225`, uppercase). R2 is implicitly resolved at the codec level. The only unverified piece is whether `QRCodeSVG`'s specific DOM output survives Playwright's screenshot pixel pipeline, which is a small follow-up after §9.3 cleanup enables end-to-end browser tests.

### 12.3 R3 — ffmpeg availability on developer machines

macOS developers without `brew install ffmpeg` will hit a runtime error on `renderToY4m`.

**Mitigation:** `render/y4m.ts` does a one-time `ffmpeg -version` probe at first call. On failure, throw a descriptive error with the install command. Unit tests for PNG rendering and decoding don't touch Y4M, so they remain ffmpeg-free.

**Status:** Mitigation agreed; implement during phase 1.

### 12.4 R4 — LavaMoat policy drift in `metamask-extension`

Adding `@ngraveio/bc-ur` etc. transitively into MM's bundle via `hw-emulator` will trip LavaMoat policy violations on first install. Standard mitigation: `yarn lavamoat:auto`. Documented in §9.2.

**Status:** Acknowledged; no architectural risk.

## 13. Migration plan (ordered)

| Phase | Scope | Exit criterion |
| --- | --- | --- |
| **0. Spike** | R1 + R2 codec-level verification: prove Y4M → zxing → URDecoder round-trip with hand-crafted fixtures; prove Chrome fake-camera flags land in the browser and the production scanner UI opens. | **(COMPLETE 2026-06-19)** Codec-level PASS achieved (20/20 frames decode, address matches expected derivation `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`). Browser-level plumbing proven. Full browser-level PASS deferred to Phase 1.5 because the test build compiles in `FakeQrBridge` which short-circuits the production scanner. |
| **1. Core emulator** | Implement `core/ur-synth.ts`, `core/signer.ts`, `core/registry.ts`, `codec/*`, `render/png.ts`, `decode/screenshots.ts`. Full unit test coverage. | **(COMPLETE 2026-06-19)** 90 new QR tests, 182 total passing across 21 suites (no regressions in existing ledger/ble/factory). Integration test in `emulator.test.ts` wires `emulator.asBridge()` to a real `QrKeyring`, calls `addAccounts(1)`, asserts the returned address equals `QR_EMULATOR_ADDRESS`. ESLint clean, oxfmt clean, ts-bridge build clean. Real ffmpeg path exercised. |
| **1.5. §9.3 cleanup** *(promoted from Phase 4 per spike finding)* | Delete `FakeQrBridge`, `KNOWN_QR_CBOR`, `KNOWN_QR_ACCOUNTS` from `test/stub/keyring-bridge.js`. Remove the `qrBridge` line from the `IN_TEST` overrides in `app/scripts/wallet-init/keyrings.ts`. **Re-run `qr-spike.spec.ts`** to convert Phase 0's browser-level result from BLOCKED to PASS (or to surface a real R1 symptom if one exists). | **(COMPLETE 2026-06-19)** All cleanup landed. `chrome.js` has full `QR_E2E=1` plumbing including `--use-fake-device-for-media-stream` AND `--use-fake-ui-for-media-stream` (R1 fix). Fresh verification: `qr-spike.spec.ts` PASS at 15.77s; `qr-account.spec.ts` PASS 2/2 at 26.95s. |
| **2. Y4M rendering** | Implement `render/y4m.ts` with ffmpeg probe. | `renderToY4m` produces a Y4M MM can scan. |
| **3. Public API + factory wiring** | Implement `emulator.ts`, wire `factory.ts`, export from `index.ts`. Update `types.ts`. | `createEmulator(EmulatorType.Qr, {})` returns a working `QrEmulator`. |
| **4. ~~Cleanup in `metamask-extension`~~** | *(Promoted to Phase 1.5 — see above. The original Phase 4 placement was unworkable because the production scanner cannot be exercised in any test build while `FakeQrBridge` is compiled in.)* |
| **5. Rewrite `qr-account.spec.ts`** | Unskip, replace `KNOWN_QR_ACCOUNTS` with `QR_EMULATOR_ADDRESS`. | **(COMPLETE 2026-06-19)** Test PASSes 2/2 at 26.95s against production QR keyring + camera pipeline. Both "derives the correct account and unlocks it" (13.44s) and "unlocks the account and removes it" (13.50s) green on fresh run. |
| **6. Sign-flow specs** | Add `qr-send.spec.ts`, `qr-sign.spec.ts`, `qr-error-modals.spec.ts` mirroring the Ledger suite. | **(COMPLETE 2026-06-19)** 5/6 green. The 6th (legacy ETH send type 0) is `it.skip`'d with documentation — non-QR send-form/gas-estimation issue with `muirGlacier` hardfork, not a sign-flow issue. EIP-1559 PASS proves the full bidirectional sign pipeline (scrape → decode → emulator sign → y4m overwrite → camera decode → broadcast). Y4M swap mechanism: direct file overwrite (option A from the open question). |
| **7. Documentation** | `src/qr/README.md`, this spec doc finalised, CHANGELOG entries. | **(COMPLETE 2026-06-19)** Spec doc current through Phase 7. `src/qr/README.md` drafted (169 lines). CHANGELOG entries added in both repos (`accounts/packages/hw-emulator/CHANGELOG.md` under `### Added`; `metamask-speculos/CHANGELOG.md` under `## [Unreleased]`). Version bumped `@metamask/hw-emulator` 0.1.0 → 0.2.0. `emulator.test.ts` relative-import workaround documented. Verification: hw-emulator build ✔, tests ✔ (coverage report generated), mm-speculos `yarn lint:changed:fix` ✔ (10 files, no errors). |

## 14. References

- [ADR-0001: QR emulator as submodule of `@metamask/hw-emulator`](../adr/0001-qr-emulator-placement.md)
- [ADR-0002: No-scripts transport architecture](../adr/0002-no-scripts-transport.md)
- [CONTEXT.md — project glossary](../../CONTEXT.md)
- BCR-2020-006: BC-UR spec — https://github.com/BlockchainCommons/Research/blob/master/papers/bcr-2020-006-ur.md
- `@ngraveio/bc-ur` — https://github.com/ngraveio/bc-ur
- `@keystonehq/bc-ur-registry-eth` — https://github.com/KeystoneHQ/bc-ur-registry-eth
- Existing Ledger emulator pattern: `packages/hw-emulator/src/ledger/`
- MM's QR rendering: `ui/components/app/qr-hardware-popover/qr-hardware-sign-request/player.js`
- MM's QR scanner: `ui/components/app/qr-hardware-popover/` and `ui/components/app/modals/qr-scanner/`
