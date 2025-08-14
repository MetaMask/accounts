# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [8.1.0]

### Added

- Add Tron support ([#349](https://github.com/MetaMask/accounts/pull/349))

## [8.0.0]

### Changed

- **BREAKING:** Bump `@metamask/keyring-api` from `^19.1.0` to `^20.0.0` ([#347](https://github.com/MetaMask/accounts/pull/347))
  - This change was not properly reported as breaking on the `7.1.0`.
  - Add generic account type.

## [7.1.0]

### Changed

- Bump `@metamask/keyring-api` from `^19.0.0` to `^19.1.0` ([#323](https://github.com/MetaMask/accounts/pull/323))
  - Add generic account type.

## [7.0.0]

### Changed

- **BREAKING:** Bump `@metamask/keyring-api` from `^18.0.0` to `^19.0.0` ([#317](https://github.com/MetaMask/accounts/pull/317))
  - The `KeyringAccount.options` field is now partially typed.

## [6.2.0]

### Added

- Add `KeyringVersion` enum ([#273](https://github.com/MetaMask/accounts/pull/273))
- Add `KeyringRequestV1*` types ([#273](https://github.com/MetaMask/accounts/pull/273))
  - Those types can be used with Snaps that are still using older implementations of `submitRequest` (without `origin` support).

### Changed

- Bump `@metamask/keyring-api` from `^17.6.0` to `^18.0.0` ([#291](https://github.com/MetaMask/accounts/pull/291))

## [6.1.0]

### Added

- Add support for Bitcoin account type: p2pkh, p2sh, p2tr ([#284](https://github.com/MetaMask/accounts/pull/284))
- Bump `@metamask/keyring-api` from `^17.4.0` to `^17.6.0` ([#277](https://github.com/MetaMask/accounts/pull/277)), ([#288](https://github.com/MetaMask/accounts/pull/288))

## [6.0.1]

### Changed

- Bump `@metamask/keyring-api` from `^17.2.0` to `^17.4.0` ([#263](https://github.com/MetaMask/accounts/pull/263)), ([#269](https://github.com/MetaMask/accounts/pull/269))

## [6.0.0]

### Changed

- **BREAKING:** The method `EthKeyring.signTransaction` can now returns various type of transactions ([#209](https://github.com/MetaMask/accounts/pull/209)), ([#235](https://github.com/MetaMask/accounts/pull/235))
  - Initially was supporting: `Transaction | AccessListEIP2930Transaction | FeeMarketEIP1559Transaction` (types from `@ethereumjs/tx`).
  - Now also supports `BlobEIP4844Transaction | EOACodeEIP7702Transaction` (types from `@ethereumjs/tx`).
  - This new method signature is inherited by `Keyring` which is provided `@metamask/keyring-utils`.
- Bump `@metamask/keyring-utils` from `^2.3.1` to `^3.0.0` ([#235](https://github.com/MetaMask/accounts/pull/235))

## [5.0.0]

### Changed

- **BREAKING:** `EthKeyring` now extends the `Keyring` type from `@metamask/keyring-utils` instead of `Keyring<Json>` from `@metamask/utils` ([#226](https://github.com/MetaMask/accounts/pull/226))

## [4.0.3]

### Changed

- Bump `@metamask/keyring-api` from `^17.0.0` to `^17.2.0` ([#212](https://github.com/MetaMask/accounts/pull/212)), ([#220](https://github.com/MetaMask/accounts/pull/220))
- Use `ts-bridge/cli@0.6.3` ([#214](https://github.com/MetaMask/accounts/pull/214))
  - This new version fixes a bug regarding some missing exports.

## [4.0.2]

### Changed

- Bump `@metamask/keyring-api` from `^16.1.0` to `^17.0.0` ([#192](https://github.com/MetaMask/accounts/pull/192))

## [4.0.1]

### Changed

- Bump `@metamask/keyring-api` from `^16.0.0` to `^16.1.0` ([#176](https://github.com/MetaMask/accounts/pull/176))

## [4.0.0]

### Changed

- **BREAKING:** Bump `@metamask/keyring-api` from `^15.0.0` to `^16.0.0` ([#172](https://github.com/MetaMask/accounts/pull/172))
  - The `scopes` from each `*AccountStruct` types is now more strict (remove support of CAIP-2 namespaces) which impact all `Internal*AccountStruct` types.
- Bump `@metamask/utils` from `^11.0.1` to `^11.1.0` ([#167](https://github.com/MetaMask/accounts/pull/167))

## [3.0.0]

### Changed

- **BREAKING:** Bump `@metamask/keyring-api` from `^14.0.0` to `^15.0.0` ([#160](https://github.com/MetaMask/accounts/pull/160))
  - The `scopes` from each `*AccountStruct` types is now more strict which impact all `Internal*AccountStruct` types.

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

[Unreleased]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-internal-api@8.1.0...HEAD
[8.1.0]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-internal-api@8.0.0...@metamask/keyring-internal-api@8.1.0
[8.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-internal-api@7.1.0...@metamask/keyring-internal-api@8.0.0
[7.1.0]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-internal-api@7.0.0...@metamask/keyring-internal-api@7.1.0
[7.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-internal-api@6.2.0...@metamask/keyring-internal-api@7.0.0
[6.2.0]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-internal-api@6.1.0...@metamask/keyring-internal-api@6.2.0
[6.1.0]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-internal-api@6.0.1...@metamask/keyring-internal-api@6.1.0
[6.0.1]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-internal-api@6.0.0...@metamask/keyring-internal-api@6.0.1
[6.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-internal-api@5.0.0...@metamask/keyring-internal-api@6.0.0
[5.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-internal-api@4.0.3...@metamask/keyring-internal-api@5.0.0
[4.0.3]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-internal-api@4.0.2...@metamask/keyring-internal-api@4.0.3
[4.0.2]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-internal-api@4.0.1...@metamask/keyring-internal-api@4.0.2
[4.0.1]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-internal-api@4.0.0...@metamask/keyring-internal-api@4.0.1
[4.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-internal-api@3.0.0...@metamask/keyring-internal-api@4.0.0
[3.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-internal-api@2.0.1...@metamask/keyring-internal-api@3.0.0
[2.0.1]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-internal-api@2.0.0...@metamask/keyring-internal-api@2.0.1
[2.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-internal-api@1.1.0...@metamask/keyring-internal-api@2.0.0
[1.1.0]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-internal-api@1.0.0...@metamask/keyring-internal-api@1.1.0
[1.0.0]: https://github.com/MetaMask/accounts/releases/tag/@metamask/keyring-internal-api@1.0.0
