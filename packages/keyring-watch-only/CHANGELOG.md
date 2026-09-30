# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0]

### Added

- Initial release of `@metamask/watch-only-keyring` ([#TODO](https://github.com/MetaMask/accounts/pull/TODO))
  - A watch-only v2 [`Keyring`](https://github.com/MetaMask/accounts/tree/main/packages/keyring-api) that holds accounts imported by address, without any signing capability.
  - Supports creating accounts via the `address:import` option, with an optional `accountType` (defaulting to `eip155:eoa`).
  - Includes `WatchOnlyKeyringV1Adapter`, which adapts the keyring to the legacy v1 keyring API for `KeyringController` compatibility, adding address-based account removal.

[Unreleased]: https://github.com/MetaMask/accounts/compare/@metamask/watch-only-keyring@0.1.0...HEAD
[0.1.0]: https://github.com/MetaMask/accounts/releases/tag/@metamask/watch-only-keyring@0.1.0
