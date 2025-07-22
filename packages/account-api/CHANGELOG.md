# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0]

### Added

- Add multichain account/wallet support ([#315](https://github.com/MetaMask/accounts/pull/315))
  - This is only about "grouping" wallets and accounts together.

### Changed

- **BREAKING:** Bump `@metamask/keyring-api` from `^18.0.0` to `^19.0.0` ([#317](https://github.com/MetaMask/accounts/pull/317))
  - The `KeyringAccount.options` field is now partially typed.

## [0.1.0]

### Added

- Add `AccountGroup` and `AccountWallet` ([#307](https://github.com/MetaMask/accounts/pull/307))

[Unreleased]: https://github.com/MetaMask/accounts/compare/@metamask/account-api@0.2.0...HEAD
[0.2.0]: https://github.com/MetaMask/accounts/compare/@metamask/account-api@0.1.0...@metamask/account-api@0.2.0
[0.1.0]: https://github.com/MetaMask/accounts/releases/tag/@metamask/account-api@0.1.0
