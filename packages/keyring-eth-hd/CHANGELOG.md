# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Uncategorized

- refactor!: remove CAIP redefinitions ([#167](https://github.com/MetaMask/accounts/pull/167))
- Bump MetaMask dependencies ([#134](https://github.com/MetaMask/accounts/pull/134))

## [9.0.1]

### Changed

- Use `ts-bridge/cli@0.6.1` ([#118](https://github.com/MetaMask/accounts/pull/118))
  - This new version fixes a bug with CJS re-exports.

## [9.0.0]

### Changed

- **BREAKING**: Move seed generation to deserialization ([#100](https://github.com/MetaMask/accounts/pull/100))
  - Using the constructor directly no longer generates the seed required for account derivation.
  - Both `serialize` and `deserialize` are now proper `async` methods.
- Allow passing native custom cryptographic functions ([#102](https://github.com/MetaMask/accounts/pull/102))
  - The seed generation is now relying `@metamask/key-tree` package (instead of `@metamask/scure-bip39`).
  - The `constructor` now allows a new option `cryptographicFunctions` which allows the use of custom cryptographic functions during seed generation.

## [8.0.0]

### Changed

- **BREAKING**: Bump `@metamask/eth-sig-util` dependency from `^7.0.3` to `^8.0.0` ([#79](https://github.com/MetaMask/accounts/pull/79))
  - `signTypedData` no longer support `number` for addresses, see [here](https://github.com/MetaMask/eth-sig-util/blob/main/CHANGELOG.md#800).

## [7.0.4]

### Changed

- Bump `sinon` and `@types/sinon` to latest versions ([#51](https://github.com/MetaMask/accounts/pull/51))
- Add `syncpack` and sync dependencies ([#53](https://github.com/metamask/accounts/pull/53))

## [7.0.3]

### Changed

- Bump `@metamask/*` and `@lavamoat/*` dependencies ([#46](https://github.com/MetaMask/accounts/pull/46))
- Move `deepmerge` to `devDependencies` ([#44](https://github.com/MetaMask/accounts/pull/44))

## [7.0.2]

### Changed

- Convert to monorepo
  - Package name does not change (`@metamask/eth-hd-keyring`) and sources have been moved to: `packages/keyring-eth-hd`.
  - You can find all the changes [here](https://github.com/MetaMask/accounts/compare/6da58b4...38794aa).

## [7.0.1]

### Changed

- **BREAKING:** Update minimum Node.js version from v14 to v16 ([#98](https://github.com/MetaMask/eth-hd-keyring/pull/98))
- Bump dependencies ([#99](https://github.com/MetaMask/eth-hd-keyring/pull/99))
  - **BREAKING:** `@metamask/eth-sig-util` from `^6.0.0` to `^7.0.0`
  - **BREAKING:** `@metamask/utils` from `^5.0.2` to `^8.1.0`
  - `@ethereumjs/tx` from `^4.1.1` to `^4.2.0`
  - `@ethereumjs/util` from `8.0.5` to `^8.1.0`
  - `ethereum-cryptography` from `^1.2.0` to `^2.1.2`

## [7.0.0] [RETRACTED]

### Changed

- This version was retracted due to a bug causing code to be missing from published package.

## [6.0.2]

### Fixed

- Bump dependencies ([#94](https://github.com/MetaMask/eth-hd-keyring/pull/94))
  - `@ethereumjs/util` from `^8.0.2` to `^8.1.0`
  - `@metamask/eth-sig-util` from `^5.0.2` to `^6.0.0`
  - `@metamask/scure-bip39` from `^2.0.3` to `^2.1.0`
  - `@metamask/utils` from `^5.0.0` to `^5.0.2`
  - `ethereum-cryptography` from `^1.1.2` to `^1.2.0`

## [6.0.1] [RETRACTED]

### Changed

- This version was retracted due to a bug causing code to be missing from published package.

## [6.0.0]

### Changed

- Revert mnemonic serialization format from `Record<number, number>` (i.e. a stringified `Uint8Array`) which was introduced in v5.0.0 back to an untyped array of utf8 encoded bytes, which was the format prior to v5.0.0 ([#81](https://github.com/MetaMask/eth-hd-keyring/pull/81))

## [5.0.1] [DEPRECATED]

### Removed

- Remove prepack script and references in order to fix publish release flow ([#77](https://github.com/MetaMask/eth-hd-keyring/pull/77))

## [5.0.0] [DEPRECATED]

### Changed

- **BREAKING**: Update minimum Node.js version from v12 to v14 ([#67](https://github.com/MetaMask/eth-hd-keyring/pull/67))
- **BREAKING:** Makes version-specific `signTypedData` methods private ([#71](https://github.com/MetaMask/eth-hd-keyring/pull/71))
  - Consumers should use the generic `signTypedData` method and pass the version they'd like as a property in the options argument.
- **BREAKING:** Makes the `wallets` property private ([#71](https://github.com/MetaMask/eth-hd-keyring/pull/71))
  - Consumers should not use this property as it is intended for internal use only.
- **BREAKING:** Makes `getPrivateKeyFor` a private method ([#71](https://github.com/MetaMask/eth-hd-keyring/pull/71))
  - Consumers who wish to get the private key for a given account should use the `exportAccount` method.
- **BREAKING:** Bumps browser requirements to those with ES2020 support or greater ([#70](https://github.com/MetaMask/eth-hd-keyring/pull/70))
  - This change is introduced in update of `@metamask/eth-sig-util` to v5 and new direct dependency on `ethereumjs/util` v8.0.2
- Replaces use of `ethereumjs-wallet` implementation of hdkey with one from `ethereum-cryptography` and adapts accordingly. ([#69](https://github.com/MetaMask/eth-hd-keyring/pull/69))
- Replaces `@metamask/bip39` with `@metamask/scure-bip39` ([#67](https://github.com/MetaMask/eth-hd-keyring/pull/67))

### Removed

- **BREAKING:** Remove redundant `newGethSignMessage` method ([#71](https://github.com/MetaMask/eth-hd-keyring/pull/71))
  - Consumers can use `signPersonalMessage` method as a replacement for newGethSignMessage.
- **BREAKING:** `HDKeyring` no longer extends `EventEmitter`, so no `EventEmitter` methods are available on this class ([#70](https://github.com/MetaMask/eth-hd-keyring/pull/70))
- Removes `ethereumjs-util` dependency. ([#67](https://github.com/MetaMask/eth-hd-keyring/pull/67))

## [4.0.2]

### Added

- Add parameter validation for constructor / `deserialize` method ([#65](https://github.com/MetaMask/eth-hd-keyring/pull/65))
  - As of v4.0.0, the `deserialize` method (which is also called by the constructor) can no longer generate accounts with the `numberOfAccounts` option without a `mnemonic`. Prior to v4.0.0, a mnemonic was generated automatically if it was missing, but we now want to ensure a mnemonic is never implicitly generated without the caller knowing.

## [4.0.1]

### Added

- Add tests to get coverage to 100% ([#62](https://github.com/MetaMask/eth-hd-keyring/pull/62))

### Fixed

- Fix bug where an unexpected error would occur if the mnemonic passed to `_initFromMnemonic` was a buffer array ([#62](https://github.com/MetaMask/eth-hd-keyring/pull/62))

## [4.0.0]

### Changed

- **BREAKING**: Do not allow re-initialization of keyring instance ([#55](https://github.com/MetaMask/eth-hd-keyring/pull/55))
  - Consumers are now required to call generateRandomMnemonic() after initialization for creating new SRPs.
- **BREAKING**: Update minimum Node.js version from v10 to v12 ([#45](https://github.com/MetaMask/eth-hd-keyring/pull/45))
- Add `@lavamoat/allow-scripts` ([#47](https://github.com/MetaMask/eth-hd-keyring/pull/47))
  - We now have an allowlist for all post-install scripts. The standard setup script has been added, along with new contributor documentation in the README to explain this script.
- Obfuscate serialized mnemonic ([#59](https://github.com/MetaMask/eth-hd-keyring/pull/59))
  - Class variable `mnemonic` on `HdKeyring` can now be either type `Buffer` or type `string`.
  - Deserialize method (and `HdKeyring` constructor by extension) can no longer be passed an options object containing a value for `numberOfAccounts` if it is not also containing a value for `mnemonic`.
- Package name changed from `eth-hd-keyring` to `@metamask/eth-hd-keyring`.

[Unreleased]: https://github.com/MetaMask/accounts/compare/@metamask/eth-hd-keyring@9.0.1...HEAD
[9.0.1]: https://github.com/MetaMask/accounts/compare/@metamask/eth-hd-keyring@9.0.0...@metamask/eth-hd-keyring@9.0.1
[9.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/eth-hd-keyring@8.0.0...@metamask/eth-hd-keyring@9.0.0
[8.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/eth-hd-keyring@7.0.4...@metamask/eth-hd-keyring@8.0.0
[7.0.4]: https://github.com/MetaMask/accounts/compare/@metamask/eth-hd-keyring@7.0.3...@metamask/eth-hd-keyring@7.0.4
[7.0.3]: https://github.com/MetaMask/accounts/compare/@metamask/eth-hd-keyring@7.0.2...@metamask/eth-hd-keyring@7.0.3
[7.0.2]: https://github.com/MetaMask/accounts/compare/@metamask/eth-hd-keyring@7.0.1...@metamask/eth-hd-keyring@7.0.2
[7.0.1]: https://github.com/MetaMask/accounts/compare/@metamask/eth-hd-keyring@7.0.0...@metamask/eth-hd-keyring@7.0.1
[7.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/eth-hd-keyring@6.0.2...@metamask/eth-hd-keyring@7.0.0
[6.0.2]: https://github.com/MetaMask/accounts/compare/@metamask/eth-hd-keyring@6.0.1...@metamask/eth-hd-keyring@6.0.2
[6.0.1]: https://github.com/MetaMask/accounts/compare/@metamask/eth-hd-keyring@6.0.0...@metamask/eth-hd-keyring@6.0.1
[6.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/eth-hd-keyring@5.0.1...@metamask/eth-hd-keyring@6.0.0
[5.0.1]: https://github.com/MetaMask/accounts/compare/@metamask/eth-hd-keyring@5.0.0...@metamask/eth-hd-keyring@5.0.1
[5.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/eth-hd-keyring@4.0.2...@metamask/eth-hd-keyring@5.0.0
[4.0.2]: https://github.com/MetaMask/accounts/compare/@metamask/eth-hd-keyring@4.0.1...@metamask/eth-hd-keyring@4.0.2
[4.0.1]: https://github.com/MetaMask/accounts/compare/@metamask/eth-hd-keyring@4.0.0...@metamask/eth-hd-keyring@4.0.1
[4.0.0]: https://github.com/MetaMask/accounts/releases/tag/@metamask/eth-hd-keyring@4.0.0
