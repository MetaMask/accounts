# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Uncategorized

- build: remove use of workspace versions ([#479](https://github.com/MetaMask/accounts/pull/479))

### Added

- Add `QrKeyringV2` class implementing `KeyringV2` interface ([#411](https://github.com/MetaMask/accounts/pull/411)), ([#447](https://github.com/MetaMask/accounts/pull/447)), ([#451](https://github.com/MetaMask/accounts/pull/451)), ([#453](https://github.com/MetaMask/accounts/pull/453)), ([#478](https://github.com/MetaMask/accounts/pull/478)), ([#482](https://github.com/MetaMask/accounts/pull/482)), ([#487](https://github.com/MetaMask/accounts/pull/487))
  - Add new dependency `@metamask/keyring-api@22.0.0`.
  - Add new dependency `@metamask/keyring-sdk@1.0.0`.
  - Add new dependency `@metamask/account-api@1.0.1`.
  - Wraps legacy `QrKeyring` to expose accounts via the unified `KeyringV2` API and the `KeyringAccount` type.
  - Extends `EthKeyringWrapper` for common Ethereum logic.

### Changed

- Bump `@metamask/utils` from `^11.1.0` to `^11.10.0` ([#489](https://github.com/MetaMask/accounts/pull/489))

## [1.1.0]

### Added

- Export `SerializedUR` type ([#358](https://github.com/MetaMask/accounts/pull/358))

### Fixed

- Fix fingerprint derivation for some QR devices ([#357](https://github.com/MetaMask/accounts/pull/357))

## [1.0.0]

### Added

- Initial release ([#60](https://github.com/MetaMask/accounts/pull/60))

[Unreleased]: https://github.com/MetaMask/accounts/compare/@metamask/eth-qr-keyring@1.1.0...HEAD
[1.1.0]: https://github.com/MetaMask/accounts/compare/@metamask/eth-qr-keyring@1.0.0...@metamask/eth-qr-keyring@1.1.0
[1.0.0]: https://github.com/MetaMask/accounts/releases/tag/@metamask/eth-qr-keyring@1.0.0
