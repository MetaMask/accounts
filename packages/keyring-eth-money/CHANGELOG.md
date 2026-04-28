# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.0.3]

### Changed

- Bump `@metamask/eth-hd-keyring` from `^14.0.1` to `^14.1.0` ([#XXXX](https://github.com/MetaMask/accounts/pull/XXXX))

## [2.0.2]

### Changed

- Bump `@metamask/eth-hd-keyring` from `^14.0.0` to `^14.0.1` ([#518](https://github.com/MetaMask/accounts/pull/518))
- Bump `@metamask/keyring-api` from `^23.0.0` to `^23.0.1` ([#518](https://github.com/MetaMask/accounts/pull/518))

## [2.0.1]

### Changed

- Bump `@metamask/utils` from `^11.10.0` to `^11.11.0` ([#483](https://github.com/MetaMask/accounts/pull/483))
- Bump `@metamask/eth-hd-keyring` from `^13.1.0` to `^13.1.1` ([#509](https://github.com/MetaMask/accounts/pull/509))
- Bump `@metamask/eth-hd-keyring` from `^13.1.1` to `^14.0.0` ([#515](https://github.com/MetaMask/accounts/pull/515))
- Bump `@metamask/keyring-api` from `^22.0.0` to `^23.0.0` ([#515](https://github.com/MetaMask/accounts/pull/515))

## [2.0.0]

### Added

- Support custom cryptographic functions ([#491](https://github.com/MetaMask/accounts/pull/491))
  - Those functions are forwarded to the inner `HdKeyring`.

### Changed

- **BREAKING:** Replace inheritance with composition; `MoneyKeyring` now wraps an inner `HdKeyring` instead of extending it ([#484](https://github.com/MetaMask/accounts/pull/484)), ([#492](https://github.com/MetaMask/accounts/pull/488)), ([#488](https://github.com/MetaMask/accounts/pull/492))
  - Constructor now requires a `MoneyKeyringOptions` object with a `getMnemonic` callback. The `entropySource` is set by `deserialize()` from the serialized state.
  - The inner `HdKeyring` is created on the first signing call (lazily), protected by a mutex to ensure single initialization under concurrency.
  - Serialized state now stores `entropySource` instead of `mnemonic`; the mnemonic is resolved at deserialization time via the callback.
  - Serialized state now stores `account` (the derived address) instead of `numberOfAccounts`; the account is restored directly from state without calling `getMnemonic`.
  - `hdPath` is no longer part of the serialized state; it is always `MONEY_DERIVATION_PATH`.
  - `signMessage`, `getEncryptionPublicKey`, `decryptMessage`, `exportAccount`, and `getAppKeyAddress` are no longer exposed.
  - `removeAccount()` has been removed; accounts are permanent once added.
  - `getAccounts()` is now a cheap synchronous-like read that never triggers `getMnemonic`.
  - New exports: `GetMnemonicCallback`, `MoneyKeyringOptions` types.
  - New dependency: `@metamask/keyring-utils` (for `Keyring` interface).
  - New dependency: `async-mutex`.

## [1.0.0] - 2026-04-01 [DEPRECATED]

### Added

- Add initial implementation of `MoneyKeyring` ([#472](https://github.com/MetaMask/accounts/pull/472)), ([#474](https://github.com/MetaMask/accounts/pull/474))
  - Extends `HdKeyring` from `@metamask/eth-hd-keyring`.
  - Uses keyring type `"Money Keyring"`.
  - Uses derivation path `"m/44'/4392018'/0'/0"`.
  - Enforces that at most one Money account can exist.

[Unreleased]: https://github.com/MetaMask/accounts/compare/@metamask/eth-money-keyring@2.0.3...HEAD
[2.0.3]: https://github.com/MetaMask/accounts/compare/@metamask/eth-money-keyring@2.0.2...@metamask/eth-money-keyring@2.0.3
[2.0.2]: https://github.com/MetaMask/accounts/compare/@metamask/eth-money-keyring@2.0.1...@metamask/eth-money-keyring@2.0.2
[2.0.1]: https://github.com/MetaMask/accounts/compare/@metamask/eth-money-keyring@2.0.0...@metamask/eth-money-keyring@2.0.1
[2.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/eth-money-keyring@1.0.0...@metamask/eth-money-keyring@2.0.0
[1.0.0]: https://github.com/MetaMask/accounts/releases/tag/@metamask/eth-money-keyring@1.0.0
