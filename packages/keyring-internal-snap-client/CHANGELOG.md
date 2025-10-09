# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [7.2.0]

### Changed

- Bump `@metamask/keyring-api` from `^21.0.0` to `^21.1.0` ([#387](https://github.com/MetaMask/accounts/pull/387))
- Bump `@metamask/keyring-snap-client` from `^8.0.0` to `^8.1.0` ([#387](https://github.com/MetaMask/accounts/pull/387))
- Bump `@metamask/keyring-internal-api` from `^9.0.0` to `^9.1.0` ([#387](https://github.com/MetaMask/accounts/pull/387))


## [7.1.0]

### Changed

- Bump `@metamask/base-controller` from `^7.1.1` to `^8.3.0` ([#364](https://github.com/MetaMask/accounts/pull/364))

## [7.0.0]

### Changed

- **BREAKING:** Bump `@metamask/keyring-api` from `^20.0.0` to `^21.0.0` ([#355](https://github.com/MetaMask/accounts/pull/355)), ([#356](https://github.com/MetaMask/accounts/pull/356))

## [6.0.0]

### Changed

- **BREAKING:** Bump `@metamask/keyring-api` from `^19.0.0` to `^20.0.0` ([#347](https://github.com/MetaMask/accounts/pull/347))
  - Add generic account type.
- **BREAKING:** Bump `@metamask/keyring-snap-client` from `^6.0.0` to `^7.0.0` ([#347](https://github.com/MetaMask/accounts/pull/347))
  - Add generic account type.
- **BREAKING:** Bump `@metamask/keyring-internal-api` from `^7.0.0` to `^8.0.0` ([#347](https://github.com/MetaMask/accounts/pull/347))
  - Add generic account type.

## [5.0.0]

### Changed

- **BREAKING:** Bump `@metamask/keyring-api` from `^18.0.0` to `^19.0.0` ([#317](https://github.com/MetaMask/accounts/pull/317))
  - The `KeyringAccount.options` field is now partially typed.
- **BREAKING:** Bump `@metamask/keyring-snap-client` from `^5.0.0` to `^6.0.0` ([#317](https://github.com/MetaMask/accounts/pull/317))
  - The `KeyringAccount.options` field is now partially typed.
- **BREAKING:** Bump `@metamask/keyring-internal-api` from `^6.2.0` to `^7.0.0` ([#317](https://github.com/MetaMask/accounts/pull/317))
  - The `InternalAccount.options` field is now partially typed.
- Bump `@metamask/keyring-utils` from `^3.0.0` to `^3.1.0` ([#317](https://github.com/MetaMask/accounts/pull/317))

## [4.1.0]

### Added

- Add `KeyringInternalSnapClient.submitRequestV1` method ([#291](https://github.com/MetaMask/accounts/pull/291))
- Add `@metamask/keyring-internal-api@^6.2.0` dependency ([#291](https://github.com/MetaMask/accounts/pull/291))

### Changed

- Bump `@metamask/keyring-api` from `^17.4.0` to `^18.0.0` ([#277](https://github.com/MetaMask/accounts/pull/277)), ([#288](https://github.com/MetaMask/accounts/pull/288)), ([#291](https://github.com/MetaMask/accounts/pull/291))
- Bump `@metamask/keyring-snap-client` from `^4.1.0` to `^5.0.0` ([#291](https://github.com/MetaMask/accounts/pull/291))
- Bump `@metamask/snaps-sdk` dependency from `^6.16.0` to `^7.0.0` ([#291](https://github.com/MetaMask/accounts/pull/291))

## [4.0.2]

### Changed

- Bump `@metamask/keyring-snap-client` from `^4.0.1` to `^4.1.0` ([#269](https://github.com/MetaMask/accounts/pull/269))

## [4.0.1]

### Changed

- Bump `@metamask/keyring-snap-client` from `^4.0.0` to `^4.0.1` ([#220](https://github.com/MetaMask/accounts/pull/220))
- Use `ts-bridge/cli@0.6.3` ([#214](https://github.com/MetaMask/accounts/pull/214))
  - This new version fixes a bug regarding some missing exports.

## [4.0.0]

### Changed

- **BREAKING:** Bump `@metamask/providers` peer dependency from `^18.3.1` to `^19.0.0` ([#177](https://github.com/MetaMask/accounts/pull/177))
- Bump `@metamask/keyring-api` from `^16.1.0` to `^17.0.0` ([#192](https://github.com/MetaMask/accounts/pull/192))
- Bump `@metamask/keyring-snap-client` from `^3.0.3` to `^4.0.0` ([#192](https://github.com/MetaMask/accounts/pull/192))
- Bump `@metamask/snaps-sdk` dependency from `^6.7.0` to `^6.16.0` ([#177](https://github.com/MetaMask/accounts/pull/177))
- Rename `ControllerMessenger` to `Messenger` ([#185](https://github.com/MetaMask/accounts/pull/185))

## [3.0.3]

### Changed

- Bump `@metamask/keyring-api` from `^16.0.0` to `^16.1.0` ([#176](https://github.com/MetaMask/accounts/pull/176))
- Bump `@metamask/keyring-snap-client` from `^3.0.2` to `^3.0.3` ([#176](https://github.com/MetaMask/accounts/pull/176))

## [3.0.2]

### Changed

- Bump `@metamask/keyring-api` from `^15.0.0` to `^16.0.0` ([#172](https://github.com/MetaMask/accounts/pull/172))
- Bump `@metamask/keyring-snap-client` from `^3.0.1` to `^3.0.2` ([#172](https://github.com/MetaMask/accounts/pull/172))
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

[Unreleased]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-internal-snap-client@7.2.0...HEAD
[7.2.0]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-internal-snap-client@7.1.0...@metamask/keyring-internal-snap-client@7.2.0
[7.1.0]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-internal-snap-client@7.0.0...@metamask/keyring-internal-snap-client@7.1.0
[7.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-internal-snap-client@6.0.0...@metamask/keyring-internal-snap-client@7.0.0
[6.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-internal-snap-client@5.0.0...@metamask/keyring-internal-snap-client@6.0.0
[5.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-internal-snap-client@4.1.0...@metamask/keyring-internal-snap-client@5.0.0
[4.1.0]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-internal-snap-client@4.0.2...@metamask/keyring-internal-snap-client@4.1.0
[4.0.2]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-internal-snap-client@4.0.1...@metamask/keyring-internal-snap-client@4.0.2
[4.0.1]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-internal-snap-client@4.0.0...@metamask/keyring-internal-snap-client@4.0.1
[4.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-internal-snap-client@3.0.3...@metamask/keyring-internal-snap-client@4.0.0
[3.0.3]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-internal-snap-client@3.0.2...@metamask/keyring-internal-snap-client@3.0.3
[3.0.2]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-internal-snap-client@3.0.1...@metamask/keyring-internal-snap-client@3.0.2
[3.0.1]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-internal-snap-client@3.0.0...@metamask/keyring-internal-snap-client@3.0.1
[3.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-internal-snap-client@2.0.0...@metamask/keyring-internal-snap-client@3.0.0
[2.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-internal-snap-client@1.1.0...@metamask/keyring-internal-snap-client@2.0.0
[1.1.0]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-internal-snap-client@1.0.0...@metamask/keyring-internal-snap-client@1.1.0
[1.0.0]: https://github.com/MetaMask/accounts/releases/tag/@metamask/keyring-internal-snap-client@1.0.0
