# MetaMask Accounts

A TypeScript monorepo for keyring implementations, account management, and hardware-wallet integration. This glossary captures the project-specific language used across packages; it is a glossary only, not a spec or implementation guide.

## Language

### UR layer

**UR** (Uniform Resource):
A self-describing envelope defined by [BCR-2020-006](https://github.com/BlockchainCommons/Research/blob/master/papers/bcr-2020-006-ur.md). Composed of a `type` string and a CBOR-encoded payload. Implemented in this repo by `@ngraveio/bc-ur`.
_Avoid_: "the encoded data", "the QR payload", "the BC-UR object".

**SerializedUR**:
The TypeScript type `{ type: string; cbor: string }` — a hex-CBOR string tagged with its UR type. The form `QrKeyringBridge.requestScan` returns and `QrKeyring` consumes. **Not** a `UR` instance from `@ngraveio/bc-ur`; those two are convertible but distinct.
_Avoid_: "UR object", "the cbor", "the typed UR".

**Fragment**:
One frame of an animated QR — a single QR-code image representing one fountain-encoded piece of a multipart **UR**. A fragment is a string (the URI-form `ur:crypto-account/...` text) before rendering, and a PNG/Y4M-frame after.
_Avoid_: "frame", "chunk", "shard", "part".

**Fountain encoding**:
The multipart scheme BC-UR uses when a payload exceeds one QR's capacity. The emitter cycles through **Fragment**s at ~5fps; the receiver accumulates them until the **UR** can be reconstructed. Implemented in this repo by `@ngraveio/bc-ur`'s `UREncoder` / `URDecoder`.
_Avoid_: "animated-QR encoding", "loop encoding", "sequence encoding".

### UR types (registry)

**crypto-account**:
A **UR** type bundling one or more **crypto-hdkey**s under a single derivation root. The default pairing payload emitted by real Keystone devices and by the emulator (`pairMode: 'crypto-account'`).
_Avoid_: "account UR", "the bundle".

**crypto-hdkey**:
A **UR** type describing one BIP-32 extended public key with its derivation path and origin. The alternate pairing payload (`pairMode: 'crypto-hdkey'`).
_Avoid_: "hdkey UR", "xpub UR".

**eth-sign-request**:
A **UR** type carrying an Ethereum signing request (transaction, EIP-712 typed data, or personal message). Emitted by MetaMask as an animated **Fragment** sequence; consumed by the device (or emulator) to know what to sign.
_Avoid_: "signing request UR", "the request".

**eth-signature**:
A **UR** type carrying an Ethereum signature (r, s, v). Emitted by the device (or emulator) as an animated **Fragment** sequence after consuming an **eth-sign-request**; consumed by MetaMask to complete the signing flow.
_Avoid_: "signature UR", "the response".

### Keyring layer

**QrKeyring**:
The MetaMask keyring class for QR-based hardware wallets (`@metamask/eth-qr-keyring`). Implements the standard `Keyring` interface; holds no crypto itself — all signing is delegated through a **QrKeyringBridge**.
_Avoid_: "the QR keyring impl", "QRKeyring" (no camel-case variant).

**QrKeyringBridge**:
The TypeScript interface that **QrKeyring** depends on. Has exactly one method: `requestScan(req: QrScanRequest) => Promise<SerializedUR>`. This is the **only** seam between the keyring and the outside world.
_Avoid_: "the bridge", "scanner bridge", "QR transport".

**QrKeyringScannerBridge**:
The production **QrKeyringBridge** implementation. Wired in `app/scripts/wallet-init/keyrings.ts` to call `AppStateController:requestQrCodeScan`, which opens the camera scanner UI. **Runs unmodified in tests** after this work.
_Avoid_: "real bridge", "camera bridge".

**QrScanRequestType**:
The two-member enum that **requestScan** accepts: `PAIR` (initial device pairing, returns **crypto-account** or **crypto-hdkey**) or `SIGN` (signing, takes an **eth-sign-request** and returns an **eth-signature**).
_Avoid_: "scan mode", "request kind".

**DeviceMode**:
The two account-derivation strategies supported by **QrKeyring**: `HD` (root xpub + children path, default) and `ACCOUNT` (explicit address→path map). The emulator supports only `HD` in v1.
_Avoid_: "device type", "keyring mode" (the latter is the field name on `DeviceDetails`, not the concept).

### Emulator layer

**QrEmulator**:
The class exported from `@metamask/hw-emulator` (new `src/qr/` submodule) that emulates a QR hardware device. Holds a deterministic seed, synthesises **UR**s, signs with real ECDSA, and renders QR codes to PNG / Y4M. Implements both **HardwareWalletEmulator** and **QrKeyringBridge** directly.
_Avoid_: "QR test driver", "QR mock", "fake device".

**Speculos**:
The Ledger hardware-wallet emulator (`packages/hw-emulator/src/ledger/`) — the precedent for **QrEmulator**. Wraps a Docker container running real Ledger firmware; mocks transport at the WebHID boundary. The QrEmulator mirrors this pattern at a different transport boundary.
_Avoid_: "the Ledger emulator" (Speculos is a product name; use it).

**EmulatorType**:
The enum in `@metamask/hw-emulator` selecting which device family to instantiate via `createEmulator(type, options)`. Members: `Ledger`, `Trezor` (not implemented), `Qr` (added by this work).
_Avoid_: "device type" (collides with the EC-1/NIP-13 "device type" concept).

### Transport layer

**Y4M**:
The uncompressed video file format Chrome accepts via `--use-file-for-fake-video-capture`. The emulator renders a **UR** to a Y4M file (~5fps, 4s, yuv420p) and the file is fed to Chrome's fake camera device.
_Avoid_: "the video file", "the camera feed file".

**Fake camera device**:
Chrome's `--use-fake-device-for-media-stream` flag, which replaces the OS camera with a file-reading device. This is the **only** transport for the emulator in v1; it's the lowest practical mock boundary and requires zero script injection.
_Avoid_: "mocked camera", "synthetic camera".

### Test artifacts (deprecated)

**FakeQrBridge**:
The frozen test stub currently in `metamask-extension/test/stub/keyring-bridge.js` that returns a single hardcoded `SerializedUR` and ignores the camera. **Deleted by this work**; replaced by **QrEmulator** output delivered through the production **QrKeyringScannerBridge**.
_Avoid_: (do not use after deletion; refer to it as "the deleted stub" or by class name in historical context only).

**KNOWN_QR_ACCOUNTS** / **KNOWN_QR_CBOR**:
Frozen address list and CBOR blob that backed **FakeQrBridge**. **Deleted by this work**; replaced by addresses deterministically derived from `QR_EMULATOR_SEED`.
_Avoid_: (do not use after deletion).

## Flagged ambiguities

### "Account"

Severely overloaded across this domain. In this repo:

- A **QrKeyring account** is one entry in the keyring's `#accounts: Hex[]` — a checksummed Ethereum address the keyring has unlocked.
- A **crypto-account** (UR type) is the BC-UR envelope bundling hdkeys, not the keyring entry itself.
- An **HD account** in `DeviceMode.HD` is one child derived from the root xpub via `childrenPath = '0/*'`.
- A **MetaMask account** (in the consumer repo) is a user-visible wallet entry that wraps a keyring account.

When the word "account" appears, **always** qualify it with one of the prefixes above. Unqualified "account" is ambiguous and should be challenged in review.

### "UR"

Sometimes used loosely to mean any of:

- The BCR-2020-006 envelope concept (`UR` class in `@ngraveio/bc-ur`)
- The serialized form (`SerializedUR = { type, cbor }`)
- The text-encoded form (`ur:crypto-account/...` URI string)

In code review, disambiguate by type. **UR** alone refers to the concept; **SerializedUR** refers to the TS type; **fragment** refers to the text-encoded form before QR rendering.

## Example dialogue

> **Reviewer**: The new emulator returns a UR from `getAccountUR`. Is that the cbor form or the typed object?
>
> **Author**: It returns a **SerializedUR** — the `{ type, cbor }` form, same shape as `QrKeyringBridge.requestScan` returns. The typed `UR` class from `@ngraveio/bc-ur` only exists internally in the codec layer.
>
> **Reviewer**: And when you say "the account UR", do you mean a **crypto-account** or **crypto-hdkey**?
>
> **Author**: Default is **crypto-account** — matches real Keystone. You can switch via the `pairMode` option to emit **crypto-hdkey** if a specific test needs that path. Both are multipart-capable via fountain encoding when the payload exceeds fragment size 200.
>
> **Reviewer**: What's the difference between that and the test's **QrKeyring account**?
>
> **Author**: Different layer. The emulator produces a **crypto-account** UR. The production **QrKeyringScannerBridge** delivers it (via camera + zxing + `URDecoder`) to **QrKeyring**, which then derives addresses and stores them as **QrKeyring accounts**. One UR can yield multiple keyring accounts.
>
> **Reviewer**: And the existing tests assert against `KNOWN_QR_ACCOUNTS`?
>
> **Author**: Right — those are **QrKeyring accounts** (Ethereum addresses), frozen in the **FakeQrBridge** stub. After this work they're derived live from `QR_EMULATOR_SEED` and exported as `QR_EMULATOR_ADDRESS` and siblings. The stub is deleted.
