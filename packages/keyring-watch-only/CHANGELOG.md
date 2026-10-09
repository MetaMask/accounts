# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0]

### Uncategorized

- revert: release: 129.0.0 (#658) ([#658](https://github.com/MetaMask/accounts/pull/658))

### Added

- Initial release of `@metamask/watch-only-keyring` ([#644](https://github.com/MetaMask/accounts/pull/644), [#656](https://github.com/MetaMask/accounts/pull/656), [#657](https://github.com/MetaMask/accounts/pull/657))
  - A watch-only v2 `Keyring` that holds accounts imported by address, without any signing capability.
  - Supports creating accounts via the `address:import` option, with an optional `accountType` (defaulting to `eip155:eoa`) and optional `scopes` (defaulting to the keyring's scopes, since the scope cannot always be detected from the address alone).
  - Includes `WatchOnlyKeyringV1Adapter`, which adapts the keyring to the legacy v1 keyring API for `KeyringController` compatibility, adding address-based account removal.
  - Includes synchronous `lookupAccount` and `lookupByAddress` methods for `AccountsController` integration.

[Unreleased]: https://github.com/MetaMask/accounts/compare/@metamask/watch-only-keyring@0.1.0...HEAD
[0.1.0]: https://github.com/MetaMask/accounts/releases/tag/@metamask/watch-only-keyring@0.1.0
