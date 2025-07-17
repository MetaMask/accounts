# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [5.0.0]

### Uncategorized

- chore: bump snap deps ([#304](https://github.com/MetaMask/accounts/pull/304))

## [4.0.0]

### Changed

- **BREAKING:** Make `@metamask/keyring-api@^18.0.0` a peer dependency ([#290](https://github.com/MetaMask/accounts/pull/290)), ([#291](https://github.com/MetaMask/accounts/pull/291))

## [3.2.0]

### Added

- Add support of `discoverAccounts` keyring method ([#266](https://github.com/MetaMask/accounts/pull/266))

### Changed

- Use event payload type for `emitSnapKeyringEvent` ([#203](https://github.com/MetaMask/accounts/pull/203))
- Bump `@metamask/keyring-api` from `^17.2.0` to `^17.4.0` ([#263](https://github.com/MetaMask/accounts/pull/263)), ([#269](https://github.com/MetaMask/accounts/pull/269))

## [3.1.0]

### Added

- Add UNIX timestamp helpers `getCurrentUnixTimestamp` and `toUnixTimestamp` ([#236](https://github.com/MetaMask/accounts/pull/236))

## [3.0.1]

### Changed

- Bump `@metamask/keyring-api` from `^17.0.0` to `^17.2.0` ([#212](https://github.com/MetaMask/accounts/pull/212)), ([#220](https://github.com/MetaMask/accounts/pull/220))
- Use `ts-bridge/cli@0.6.3` ([#214](https://github.com/MetaMask/accounts/pull/214))
  - This new version fixes a bug regarding some missing exports.

## [3.0.0]

### Changed

- **BREAKING:** Bump `@metamask/providers` peer dependency from `^18.3.1` to `^19.0.0` ([#177](https://github.com/MetaMask/accounts/pull/177))
- Bump `@metamask/keyring-api` from `^16.1.0` to `^17.0.0` ([#192](https://github.com/MetaMask/accounts/pull/192))
- Bump `@metamask/snaps-sdk` dependency from `^6.7.0` to `^6.16.0` ([#177](https://github.com/MetaMask/accounts/pull/177))

## [2.1.2]

### Changed

- Bump `@metamask/keyring-api` from `^16.0.0` to `^16.1.0` ([#176](https://github.com/MetaMask/accounts/pull/176))

## [2.1.1]

### Changed

- Bump `@metamask/keyring-api` from `^14.0.0` to `^16.0.0` ([#172](https://github.com/MetaMask/accounts/pull/172)), [#160](https://github.com/MetaMask/accounts/pull/160)
- Bump `@metamask/utils` from `^11.0.1` to `^11.1.0` ([#167](https://github.com/MetaMask/accounts/pull/167))

## [2.1.0]

### Added

- Add support of `listAccountAssets` keyring method ([#148](https://github.com/MetaMask/accounts/pull/148))

## [2.0.0]

### Changed

- **BREAKING:** Bump `@metamask/keyring-api` from `^12.0.0` to `^13.0.0` ([#101](https://github.com/MetaMask/accounts/pull/101))
  - This change was not properly reported as breaking on the `1.1.0`.
  - `KeyringAccount` has a new required field (`scopes`) and is part of the public API.

## [1.1.0]

### Changed

- Bump `@metamask/keyring-api` from `^12.0.0` to `^13.0.0` ([#101](https://github.com/MetaMask/accounts/pull/101))

## [1.0.0]

### Changed

- Use `ts-bridge/cli@0.6.1` ([#118](https://github.com/MetaMask/accounts/pull/118))
  - This new version fixes a bug with CJS re-exports.
- Initial release ([#24](https://github.com/MetaMask/accounts/pull/24))

[Unreleased]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-snap-sdk@5.0.0...HEAD
[5.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-snap-sdk@4.0.0...@metamask/keyring-snap-sdk@5.0.0
[4.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-snap-sdk@3.2.0...@metamask/keyring-snap-sdk@4.0.0
[3.2.0]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-snap-sdk@3.1.0...@metamask/keyring-snap-sdk@3.2.0
[3.1.0]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-snap-sdk@3.0.1...@metamask/keyring-snap-sdk@3.1.0
[3.0.1]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-snap-sdk@3.0.0...@metamask/keyring-snap-sdk@3.0.1
[3.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-snap-sdk@2.1.2...@metamask/keyring-snap-sdk@3.0.0
[2.1.2]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-snap-sdk@2.1.1...@metamask/keyring-snap-sdk@2.1.2
[2.1.1]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-snap-sdk@2.1.0...@metamask/keyring-snap-sdk@2.1.1
[2.1.0]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-snap-sdk@2.0.0...@metamask/keyring-snap-sdk@2.1.0
[2.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-snap-sdk@1.1.0...@metamask/keyring-snap-sdk@2.0.0
[1.1.0]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-snap-sdk@1.0.0...@metamask/keyring-snap-sdk@1.1.0
[1.0.0]: https://github.com/MetaMask/accounts/releases/tag/@metamask/keyring-snap-sdk@1.0.0
