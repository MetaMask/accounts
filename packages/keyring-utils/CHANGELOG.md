# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Uncategorized

- feat: add `account{AssetList,Balances,Transactions}Updated` keyring events + re-publish ([#154](https://github.com/MetaMask/accounts/pull/154))

## [1.2.0]

### Changed

- Add generic type in `definePattern` ([#150](https://github.com/MetaMask/accounts/pull/150))
  - It allows to use template literal type that matches the pattern.

## [1.1.0]

### Added

- Add Bitcoin address helpers ([#147](https://github.com/MetaMask/accounts/pull/147))

### Changed

- Bump `@metamask/utils` from `^9.3.0` to `^11.0.1` ([#134](https://github.com/MetaMask/accounts/pull/134))

## [1.0.0]

### Changed

- Use `ts-bridge/cli@0.6.1` ([#118](https://github.com/MetaMask/accounts/pull/118))
  - This new version fixes a bug with CJS re-exports.
- Initial release ([#24](https://github.com/MetaMask/accounts/pull/24))

[Unreleased]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-utils@1.2.0...HEAD
[1.2.0]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-utils@1.1.0...@metamask/keyring-utils@1.2.0
[1.1.0]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-utils@1.0.0...@metamask/keyring-utils@1.1.0
[1.0.0]: https://github.com/MetaMask/accounts/releases/tag/@metamask/keyring-utils@1.0.0
