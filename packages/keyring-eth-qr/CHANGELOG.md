# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Add `QrKeyringV2` class implementing KeyringV2 interface ([#398](https://github.com/MetaMask/accounts/pull/398))
  - Wraps legacy `QrKeyring` to expose accounts via the unified KeyringV2 API and the `KeyringAccount` type.

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
