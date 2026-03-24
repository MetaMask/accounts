# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Uncategorized

- build: remove use of workspace versions ([#479](https://github.com/MetaMask/accounts/pull/479))

## [1.0.0]

### Added

- Add initial implementation of `MoneyKeyring` ([#472](https://github.com/MetaMask/accounts/pull/472), [#474](https://github.com/MetaMask/accounts/pull/474))
  - Extends `HdKeyring` from `@metamask/eth-hd-keyring`.
  - Uses keyring type `"Money Keyring"`.
  - Uses derivation path `"m/44'/4392018'/0'/0"`.
  - Enforces that at most one Money account can exist.

[Unreleased]: https://github.com/MetaMask/accounts/compare/@metamask/eth-money-keyring@1.0.0...HEAD
[1.0.0]: https://github.com/MetaMask/accounts/releases/tag/@metamask/eth-money-keyring@1.0.0
