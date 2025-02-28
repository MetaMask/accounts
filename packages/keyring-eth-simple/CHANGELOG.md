# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [9.0.1]

### Changed

- Bump `@ethereumjs/util` from `^8.1.0` to `^9.1.0` ([#209](https://github.com/MetaMask/accounts/pull/209))

## [9.0.0]

### Changed

- **BREAKING:** The `SimpleKeyring` class now implements `Keyring` from `@metamask/keyring-utils` ([#217](https://github.com/MetaMask/accounts/pull/217))
  - The `deserialize` method now requires a `string[]` argument.

## [8.1.1]

### Changed

- Use `ts-bridge/cli@0.6.3` ([#214](https://github.com/MetaMask/accounts/pull/214))
  - This new version fixes a bug regarding some missing exports.

## [8.1.0]

### Added

- Add `signEip7702Authorization` method ([#182](https://github.com/MetaMask/accounts/pull/182))

### Changed

- Bump `@metamask/eth-sig-util` dependency from `^8.0.0` to `8.2.0` ([#177](https://github.com/MetaMask/accounts/pull/177)), ([#134](https://github.com/MetaMask/accounts/pull/134))
- Bump `@metamask/utils` dependency from `^9.3.1` to `11.1.0` ([#134](https://github.com/MetaMask/accounts/pull/134)), ([#167](https://github.com/MetaMask/accounts/pull/167))

## [8.0.1]

### Changed

- Use `ts-bridge/cli@0.6.1` ([#118](https://github.com/MetaMask/accounts/pull/118))
  - This new version fixes a bug with CJS re-exports.

## [8.0.0]

### Added

- **BREAKING:** Add ESM build ([#40](https://github.com/MetaMask/accounts/pull/40))
  - It's no longer possible to import files from `./dist` directly.

## [7.0.0]

### Changed

- **BREAKING**: Bump `@metamask/eth-sig-util` dependency from `^7.0.3` to `^8.0.0` ([#79](https://github.com/MetaMask/accounts/pull/79))
  - `signTypedData` no longer support `number` for addresses, see [here](https://github.com/MetaMask/eth-sig-util/blob/main/CHANGELOG.md#800).
- Use TypeScript 5 ([#55](https://github.com/MetaMask/accounts/pull/55))

## [6.0.5]

### Changed

- Bump `sinon` and `@types/sinon` to latest versions ([#51](https://github.com/MetaMask/accounts/pull/51))
- Add `syncpack` and sync dependencies ([#53](https://github.com/metamask/accounts/pull/53))

## [6.0.4]

### Changed

- Bump `@metamask/*` and `@lavamoat/*` dependencies ([#46](https://github.com/MetaMask/accounts/pull/46))
- Move `deepmerge` to `devDependencies` ([#44](https://github.com/MetaMask/accounts/pull/44))

## [6.0.3]

### Changed

- Convert to monorepo
  - Package name does not change (`@metamask/eth-simple-keyring`) and sources have been moved to: `packages/keyring-eth-simple`.
  - You can find all the changes [here](https://github.com/MetaMask/accounts/compare/6da58b4...38794aa).

## [6.0.2]

### Changed

- Bump `@metamask/utils` from `^8.1.0` to `^9.0.0` ([#177](https://github.com/MetaMask/eth-simple-keyring/pull/177))

## [6.0.1]

### Fixed

- Treat `undefined` and `null` as empty array in deserialize function ([#163](https://github.com/MetaMask/eth-simple-keyring/pull/163))

## [6.0.0]

### Changed

- **BREAKING**: Increase minimum Node.js version to 16 ([#152](https://github.com/MetaMask/eth-simple-keyring/pull/152))
- **BREAKING**: Bump @metamask/eth-sig-util from ^6.0.1 to ^7.0.0 ([#156](https://github.com/MetaMask/eth-simple-keyring/pull/156))
- Bump @metamask/utils from ^5.0.0 to ^8.1.0 ([#153](https://github.com/MetaMask/eth-simple-keyring/pull/153))
- Bump ethereum-cryptography from ^1.2.0 to ^2.1.2 ([#153](https://github.com/MetaMask/eth-simple-keyring/pull/153))

## [5.1.1]

### Fixed

- Treat `undefined` and `null` as empty array in deserialize function ([#166](https://github.com/MetaMask/eth-simple-keyring/pull/166))

## [5.1.0]

### Changed

- Export TypeScript interfaces ([#140](https://github.com/MetaMask/eth-simple-keyring/pull/140))
- Update all dependencies ([#140](https://github.com/MetaMask/eth-simple-keyring/pull/140)) ([#149](https://github.com/MetaMask/eth-simple-keyring/pull/149))

### Fixed

- Add `validateMessage` option to `signMessage` to configure if runtime-validation should be done that input string is hex (default: `true`) ([#148](https://github.com/MetaMask/eth-simple-keyring/pull/148))

## [5.0.0]

### Changed

- **BREAKING:** Makes version-specific `signTypedData` methods private ([#84](https://github.com/MetaMask/eth-simple-keyring/pull/84))
  - Consumers should use the generic `signTypedData` method and pass the version they'd like as a property in the options argument.
- **BREAKING:** Makes the `wallets` property private ([#87](https://github.com/MetaMask/eth-simple-keyring/pull/87))
  - Consumers should not use this property as it is intended for internal use only.
- **BREAKING:** Makes `getPrivateKeyFor` a private method ([#83](https://github.com/MetaMask/eth-simple-keyring/pull/83))
  - Consumers who wish to get the private key for a given account should use the `exportAccount` method.
- **BREAKING:** Set the minimum Node.js version to 14 ([#68](https://github.com/MetaMask/eth-simple-keyring/pull/68)) ([#109](https://github.com/MetaMask/eth-simple-keyring/pull/109))
- Always return rejected Promise upon failure ([#85](https://github.com/MetaMask/eth-simple-keyring/pull/85))

### Removed

- **BREAKING:** Remove redundant `newGethSignMessage` method ([#72](https://github.com/MetaMask/eth-simple-keyring/pull/72))
  - Consumers can use `signPersonalMessage` method as a replacement for `newGethSignMessage`.

[Unreleased]: https://github.com/MetaMask/accounts/compare/@metamask/eth-simple-keyring@9.0.1...HEAD
[9.0.1]: https://github.com/MetaMask/accounts/compare/@metamask/eth-simple-keyring@9.0.0...@metamask/eth-simple-keyring@9.0.1
[9.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/eth-simple-keyring@8.1.1...@metamask/eth-simple-keyring@9.0.0
[8.1.1]: https://github.com/MetaMask/accounts/compare/@metamask/eth-simple-keyring@8.1.0...@metamask/eth-simple-keyring@8.1.1
[8.1.0]: https://github.com/MetaMask/accounts/compare/@metamask/eth-simple-keyring@8.0.1...@metamask/eth-simple-keyring@8.1.0
[8.0.1]: https://github.com/MetaMask/accounts/compare/@metamask/eth-simple-keyring@8.0.0...@metamask/eth-simple-keyring@8.0.1
[8.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/eth-simple-keyring@7.0.0...@metamask/eth-simple-keyring@8.0.0
[7.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/eth-simple-keyring@6.0.5...@metamask/eth-simple-keyring@7.0.0
[6.0.5]: https://github.com/MetaMask/accounts/compare/@metamask/eth-simple-keyring@6.0.4...@metamask/eth-simple-keyring@6.0.5
[6.0.4]: https://github.com/MetaMask/accounts/compare/@metamask/eth-simple-keyring@6.0.3...@metamask/eth-simple-keyring@6.0.4
[6.0.3]: https://github.com/MetaMask/accounts/compare/@metamask/eth-simple-keyring@6.0.2...@metamask/eth-simple-keyring@6.0.3
[6.0.2]: https://github.com/MetaMask/accounts/compare/@metamask/eth-simple-keyring@6.0.1...@metamask/eth-simple-keyring@6.0.2
[6.0.1]: https://github.com/MetaMask/accounts/compare/@metamask/eth-simple-keyring@6.0.0...@metamask/eth-simple-keyring@6.0.1
[6.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/eth-simple-keyring@5.1.1...@metamask/eth-simple-keyring@6.0.0
[5.1.1]: https://github.com/MetaMask/accounts/compare/@metamask/eth-simple-keyring@5.1.0...@metamask/eth-simple-keyring@5.1.1
[5.1.0]: https://github.com/MetaMask/accounts/compare/@metamask/eth-simple-keyring@5.0.0...@metamask/eth-simple-keyring@5.1.0
[5.0.0]: https://github.com/MetaMask/accounts/releases/tag/@metamask/eth-simple-keyring@5.0.0
