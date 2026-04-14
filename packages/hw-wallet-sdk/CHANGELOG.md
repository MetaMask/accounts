# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Uncategorized

- chore: add `yarn constraints` support ([#514](https://github.com/MetaMask/accounts/pull/514))

## [0.8.0]

### Added

- Add `PermissionCameraPromptDismissed` error code and `QR_WALLET_ERROR_MAPPINGS` used for extension QR hardware wallet camera flows ([#490](https://github.com/MetaMask/accounts/pull/490))

## [0.7.0]

### Added

- Add `PermissionCameraDenied` error code and `CAMERA_PERMISSION_DENIED` mapping for mobile camera permission handling ([#485](https://github.com/MetaMask/accounts/pull/485))

## [0.6.0]

### Added

- Add `TREZOR_ERROR_MAPPINGS` static error data for Trezor hardware wallets ([#471](https://github.com/MetaMask/accounts/pull/471))

## [0.5.0]

### Added

- Add error mapping for status code `0x6a83` indicating Ethereum app closed while on Solana ([#446](https://github.com/MetaMask/accounts/pull/446))

### Fixed

- Fix error mappings for status codes `0x650f` and `0x6d00` to map to `DeviceStateEthAppClosed` instead of incorrect error codes ([#466](https://github.com/MetaMask/accounts/pull/466))
  - `0x650f`: changed from `ConnectionClosed` to `DeviceStateEthAppClosed`.
  - `0x6d00`: changed from `DeviceStateOnlyV4Supported` to `DeviceStateEthAppClosed`.

## [0.4.0]

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

[Unreleased]: https://github.com/MetaMask/accounts/compare/@metamask/hw-wallet-sdk@0.8.0...HEAD
[0.8.0]: https://github.com/MetaMask/accounts/compare/@metamask/hw-wallet-sdk@0.7.0...@metamask/hw-wallet-sdk@0.8.0
[0.7.0]: https://github.com/MetaMask/accounts/compare/@metamask/hw-wallet-sdk@0.6.0...@metamask/hw-wallet-sdk@0.7.0
[0.6.0]: https://github.com/MetaMask/accounts/compare/@metamask/hw-wallet-sdk@0.5.0...@metamask/hw-wallet-sdk@0.6.0
[0.5.0]: https://github.com/MetaMask/accounts/compare/@metamask/hw-wallet-sdk@0.4.0...@metamask/hw-wallet-sdk@0.5.0
[0.4.0]: https://github.com/MetaMask/accounts/compare/@metamask/hw-wallet-sdk@0.3.0...@metamask/hw-wallet-sdk@0.4.0
[0.3.0]: https://github.com/MetaMask/accounts/compare/@metamask/hw-wallet-sdk@0.2.0...@metamask/hw-wallet-sdk@0.3.0
[0.2.0]: https://github.com/MetaMask/accounts/compare/@metamask/hw-wallet-sdk@0.1.0...@metamask/hw-wallet-sdk@0.2.0
[0.1.0]: https://github.com/MetaMask/accounts/releases/tag/@metamask/hw-wallet-sdk@0.1.0
