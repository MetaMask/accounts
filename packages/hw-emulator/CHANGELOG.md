# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- `SpeculosBleRunner` now honors `SPECULOS_BLE_PACKAGE_DIR` and `SPECULOS_BLE_VENV_DIR` environment variables (mirroring `scripts/setup-python.sh`) so it can locate `python_src/` and the virtualenv at a stable path even when the package is copied into a consumer's `node_modules` via a Yarn `file:` resolution.
- `SpeculosBleRunner.start()` now accepts an optional `onLog(line, stream)` callback that receives BLE process stdout/stderr/exit/error output (previously silently discarded).
- Merged `@metamask/speculos-ble` package into `@metamask/hw-emulator`. The BLE bridge (Python source, TypeScript `SpeculosBleRunner` wrapper, Docker config) now lives in this package under `python_src/`, `src/ble/`, and `scripts/`.

### Added

- Added QR hardware wallet emulator (`EmulatorType.Qr`) with UR synthesis, ECDSA signer, BC-UR fountain codec, QR rendering (PNG and Y4M), and QR screenshot decoding ([#TODO](https://github.com/MetaMask/accounts/pull/TODO))
- Initial release of `@metamask/hw-emulator` ([#TODO](https://github.com/MetaMask/accounts/pull/TODO))
  - Hardware wallet emulator lifecycle, transport, and device interaction for E2E testing
  - Ledger emulator via Speculos with support for Nano S+, Nano X, Stax, and Flex devices
  - Docker and native run modes
  - `SpeculosClient` for APDU exchange and screen events
  - `ApduBridge` for WebSocket-to-APDU bridge (WebHID mocking)
  - `DockerManager` for Docker Compose lifecycle management
  - `ProcessManager` for native Speculos process spawning
  - Device interaction automation (button presses, touch gestures)
  - Resilience utilities (`withRetry`, `ExponentialBackoff`)
  - Ledger HID framing session utilities
  - WebHID mock script generation for E2E tests
  - Deterministic accounts with pre-configured seed
  - Bundled ELF app binaries for all supported devices
  - Docker Compose configuration for Speculos
  - JSDoc documentation on all public types, classes, methods, and constants
  - `getElfFilePath` utility for resolving ELF binary paths (native mode)
  - `startNative()` defaults to `@metamask/speculos-up` managed binary when no `binary` option is provided
  - Fix Docker mode ignoring custom `apduPort` / `apiPort` by passing host ports to `docker-compose`
  - Fix Docker mode ignoring the `seed` option by wiring `SPECULOS_SEED` through `docker-compose.yml`
  - Fix Docker mode ignoring the `display` option by wiring `SPECULOS_DISPLAY` through `docker-compose.yml`
- Added `@metamask/speculos-up` as peer dependency

### Fixed

- Ledger `Speculos.start()` no longer leaks the process/container when the APDU client fails to connect after startup; `stop()` now cleans up all created resources regardless of the started flag ([#TODO](https://github.com/MetaMask/accounts/pull/TODO))
  - `ApduBridge` server errors after startup no longer trigger unhandled promise rejections.
  - `SpeculosClient.connect()` now enforces a configurable connect timeout instead of hanging indefinitely, and a timed-out exchange can no longer consume a stale late response as its own.
  - `DockerManager` tears the container down when the health check fails, uses a per-instance container name so multiple emulators can run concurrently, and honors `stopTimeout` in `docker compose down`.
  - `ProcessManager.stop()` is idempotent under concurrent calls (no listener/timer accumulation).
  - The WebHID mock script rejects pending exchanges on WebSocket close/error and tolerates non-JSON frames.
  - Transaction-signing chunk tracking moved from bridge-global state to per-connection state, fixing corrupted counters with concurrent connections.
  - `parseTxPayloadLength` now handles single-byte RLP values correctly.
  - Touch-device interactions throw a descriptive error when the device model lacks the required button coordinates, instead of silently doing nothing.
  - `SpeculosBleRunner.setupVenv()` uses `execFileSync` (no shell), `stop()` tolerates an already-exited process, and the control-API readiness probe no longer leaks its abort timer.
- Trezor sidecar now tracks and stops the secondary CORS proxy on port 21325 (previously leaked), enforces a 10 MB request-body cap on the proxy (413 beyond), and the asset server rejects path traversal via resolved-path checks ([#TODO](https://github.com/MetaMask/accounts/pull/TODO))
  - `ControllerClient` no longer leaks pending-request entries on synchronous send failures and routes post-connect socket errors to pending rejections instead of settled promises.
  - `TrezorEmulator.start()` stops the Docker container when the controller never becomes available.
  - Speculos Docker image pinned to `0.25.13` (was mutable `latest`), and host-side port defaults aligned across `docker-compose.yml` and `scripts/start-android.sh`.
  - `scripts/start-android.sh` cleanup now stops and removes the container instead of only killing the Docker CLI process.
- QR screenshot decoding now validates PNG chunk lengths and CRCs and rejects truncated IDAT streams instead of decoding garbage pixels ([#TODO](https://github.com/MetaMask/accounts/pull/TODO))
  - Y4M rendering survives early ffmpeg exit (EPIPE) without crashing, and failed renders clean up their partial output file.
  - `parseXfp` rejects fingerprints that are not exactly 8 hex characters.
  - Transaction rejection can target a specific request id so armed rejections cannot be consumed by unrelated requests.
  - `renderToPng` throws for multi-fragment URs (use `renderToY4m`), missing derivation paths produce a clear error, and decoding distinguishes completion from success.
- Python BLE bridge hardening ([#TODO](https://github.com/MetaMask/accounts/pull/TODO))
  - Speculos TCP client enforces a 64 KB max response size; APDU fragmentation rejects payloads over the 16-bit length limit and reassembly detects declared-length overflow.
  - Control API validates inputs (`/button/press`, `/error/inject`) and returns 504 instead of an opaque 500 when signing auto-approval times out.
  - Error injection is applied atomically under a lock; GATT send failures propagate and reset cancels in-flight exchanges; `device.stop()` is idempotent; dependencies pinned (`bumble==0.0.233`, `aiohttp==3.14.3`, `click==8.4.2`).

[Unreleased]: https://github.com/MetaMask/accounts/
