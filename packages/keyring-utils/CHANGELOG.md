# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.1.0]

### Added

- Add `superstruct.type` support for `exactOptional` ([#316](https://github.com/MetaMask/accounts/pull/316))

### Changed

- Now supports `unknown[]` array for `Keyring.signTypedData` ([#224](https://github.com/MetaMask/accounts/pull/224))

## [3.0.0]

### Changed

- **BREAKING:** The method `signTransaction` can now returns various type of transactions ([#209](https://github.com/MetaMask/accounts/pull/209))
  - Initially was supporting: `Transaction | AccessListEIP2930Transaction | FeeMarketEIP1559Transaction` (types from `@ethereumjs/tx`).
  - Now also supports `BlobEIP4844Transaction | EOACodeEIP7702Transaction` (types from `@ethereumjs/tx`).
- **BREAKING:** Bump `@ethereumjs/tx` from `^4.2.0` to `^5.4.0` ([#209](https://github.com/MetaMask/accounts/pull/209))

## [2.3.1]

### Changed

- Export `isScope{Equal,EqualToAny}` helpers ([#227](https://github.com/MetaMask/accounts/pull/227))

## [2.3.0]

### Added

- Add `isScopeEqual` and `isScopeEqualToAny` helpers ([#222](https://github.com/MetaMask/accounts/pull/222))

## [2.2.0]

### Added

- Add `AccountId` type ([#211](https://github.com/MetaMask/accounts/pull/211))

## [2.1.2]

### Changed

- Use `ts-bridge/cli@0.6.3` ([#214](https://github.com/MetaMask/accounts/pull/214))
  - This new version fixes a bug regarding some missing exports.

## [2.1.1]

### Fixed

- Export `Keyring` and `KeyringClass` types from package root ([#208](https://github.com/MetaMask/accounts/pull/208))

## [2.1.0]

### Added

- Add `Keyring` and `KeyringClass` types ([#201](https://github.com/MetaMask/accounts/pull/201)), ([#205](https://github.com/MetaMask/accounts/pull/205))
  - The two types have been migrated from `@metamask/utils`.
  - The `State` generic accepted by the two types was removed, and the `deserialize` and `serialize` signatures were updated to use `Json` instead of `State` as argument and return types.

## [2.0.0]

### Changed

- **BREAKING:** Remove `definePattern` ([#173](https://github.com/MetaMask/accounts/pull/173))
  - Has been moved to `@metamask/utils@11.1.0`.

## [1.3.1]

### Changed

- Bump `@metamask/utils` from `^11.0.1` to `^11.1.0` ([#167](https://github.com/MetaMask/accounts/pull/167))

## [1.3.0]

### Added

- Add `AccountIdStruct` alias ([#154](https://github.com/MetaMask/accounts/pull/154))

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

[Unreleased]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-utils@3.1.0...HEAD
[3.1.0]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-utils@3.0.0...@metamask/keyring-utils@3.1.0
[3.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-utils@2.3.1...@metamask/keyring-utils@3.0.0
[2.3.1]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-utils@2.3.0...@metamask/keyring-utils@2.3.1
[2.3.0]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-utils@2.2.0...@metamask/keyring-utils@2.3.0
[2.2.0]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-utils@2.1.2...@metamask/keyring-utils@2.2.0
[2.1.2]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-utils@2.1.1...@metamask/keyring-utils@2.1.2
[2.1.1]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-utils@2.1.0...@metamask/keyring-utils@2.1.1
[2.1.0]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-utils@2.0.0...@metamask/keyring-utils@2.1.0
[2.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-utils@1.3.1...@metamask/keyring-utils@2.0.0
[1.3.1]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-utils@1.3.0...@metamask/keyring-utils@1.3.1
[1.3.0]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-utils@1.2.0...@metamask/keyring-utils@1.3.0
[1.2.0]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-utils@1.1.0...@metamask/keyring-utils@1.2.0
[1.1.0]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-utils@1.0.0...@metamask/keyring-utils@1.1.0
[1.0.0]: https://github.com/MetaMask/accounts/releases/tag/@metamask/keyring-utils@1.0.0
