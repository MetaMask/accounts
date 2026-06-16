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

[Unreleased]: https://github.com/MetaMask/accounts/
