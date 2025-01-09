# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.0.0]

### Changed

- **BREAKING:** Bump `@metamask/keyring-api` from `^12.0.0` to `^13.0.0` ([#101](https://github.com/MetaMask/accounts/pull/101))
  - This change was not properly reported as breaking on the `1.1.0`.
  - It is breaking because of the `KeyringAccount.scopes` field, which is non-optional.
- **BREAKING:** Bump `@metamask/keyring-snap-client` from `^1.0.0` to `^2.0.0` ([#135](https://github.com/MetaMask/accounts/pull/135))
  - This change was not properly reported as breaking on the `1.1.0`.
  - Use of the `KeyringAccount` type in the public interface.

## [1.1.0]

### Changed

- Bump `@metamask/keyring-api` from `^12.0.0` to `^13.0.0` ([#101](https://github.com/MetaMask/accounts/pull/101))
- Bump `@metamask/keyring-snap-client` from `^1.0.0` to `^1.1.0` ([#101](https://github.com/MetaMask/accounts/pull/101))

## [1.0.0]

### Added

- Use `ts-bridge/cli@0.6.1` ([#118](https://github.com/MetaMask/accounts/pull/118))
  - This new version fixes a bug with CJS re-exports.
- Initial release ([#24](https://github.com/MetaMask/accounts/pull/24))

[Unreleased]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-internal-snap-client@2.0.0...HEAD
[2.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-internal-snap-client@1.1.0...@metamask/keyring-internal-snap-client@2.0.0
[1.1.0]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-internal-snap-client@1.0.0...@metamask/keyring-internal-snap-client@1.1.0
[1.0.0]: https://github.com/MetaMask/accounts/releases/tag/@metamask/keyring-internal-snap-client@1.0.0
