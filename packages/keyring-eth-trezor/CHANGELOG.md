# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Add `TrezorKeyringV2` and `OneKeyKeyringV2` classes implementing `KeyringV2` interface ([#412](https://github.com/MetaMask/accounts/pull/412))
  - Wraps legacy `TrezorKeyring` and `OneKeyKeyring` to expose accounts via the unified `KeyringV2` API and the `KeyringAccount` type.
  - Extends `EthKeyringWrapper` for common Ethereum logic.

## [9.0.0]

### Changed

- Bump `@trezor/connect-web` to `^9.6.0` ([#241](https://github.com/MetaMask/accounts/pull/241)), ([#300](https://github.com/MetaMask/accounts/pull/300))
  - Require to enable new 7702 signing flows.
- **BREAKING:** The method signature for `signTypedData` has been changed ([#224](https://github.com/MetaMask/accounts/pull/224))
  - The `options` argument type has been changed to `{ version: SignTypedDataVersion.V3 | SignTypedDataVersion.V4 } | undefined`.
  - The `options.version` argument type has been restricted to accept `SignTypedDataVersion.V3 | SignTypedDataVersion.V4` ([#224](https://github.com/MetaMask/accounts/pull/224))

## [8.0.0]

### Changed

- **BREAKING:** The method `signTransaction` can now returns various type of transactions ([#209](https://github.com/MetaMask/accounts/pull/209))
  - Initially was supporting: `Transaction | AccessListEIP2930Transaction | FeeMarketEIP1559Transaction` (types from `@ethereumjs/tx`).
  - Now also supports `BlobEIP4844Transaction | EOACodeEIP7702Transaction` (types from `@ethereumjs/tx`).
- **BREAKING:** Bump `@ethereumjs/tx` from `^4.2.0` to `^5.4.0` ([#209](https://github.com/MetaMask/accounts/pull/209))
- **BREAKING:** Bump `@ethereumjs/util` from `^8.1.0` to `^9.1.0` ([#209](https://github.com/MetaMask/accounts/pull/209))

## [7.0.0]

### Changed

- **BREAKING:** `TrezorKeyring` now implements the `Keyring` type ([#194](https://github.com/MetaMask/accounts/pull/194))
  - The class does not extend `EventEmitter` anymore.
  - The `TrezorKeyring.accounts` class variable is now a `readonly Hex[]` array.
  - The `addAccounts` method signature has been changed:
    - An `amount` number parameter is now required to specify the number of accounts to add.
    - The method now returns a promise resolving to an array of `Hex` addresses.
  - The `deserialize` method now requires a `TrezorControllerOptions` object as a parameter.
  - The `unlock` method now returns `Promise<Hex>`.
  - The `getAccounts` method now returns `Promise<Hex[]>`.
  - The `signTransaction` method now accepts an `Hex` typed value as the `address` parameter.
  - The `signMessage` method now accepts an `Hex` typed value as the `withAccount` parameter.
  - The `signPersonalMessage` method now accepts an `Hex` typed value as the `withAccount` parameter.
  - The `signTypedData` method now accepts an `Hex` typed value as the `withAccount` parameter.
  - The `unlockAccountByAddress` method now accepts an `Hex` typed value as the `address` parameter.

### Removed

- **BREAKING:** The `exportAccount` method has been removed ([#194](https://github.com/MetaMask/accounts/pull/194))

## [6.1.1]

### Changed

- Use `ts-bridge/cli@0.6.3` ([#214](https://github.com/MetaMask/accounts/pull/214))
  - This new version fixes a bug regarding some missing exports.

## [6.1.0]

### Added

- Add new dedicated `OneKeyKeyring` keyring ([#175](https://github.com/MetaMask/accounts/pull/175))
  - This keyring is similar to the `TrezorKeyring` but will allow to distinguish both types of devices, the transport layer (bridge) remains the same.

## [6.0.2]

### Changed

- Bump `@metamask/eth-sig-util` dependency from `^8.0.0` to `8.2.0` ([#177](https://github.com/MetaMask/accounts/pull/177)), ([#134](https://github.com/MetaMask/accounts/pull/134))

## [6.0.1]

### Changed

- Use `ts-bridge/cli@0.6.1` ([#118](https://github.com/MetaMask/accounts/pull/118))
  - This new version fixes a bug with CJS re-exports.

## [6.0.0]

### Added

- **BREAKING:** Add ESM build ([#40](https://github.com/MetaMask/accounts/pull/40))
  - It's no longer possible to import files from `./dist` directly.

## [5.0.0]

### Changed

- **BREAKING**: Bump `@metamask/eth-sig-util` dependency from `^7.0.3` to `^8.0.0` ([#79](https://github.com/MetaMask/accounts/pull/79))
  - `signTypedData` no longer support `number` for addresses, see [here](https://github.com/MetaMask/eth-sig-util/blob/main/CHANGELOG.md#800).

## [4.0.0]

### Changed

- **BREAKING**: `addAccounts` will now only return newly created accounts ([#64](https://github.com/MetaMask/accounts/pull/64))
  - This keyring was initially returning every accounts (previous and new ones), which is different from what is expected in the [`Keyring` interface].(https://github.com/MetaMask/utils/blob/v9.2.1/src/keyring.ts#L65)

## [3.1.3]

### Changed

- Bump `sinon` and `@types/sinon` to latest versions ([#51](https://github.com/metamask/accounts/pull/51))
- Add `syncpack` and sync dependencies ([#53](https://github.com/metamask/accounts/pull/53))

## [3.1.2]

### Changed

- Bump `@metamask/*` and `@lavamoat/*` dependencies ([#46](https://github.com/MetaMask/accounts/pull/46))
- Move `deepmerge` and `jest-environment-jsdom` to `devDependencies` ([#44](https://github.com/MetaMask/accounts/pull/44))

## [3.1.1]

### Changed

- Convert to monorepo
  - Package name does not change (`@metamask/eth-trezor-keyring`) and sources have been moved to: `packages/keyring-eth-trezor`.
  - You can find all the changes [here](https://github.com/MetaMask/accounts/compare/6da58b4...38794aa).

## [3.1.0]

### Changed

- Bump `@trezor/connect-web` from `^9.0.6` to `^9.1.11` ([#195](https://github.com/MetaMask/eth-trezor-keyring/pull/195))

### Fixed

- Bump `@metamask/eth-sig-util` from `^7.0.0` to `^7.0.1` ([#195](https://github.com/MetaMask/eth-trezor-keyring/pull/195))
- Bump `@trezor/connect-plugin-ethereum` from `^9.0.1` to `^9.0.3` ([#195](https://github.com/MetaMask/eth-trezor-keyring/pull/195))
- Should help fixing MM pop-up closing issue ([#10896](https://github.com/MetaMask/metamask-extension/issues/10896))

## [3.0.0]

### Changed

- **BREAKING**: Remove support for major node versions 14,15,17,19. Minimum Node.js version is now 16. ([#188](https://github.com/MetaMask/eth-trezor-keyring/pull/188))
- Bump `@metamask/eth-sig-util` from `^5.0.2` to `^7.0.0` ([#189](https://github.com/MetaMask/eth-trezor-keyring/pull/189))
- Bump dependency `hdkey` from `0.8.0` to `^2.1.0` ([#190](https://github.com/MetaMask/eth-trezor-keyring/pull/190))

## [2.0.0]

### Added

- Add `destroy` method to `TrezorKeyring`, which replaces `dispose` ([#179](https://github.com/MetaMask/eth-trezor-keyring/pull/179))

### Changed

- **BREAKING:** Separate the bridge from the keyring ([#143](https://github.com/MetaMask/eth-trezor-keyring/pull/143))
  - The Trezor bridge is now a separate class (`TrezorConnectBridge`), which must be constructed separately from the keyring and passed in as a constructor argument.
  - The bridge initialization has been moved from the keyring constructor to the keyring `init` method. The bridge is expected to be passed to the keyring uninitialized, and the keyring `init` method is expected to be called after keyring construction (before the keyring is used).
  - The keyring constructor no longer accepts keyring state. Instead, any pre-existing keyring state should be passed to the `deserialize` method after construction.

### Removed

- **BREAKING:** Remove `dispose` method from `TrezorKeyring`, which is replaced by `destroy` ([#179](https://github.com/MetaMask/eth-trezor-keyring/pull/179))

## [1.1.0]

### Added

- Add legacy derivation path, allowing generation of accounts with the `m/44'/60'/0` path ([#175](https://github.com/MetaMask/eth-trezor-keyring/pull/175))

### Changed

- Migrate to TypeScript ([#161](https://github.com/MetaMask/eth-trezor-keyring/pull/161))

## [1.0.0]

### Changed

- **BREAKING:** Rename package to use `@metamask` scope ([#160](https://github.com/MetaMask/eth-trezor-keyring/pull/160))
- **BREAKING:** Removed support for Node v12 in favor of v14 ([#135](https://github.com/MetaMask/eth-trezor-keyring/pull/135))
- Update `@ethereumjs/util`, `@ethereumjs/tx`, `@metamask/eth-sig-util` to latest versions ([#146](https://github.com/MetaMask/eth-trezor-keyring/pull/146))
- Bump trezor-connect - now @trezor/connect-plugin-ethereum & @trezor/connect-web - to v9 ([#133](https://github.com/MetaMask/eth-trezor-keyring/pull/133), [#163](https://github.com/MetaMask/eth-trezor-keyring/pull/163))

## [0.10.0]

### Added

- Support for EIP-721 signTypedData_v4 ([#117](https://github.com/MetaMask/eth-trezor-keyring/pull/117))

## [0.9.1]

### Changed

- Update trezor connect to 8.2.3, so that 1.10.4 of the Model One firmware is supported ([#115](https://github.com/MetaMask/eth-trezor-keyring/pull/115))

## [0.9.0]

### Added

- Add dispose method, which exposes the TrezorConnect.dispose method, allowing consumers to explictly remove the Trezor Connect iframe ([#113](https://github.com/MetaMask/eth-trezor-keyring/pull/13))

### Fixed

- Fixed the signing of contract creation transactions, which require a nullish (empty string or undefined) `to` parameter ([#112](https://github.com/MetaMask/eth-trezor-keyring/pull/112))

## [0.8.0]

### Added

- Support for EIP-1559 transactions for the Model T ([#108](https://github.com/MetaMask/eth-trezor-keyring/pull/108))
- Add setHdPath method, which allows setting the HD path used by the keyring to known, supported HD paths ([#107](https://github.com/MetaMask/eth-trezor-keyring/pull/107))

## [0.7.0]

### Added

- Support new versions of ethereumjs/tx ([#88](https://github.com/metamask/eth-trezor-keyring/pull/88))

[Unreleased]: https://github.com/MetaMask/accounts/compare/@metamask/eth-trezor-keyring@9.0.0...HEAD
[9.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/eth-trezor-keyring@8.0.0...@metamask/eth-trezor-keyring@9.0.0
[8.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/eth-trezor-keyring@7.0.0...@metamask/eth-trezor-keyring@8.0.0
[7.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/eth-trezor-keyring@6.1.1...@metamask/eth-trezor-keyring@7.0.0
[6.1.1]: https://github.com/MetaMask/accounts/compare/@metamask/eth-trezor-keyring@6.1.0...@metamask/eth-trezor-keyring@6.1.1
[6.1.0]: https://github.com/MetaMask/accounts/compare/@metamask/eth-trezor-keyring@6.0.2...@metamask/eth-trezor-keyring@6.1.0
[6.0.2]: https://github.com/MetaMask/accounts/compare/@metamask/eth-trezor-keyring@6.0.1...@metamask/eth-trezor-keyring@6.0.2
[6.0.1]: https://github.com/MetaMask/accounts/compare/@metamask/eth-trezor-keyring@6.0.0...@metamask/eth-trezor-keyring@6.0.1
[6.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/eth-trezor-keyring@5.0.0...@metamask/eth-trezor-keyring@6.0.0
[5.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/eth-trezor-keyring@4.0.0...@metamask/eth-trezor-keyring@5.0.0
[4.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/eth-trezor-keyring@3.1.3...@metamask/eth-trezor-keyring@4.0.0
[3.1.3]: https://github.com/MetaMask/accounts/compare/@metamask/eth-trezor-keyring@3.1.2...@metamask/eth-trezor-keyring@3.1.3
[3.1.2]: https://github.com/MetaMask/accounts/compare/@metamask/eth-trezor-keyring@3.1.1...@metamask/eth-trezor-keyring@3.1.2
[3.1.1]: https://github.com/MetaMask/accounts/compare/@metamask/eth-trezor-keyring@3.1.0...@metamask/eth-trezor-keyring@3.1.1
[3.1.0]: https://github.com/MetaMask/accounts/compare/@metamask/eth-trezor-keyring@3.0.0...@metamask/eth-trezor-keyring@3.1.0
[3.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/eth-trezor-keyring@2.0.0...@metamask/eth-trezor-keyring@3.0.0
[2.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/eth-trezor-keyring@1.1.0...@metamask/eth-trezor-keyring@2.0.0
[1.1.0]: https://github.com/MetaMask/accounts/compare/@metamask/eth-trezor-keyring@1.0.0...@metamask/eth-trezor-keyring@1.1.0
[1.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/eth-trezor-keyring@0.10.0...@metamask/eth-trezor-keyring@1.0.0
[0.10.0]: https://github.com/MetaMask/accounts/compare/@metamask/eth-trezor-keyring@0.9.1...@metamask/eth-trezor-keyring@0.10.0
[0.9.1]: https://github.com/MetaMask/accounts/compare/@metamask/eth-trezor-keyring@0.9.0...@metamask/eth-trezor-keyring@0.9.1
[0.9.0]: https://github.com/MetaMask/accounts/compare/@metamask/eth-trezor-keyring@0.8.0...@metamask/eth-trezor-keyring@0.9.0
[0.8.0]: https://github.com/MetaMask/accounts/compare/@metamask/eth-trezor-keyring@0.7.0...@metamask/eth-trezor-keyring@0.8.0
[0.7.0]: https://github.com/MetaMask/accounts/releases/tag/@metamask/eth-trezor-keyring@0.7.0
