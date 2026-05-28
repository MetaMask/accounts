# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0]

### Added

- Initial release of `@metamask/hw-emulator` ([#560](https://github.com/MetaMask/accounts/pull/560))
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
  - LICENSE (MIT) and README documentation

[Unreleased]: https://github.com/MetaMask/accounts/compare/@metamask/hw-emulator@0.1.0...HEAD
[0.1.0]: https://github.com/MetaMask/accounts/releases/tag/@metamask/hw-emulator@0.1.0
