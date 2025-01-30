# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.0.3]

### Changed

- Bump `@metamask/keyring-api` from `^16.0.0` to `^16.1.0` ([#176](https://github.com/MetaMask/accounts/pull/176))

## [3.0.2]

### Changed

- Bump `@metamask/keyring-api` from `^15.0.0` to `^16.0.0` ([#TODO](https://github.com/MetaMask/accounts/pull/TODO))
- Bump `@metamask/utils` from `^11.0.1` to `^11.1.0` ([#167](https://github.com/MetaMask/accounts/pull/167))

## [3.0.1]

### Changed

- Bump `@metamask/keyring-api` from `^14.0.0` to `^15.0.0` ([#160](https://github.com/MetaMask/accounts/pull/160))
- Bump `@metamask/keyring-snap-client` from `^3.0.0` to `^3.0.1` ([#160](https://github.com/MetaMask/accounts/pull/160))

## [3.0.0]

### Added

- Add `listAccountAssets` keyring method ([#148](https://github.com/MetaMask/accounts/pull/148))
  - This is inherited from the `KeyringClient` changes.

### Changed

- **BREAKING:** Bump `@metamask/keyring-api` from `^13.0.0` to `^14.0.0` ([#155](https://github.com/MetaMask/accounts/pull/155))
  - The `CaipAssetType` is now more restrictive which affects the existing `getAccountBalances` method.

## [2.0.0]

### Changed

- **BREAKING:** Bump `@metamask/keyring-api` from `^12.0.0` to `^13.0.0` ([#101](https://github.com/MetaMask/accounts/pull/101))
  - This change was not properly reported as breaking on the `1.1.0`.
  - `KeyringAccount` has a new required field (`scopes`) and is part of the public API.
- **BREAKING:** Bump `@metamask/keyring-snap-client` from `^1.0.0` to `^2.0.0` ([#135](https://github.com/MetaMask/accounts/pull/135))
  - This change was not properly reported as breaking on the `1.1.0`.
  - `KeyringAccount` has a new required field (`scopes`) and is part of the public API.

## [1.1.0]

### Changed

- Bump `@metamask/keyring-api` from `^12.0.0` to `^13.0.0` ([#101](https://github.com/MetaMask/accounts/pull/101))
- Bump `@metamask/keyring-snap-client` from `^1.0.0` to `^1.1.0` ([#101](https://github.com/MetaMask/accounts/pull/101))

## [1.0.0]

### Added

- Use `ts-bridge/cli@0.6.1` ([#118](https://github.com/MetaMask/accounts/pull/118))
  - This new version fixes a bug with CJS re-exports.
- Initial release ([#24](https://github.com/MetaMask/accounts/pull/24))

[Unreleased]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-internal-snap-client@3.0.3...HEAD
[3.0.3]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-internal-snap-client@3.0.2...@metamask/keyring-internal-snap-client@3.0.3
[3.0.2]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-internal-snap-client@3.0.1...@metamask/keyring-internal-snap-client@3.0.2
[3.0.1]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-internal-snap-client@3.0.0...@metamask/keyring-internal-snap-client@3.0.1
[3.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-internal-snap-client@2.0.0...@metamask/keyring-internal-snap-client@3.0.0
[2.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-internal-snap-client@1.1.0...@metamask/keyring-internal-snap-client@2.0.0
[1.1.0]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-internal-snap-client@1.0.0...@metamask/keyring-internal-snap-client@1.1.0
[1.0.0]: https://github.com/MetaMask/accounts/releases/tag/@metamask/keyring-internal-snap-client@1.0.0
