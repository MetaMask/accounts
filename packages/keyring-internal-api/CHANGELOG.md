# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.0.1]

### Changed

- Bump `@metamask/keyring-api` from `^13.0.0` to `^14.0.0` ([#155](https://github.com/MetaMask/accounts/pull/155))

## [2.0.0]

### Changed

- **BREAKING:** Bump `@metamask/keyring-api` from `^12.0.0` to `^13.0.0` ([#101](https://github.com/MetaMask/accounts/pull/101))
  - This change was not properly reported as breaking on the `1.1.0`.
  - `InternalAccount` extends `KeyringAccount` which has a new required field (`scopes`) and is part of the public API.

## [1.1.0]

### Changed

- Bump `@metamask/keyring-api` from `^12.0.0` to `^13.0.0` ([#101](https://github.com/MetaMask/accounts/pull/101))

## [1.0.0]

### Added

- Use `ts-bridge/cli@0.6.1` ([#118](https://github.com/MetaMask/accounts/pull/118))
  - This new version fixes a bug with CJS re-exports.
- Initial release ([#24](https://github.com/MetaMask/accounts/pull/24))

[Unreleased]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-internal-api@2.0.1...HEAD
[2.0.1]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-internal-api@2.0.0...@metamask/keyring-internal-api@2.0.1
[2.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-internal-api@1.1.0...@metamask/keyring-internal-api@2.0.0
[1.1.0]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-internal-api@1.0.0...@metamask/keyring-internal-api@1.1.0
[1.0.0]: https://github.com/MetaMask/accounts/releases/tag/@metamask/keyring-internal-api@1.0.0
