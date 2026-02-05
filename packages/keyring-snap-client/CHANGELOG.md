# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [8.2.0]

### Added

- Add `KeyringClient.createAccounts` method ([#448](https://github.com/MetaMask/accounts/pull/448))
  - This method can be used to create one or more accounts using the new keyring v2 account creation typed options.

## [8.1.1]

### Changed

- Bump `@metamask/keyring-api` from `^21.1.0` to `^21.2.0` ([#395](https://github.com/MetaMask/accounts/pull/395))

## [8.1.0]

### Added

- Add `KeyringClient.setSelectedAccounts` method ([#387](https://github.com/MetaMask/accounts/pull/387))
  - This method can be invoked by the MetaMask client to inform which accounts are now selected for this Snap.

### Changed

- Bump `@metamask/keyring-api` from `^21.0.0` to `^21.1.0` ([#388](https://github.com/MetaMask/accounts/pull/388))

## [8.0.0]

### Changed

- **BREAKING:** Bump `@metamask/keyring-api` from `^20.0.0` to `^21.0.0` ([#355](https://github.com/MetaMask/accounts/pull/355)), ([#356](https://github.com/MetaMask/accounts/pull/356))

## [7.0.0]

### Changed

- **BREAKING:** Bump `@metamask/keyring-api` from `^19.0.0` to `^20.0.0` ([#347](https://github.com/MetaMask/accounts/pull/347))
  - Add generic account type.

## [6.0.0]

### Changed

- **BREAKING:** Bump `@metamask/keyring-api` from `^18.0.0` to `^19.0.0` ([#317](https://github.com/MetaMask/accounts/pull/317))
  - The `KeyringAccount.options` field is now partially typed.

## [5.0.0]

### Added

- Add `KeyringPublicClient` ([#273](https://github.com/MetaMask/accounts/pull/273))
  - This is the new public version of a `KeyringClient` that can be used by companion dapp.
  - The `submitRequest` method is not available for this client.

### Changed

- **BREAKING:** `KeyringSnapRpcClient` now extends `KeyringPublicClient` instead of `KeyringClient`
  - The `submitRequest` method is not available for this client.
- Bump `@metamask/keyring-api` from `^17.4.0` to `^18.0.0` ([#277](https://github.com/MetaMask/accounts/pull/277)), ([#288](https://github.com/MetaMask/accounts/pull/288)), ([#291](https://github.com/MetaMask/accounts/pull/291))

## [4.1.0]

### Added

- Add `discoverAccounts` keyring method ([#266](https://github.com/MetaMask/accounts/pull/266))

### Changed

- Bump `@metamask/keyring-api` from `^17.2.0` to `^17.4.0` ([#263](https://github.com/MetaMask/accounts/pull/263)), ([#269](https://github.com/MetaMask/accounts/pull/269))

## [4.0.1]

### Changed

- Bump `@metamask/keyring-api` from `^17.0.0` to `^17.2.0` ([#212](https://github.com/MetaMask/accounts/pull/212)), ([#220](https://github.com/MetaMask/accounts/pull/220))
- Use `ts-bridge/cli@0.6.3` ([#214](https://github.com/MetaMask/accounts/pull/214))
  - This new version fixes a bug regarding some missing exports.

## [4.0.0]

### Changed

- **BREAKING:** Use `CaipAccountId` for `ResolvedAccountAddress.address` ([#186](https://github.com/MetaMask/accounts/pull/186))
  - This was missing from SIP-26, but we expect this address to be CAIP-10 compliant.
- **BREAKING:** Bump `@metamask/providers` peer dependency from `^18.3.1` to `^19.0.0` ([#177](https://github.com/MetaMask/accounts/pull/177))
- Bump `@metamask/keyring-api` from `^16.1.0` to `^17.0.0` ([#192](https://github.com/MetaMask/accounts/pull/192))

## [3.0.3]

### Changed

- Bump `@metamask/keyring-api` from `^16.0.0` to `^16.1.0` ([#176](https://github.com/MetaMask/accounts/pull/176))

## [3.0.2]

### Changed

- Bump `@metamask/keyring-api` from `^15.0.0` to `^16.0.0` ([#172](https://github.com/MetaMask/accounts/pull/172))
- Bump `@metamask/utils` from `^11.0.1` to `^11.1.0` ([#167](https://github.com/MetaMask/accounts/pull/167))

## [3.0.1]

### Changed

- Bump `@metamask/keyring-api` from `^14.0.0` to `^15.0.0` ([#160](https://github.com/MetaMask/accounts/pull/160))

## [3.0.0]

### Added

- Add `listAccountAssets` keyring method ([#148](https://github.com/MetaMask/accounts/pull/148))

### Changed

- **BREAKING:** Bump `@metamask/keyring-api` from `^13.0.0` to `^14.0.0` ([#155](https://github.com/MetaMask/accounts/pull/155))
  - The `CaipAssetType` is now more restrictive which affects the existing `getAccountBalances` method.

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

[Unreleased]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-snap-client@8.2.0...HEAD
[8.2.0]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-snap-client@8.1.1...@metamask/keyring-snap-client@8.2.0
[8.1.1]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-snap-client@8.1.0...@metamask/keyring-snap-client@8.1.1
[8.1.0]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-snap-client@8.0.0...@metamask/keyring-snap-client@8.1.0
[8.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-snap-client@7.0.0...@metamask/keyring-snap-client@8.0.0
[7.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-snap-client@6.0.0...@metamask/keyring-snap-client@7.0.0
[6.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-snap-client@5.0.0...@metamask/keyring-snap-client@6.0.0
[5.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-snap-client@4.1.0...@metamask/keyring-snap-client@5.0.0
[4.1.0]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-snap-client@4.0.1...@metamask/keyring-snap-client@4.1.0
[4.0.1]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-snap-client@4.0.0...@metamask/keyring-snap-client@4.0.1
[4.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-snap-client@3.0.3...@metamask/keyring-snap-client@4.0.0
[3.0.3]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-snap-client@3.0.2...@metamask/keyring-snap-client@3.0.3
[3.0.2]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-snap-client@3.0.1...@metamask/keyring-snap-client@3.0.2
[3.0.1]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-snap-client@3.0.0...@metamask/keyring-snap-client@3.0.1
[3.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-snap-client@2.0.0...@metamask/keyring-snap-client@3.0.0
[2.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-snap-client@1.1.0...@metamask/keyring-snap-client@2.0.0
[1.1.0]: https://github.com/MetaMask/accounts/compare/@metamask/keyring-snap-client@1.0.0...@metamask/keyring-snap-client@1.1.0
[1.0.0]: https://github.com/MetaMask/accounts/releases/tag/@metamask/keyring-snap-client@1.0.0
