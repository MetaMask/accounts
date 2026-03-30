# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **BREAKING:** Replace inheritance with composition; `MoneyKeyring` now wraps an inner `HdKeyring` instead of extending it ([#484](https://github.com/MetaMask/accounts/pull/484), [#488](https://github.com/MetaMask/accounts/pull/488))
  - Constructor now requires a `MoneyKeyringOptions` object with a `getMnemonic` callback. The `entropySource` is set by `deserialize()` from the serialized state.
  - Serialized state stores `entropySource` instead of `mnemonic`; the mnemonic is resolved at deserialization time via the callback.
  - `hdPath` is no longer part of the serialized state; it is always `MONEY_DERIVATION_PATH`.
  - `signMessage`, `getEncryptionPublicKey`, `decryptMessage`, `exportAccount`, and `getAppKeyAddress` are no longer exposed.
  - New exports: `GetMnemonicCallback`, `MoneyKeyringOptions` types.
  - New dependency: `@metamask/keyring-utils` (for `Keyring` interface).

## [1.0.0]

### Added

- Add initial implementation of `MoneyKeyring` ([#472](https://github.com/MetaMask/accounts/pull/472), [#474](https://github.com/MetaMask/accounts/pull/474))
  - Extends `HdKeyring` from `@metamask/eth-hd-keyring`.
  - Uses keyring type `"Money Keyring"`.
  - Uses derivation path `"m/44'/4392018'/0'/0"`.
  - Enforces that at most one Money account can exist.

[Unreleased]: https://github.com/MetaMask/accounts/compare/@metamask/eth-money-keyring@1.0.0...HEAD
[1.0.0]: https://github.com/MetaMask/accounts/releases/tag/@metamask/eth-money-keyring@1.0.0
