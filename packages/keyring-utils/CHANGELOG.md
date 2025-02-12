# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.1.0]

### Uncategorized

- fix: `Keyring.serialize` and `Keyring.deserialize` types ([#205](https://github.com/MetaMask/accounts/pull/205))
- feat: add `Keyring` type from `@metamask/utils` ([#201](https://github.com/MetaMask/accounts/pull/201))

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

[Unreleased]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-utils@2.1.0...HEAD
[2.1.0]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-utils@2.0.0...@metamask/keyring-utils@2.1.0
[2.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-utils@1.3.1...@metamask/keyring-utils@2.0.0
[1.3.1]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-utils@1.3.0...@metamask/keyring-utils@1.3.1
[1.3.0]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-utils@1.2.0...@metamask/keyring-utils@1.3.0
[1.2.0]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-utils@1.1.0...@metamask/keyring-utils@1.2.0
[1.1.0]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-utils@1.0.0...@metamask/keyring-utils@1.1.0
[1.0.0]: https://github.com/MetaMask/accounts/releases/tag/@metamask/keyring-utils@1.0.0
