# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial release of `@metamask/speculos-ble` ([#TODO](https://github.com/MetaMask/accounts/pull/TODO))
  - Virtual BLE Ledger device for E2E testing with Speculos
  - Python BLE bridge that wraps Speculos APDU stream into a GATT server using Bumble
  - Control API for test-driven device interaction (approve, reject, disconnect)
  - APDU framing and bridging between BLE GATT and Speculos TCP APDU
  - Device emulation with configurable transport modes (`android-netsim`, `vhci`)
  - TypeScript `SpeculosBleRunner` for programmatic lifecycle management
  - Docker support for containerized BLE emulation
  - Python test suite covering APDU framing, GATT server, control API, and integration
