# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.0.1]

### Changed

- Bump `@metamask/keyring-api` from `^23.0.0` to `^23.0.1` ([#518](https://github.com/MetaMask/accounts/pull/518))

### Fixed

- Workaround Browserify subpath export for `/v2` ([#516](https://github.com/MetaMask/accounts/pull/516))

## [2.0.0]

### Added

- Add `./v2` subpath export for keyring v2 building blocks ([#513](https://github.com/MetaMask/accounts/pull/513))
  - `KeyringWrapper`, `EthKeyringWrapper`, `EthKeyringMethod`, and `EthKeyringWrapperOptions` are now available from `@metamask/keyring-sdk/v2`.

### Changed

- **BREAKING:** Move `KeyringWrapper` and `EthKeyringWrapper` (and related types) to the new `./v2` subpath export ([#513](https://github.com/MetaMask/accounts/pull/513))
  - Use `import { KeyringWrapper, EthKeyringWrapper, EthKeyringMethod } from '@metamask/keyring-sdk/v2'` instead.
  - `KeyringAccountRegistry`, `encodeMnemonic`, and `generateEthAccountId` remain available from the main entry point.
- Bump `@metamask/utils` from `^11.10.0` to `^11.11.0` ([#483](https://github.com/MetaMask/accounts/pull/483))
- Bump `@metamask/keyring-api` from `^22.0.0` to `^23.0.0` ([#515](https://github.com/MetaMask/accounts/pull/515))

## [1.2.0]

### Added

- Add `generateId` option to `KeyringAccountRegistry` ([#503](https://github.com/MetaMask/accounts/pull/503))
- Add `generateEthAccountId` to generate deterministic account IDs for EVM addresses, and use it by default in `EthKeyringWrapper` ([#504](https://github.com/MetaMask/accounts/pull/504))

## [1.1.0]

### Added

- Add `encodeMnemonic` ([#495](https://github.com/MetaMask/accounts/pull/495))

### Changed

- Bump `@metamask/utils` from `^11.1.0` to `^11.10.0` ([#489](https://github.com/MetaMask/accounts/pull/489))

## [1.0.0]

### Added

- Initial release, extracted from `@metamask/keyring-api` ([#478](https://github.com/MetaMask/accounts/pull/478)), ([#482](https://github.com/MetaMask/accounts/pull/482))

[Unreleased]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-sdk@2.0.1...HEAD
[2.0.1]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-sdk@2.0.0...@metamask/keyring-sdk@2.0.1
[2.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-sdk@1.2.0...@metamask/keyring-sdk@2.0.0
[1.2.0]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-sdk@1.1.0...@metamask/keyring-sdk@1.2.0
[1.1.0]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-sdk@1.0.0...@metamask/keyring-sdk@1.1.0
[1.0.0]: https://github.com/MetaMask/accounts/releases/tag/@metamask/keyring-sdk@1.0.0
