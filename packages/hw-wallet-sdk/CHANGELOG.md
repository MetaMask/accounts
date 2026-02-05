# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Add `ErrorMapping` type ([#446](https://github.com/MetaMask/accounts/pull/446))

## [0.3.0]

### Added

- Add hardware wallet connection types and improved error handling ([#456](https://github.com/MetaMask/accounts/pull/456))
  - Add `HardwareWalletType`, `ConnectionStatus`, `DeviceEvent` enums and `HardwareWalletConnectionState`, `DeviceEventPayload` types.
  - Add Ledger error mappings for device locked and Ethereum app closed states.
  - Add `isHardwareWalletError` static method to `HardwareWalletError` class for type-safe error checking.

## [0.2.0]

### Added

- Add `DeviceUnresponsive` error code and Ledger mapping for unresponsive device state ([#442](https://github.com/MetaMask/accounts/pull/442))

## [0.1.0]

### Added

- Add hardware related error mappings and custom hardware error ([#421](https://github.com/MetaMask/accounts/pull/421))
- Add BLE and mobile error mappings with new error codes for Bluetooth permissions, connection states, and mobile support ([#433](https://github.com/MetaMask/accounts/pull/433))

[Unreleased]: https://github.com/MetaMask/accounts/compare/@metamask/hw-wallet-sdk@0.3.0...HEAD
[0.3.0]: https://github.com/MetaMask/accounts/compare/@metamask/hw-wallet-sdk@0.2.0...@metamask/hw-wallet-sdk@0.3.0
[0.2.0]: https://github.com/MetaMask/accounts/compare/@metamask/hw-wallet-sdk@0.1.0...@metamask/hw-wallet-sdk@0.2.0
[0.1.0]: https://github.com/MetaMask/accounts/releases/tag/@metamask/hw-wallet-sdk@0.1.0
