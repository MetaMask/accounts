# QR Hardware Wallet Emulator

A fake QR hardware device for unit, integration, and E2E testing. It holds a
deterministic seed, derives accounts, produces BC-UR-encoded QR codes (single
frame and animated fountain-coded) the way a Keystone-class device would, and
signs transactions and messages with real ECDSA.

The emulator is transport-agnostic: it produces QR payloads (PNG, Y4M) and
decodes QR screenshots, but it does not own the camera or any browser API. For
E2E, Chrome's `--use-file-for-fake-video-capture` flag feeds the emulator's Y4M
files to the production `getUserMedia` path — no script injection.

See the [design spec](../../../../../docs/specs/qr-emulator.md) and
[ADR-0002 (no-scripts transport)](../../../../../docs/adr/0002-no-scripts-transport.md)
for the full architecture.

## Public API

The emulator is created via the shared factory and implements both
`HardwareWalletEmulator` (interface symmetry with the Ledger Speculos emulator)
and `QrKeyringBridge` (so it can be wired directly into a real `QrKeyring` in
Jest tests).

```ts
export interface QrEmulator extends HardwareWalletEmulator, QrKeyringBridge {
  start(): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
  requestScan(req: QrScanRequest): Promise<SerializedUR>;
  getAccountUR(): SerializedUR;
  handleSignRequest(ur: SerializedUR): Promise<SerializedUR>;
  renderToY4m(ur: SerializedUR, opts): Promise<string>;
  renderToPng(ur: SerializedUR): Promise<Buffer>;
  decodeQrScreenshots(pathsOrBuffers): Promise<SerializedUR>;
  decodeQrImage(png: Buffer): Promise<string | null>;
  asBridge(): QrKeyringBridge;
}
```

### Constants

- `QR_EMULATOR_SEED` — canonical BIP-39 12-word test vector (hardhat account #0).
- `QR_EMULATOR_ADDRESS` — `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` (the first
  derived address, assertable in tests).
- `QR_EMULATOR_DEFAULT_XFP` — `0xdeadbeef`.
- `QR_FRAGMENT_SIZE` (`200`), `QR_REFRESH_MS` (`200`), `QR_CODE_SIZE_PX` (`225`),
  `QR_UPPERCASE` (`true`) — mirror MetaMask's `player.js` exactly.

## Usage

### 1. Factory creation

```ts
import {
  createEmulator,
  EmulatorType,
  QR_EMULATOR_ADDRESS,
} from '@metamask/hw-emulator';

const emulator = createEmulator(EmulatorType.Qr, {
  // All options optional; sensible defaults.
  deviceName: 'Keystone Test',
  pairMode: 'crypto-account', // or 'crypto-hdkey'
  descriptorCount: 5,
});

const accountUR = emulator.getAccountUR();
// { type: 'crypto-account', cbor: '...' }
```

### 2. `asBridge()` wired to a real `QrKeyring` (Jest integration test)

The emulator satisfies the `QrKeyringBridge` contract, so the production
`QrKeyring` runs unmodified against it — pairing and signing flow back through
the emulator via `requestScan`.

```ts
import { QrKeyring } from '@metamask/eth-qr-keyring';
import {
  createEmulator,
  EmulatorType,
  QR_EMULATOR_ADDRESS,
} from '@metamask/hw-emulator';

const emulator = createEmulator(EmulatorType.Qr, {});
const keyring = new QrKeyring({ bridge: emulator.asBridge() });

// Triggers bridge pairing (requestScan PAIR), then derives the first account.
await keyring.getFirstPage();
const [address] = await keyring.addAccounts(1);
expect(address).toBe(QR_EMULATOR_ADDRESS);

// Signing calls back into the emulator via requestScan SIGN — real ECDSA.
const signature = await keyring.signPersonalMessage(address, '0x...');
```

### 3. `renderToY4m()` for Playwright E2E (Chrome fake-camera transport)

Render an animated QR to a Y4M file and feed it to Chrome's fake camera. The
production scanner, zxing decoder, and `@ngraveio/bc-ur` fountain decoder all
run unmodified.

```ts
import { createEmulator, EmulatorType } from '@metamask/hw-emulator';

const emulator = createEmulator(EmulatorType.Qr, {});
const accountUR = emulator.getAccountUR();

// Requires ffmpeg on PATH (`brew install ffmpeg` on macOS).
const feedPath = await emulator.renderToY4m(accountUR, {
  fps: 5,
  durationS: 4,
  outputPath: '/tmp/qr-pair-feed.y4m',
});

// Launch Chromium with:
//   --use-fake-device-for-media-stream
//   --use-file-for-fake-video-capture=/tmp/qr-pair-feed.y4m
```

To decode the sign-request QR codes MetaMask renders (the bidirectional case),
capture frames via Playwright's `locator.screenshot()` and reconstruct the UR:

```ts
const ur = await emulator.decodeQrScreenshots([
  'frame-0.png',
  'frame-1.png',
  // ...
]);
```

## Dependencies

| Package                          | Purpose                                                                           |
| -------------------------------- | --------------------------------------------------------------------------------- |
| `@ngraveio/bc-ur`                | BC-UR fountain codec (encoder + decoder).                                         |
| `@keystonehq/bc-ur-registry-eth` | Typed UR construction (CryptoAccount, CryptoHDKey, EthSignRequest, ETHSignature). |
| `qrcode-generator`               | Render fragment string → QR matrix.                                               |
| `@zxing/library`                 | Decode QR PNG → fragment string (Node-side).                                      |

### External runtime requirements

- **`ffmpeg`** — required only by `renderToY4m()`. The pure-TypeScript paths
  (UR synthesis, signing, PNG rendering, screenshot decoding) have **no**
  external binary requirement. Install with `brew install ffmpeg` (macOS),
  `sudo apt install ffmpeg` (Debian/Ubuntu), or `sudo dnf install ffmpeg`
  (Fedora). `renderToY4m()` probes for ffmpeg once and throws a descriptive
  `FfmpegUnavailableError` (with install instructions) if it is missing.

## Layout

```
src/qr/
├── index.ts                 ← Public exports
├── constants.ts             ← Seed, derivation paths, codec/render constants
├── emulator.ts              ← QrEmulator (factory lifecycle + bridge)
├── core/
│   ├── ur-synth.ts          ← seed → CryptoAccount / CryptoHDKey URs
│   ├── signer.ts            ← real ECDSA: tx, EIP-712, personal_sign
│   └── registry.ts          ← @keystonehq/bc-ur-registry-eth wrappers
├── codec/
│   ├── encoder.ts           ← UR → animated fragments
│   └── decoder.ts           ← fragments → UR (fountain, order-independent)
├── render/
│   ├── png.ts               ← fragment string → QR PNG
│   └── y4m.ts               ← PNG sequence → Y4M file (ffmpeg)
└── decode/
    └── screenshots.ts       ← PNG screenshots → fragment string / UR
```
