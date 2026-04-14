# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Uncategorized

- chore: add `yarn constraints` support ([#514](https://github.com/MetaMask/accounts/pull/514))
- feat(keyring-sdk): add `generateEthAccountId` + use it in `EthKeyringWrapper` ([#504](https://github.com/MetaMask/accounts/pull/504))
- build: remove use of workspace versions ([#479](https://github.com/MetaMask/accounts/pull/479))

### Added

- Add `QrKeyringV2` class implementing `KeyringV2` interface ([#411](https://github.com/MetaMask/accounts/pull/411)), ([#447](https://github.com/MetaMask/accounts/pull/447)), ([#451](https://github.com/MetaMask/accounts/pull/451)), ([#453](https://github.com/MetaMask/accounts/pull/453)), ([#478](https://github.com/MetaMask/accounts/pull/478)), ([#482](https://github.com/MetaMask/accounts/pull/482)), ([#487](https://github.com/MetaMask/accounts/pull/487)), ([#496](https://github.com/MetaMask/accounts/pull/496)), ([#509](https://github.com/MetaMask/accounts/pull/509))
  - Add new dependency `@metamask/keyring-api@22.0.0`.
  - Add new dependency `@metamask/keyring-sdk@1.2.0`.
  - Add new dependency `@metamask/account-api@1.0.1`.
  - Wraps legacy `QrKeyring` to expose accounts via the unified `KeyringV2` API and the `KeyringAccount` type.
  - Extends `EthKeyringWrapper` for common Ethereum logic.
- Add `./v2` subpath export for keyring v2 implementation ([#513](https://github.com/MetaMask/accounts/pull/513))
  - `QrKeyring`, `QrKeyringOptions`, and `QrAccountModeCreateOptions` are now available from `@metamask/eth-qr-keyring/v2`.

### Changed

- **BREAKING:** Rename and move `QrKeyringV2`, `QrKeyringV2Options`, and `QrAccountModeCreateOptions` to the new `./v2` subpath export ([#513](https://github.com/MetaMask/accounts/pull/513))
  - `QrKeyringV2` is now `QrKeyring` from `@metamask/eth-qr-keyring/v2`.
  - `QrKeyringV2Options` is now `QrKeyringOptions` from `@metamask/eth-qr-keyring/v2`.
- Bump `@metamask/utils` from `^11.1.0` to `^11.11.0` ([#489](https://github.com/MetaMask/accounts/pull/489), [#483](https://github.com/MetaMask/accounts/pull/483))

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
