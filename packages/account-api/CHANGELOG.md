# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Add `AccountGroupType` + `AccountGroup.type` ([#329](https://github.com/MetaMask/accounts/pull/329))

### Changed

- **BREAKING:** Rename `AccountWalletCategory` to `AccountWalletType` + `category` to `type` ([#328](https://github.com/MetaMask/accounts/pull/328))
  - This name better reflects other patterns we already have in place elsewhere.

## [0.3.0]

### Added

- Add `Bip44Account<Account>` type + `isBip44Account` helper ([#319](https://github.com/MetaMask/accounts/pull/319))
- Add `MultichainAccountWallet.sync` method ([#321](https://github.com/MetaMask/accounts/pull/321))
  - This can be used to force wallet synchronization if new accounts are available on the account providers.

### Changed

- **BREAKING:** Force `Bip44Account<Account>` for `Multichain*` types ([#321](https://github.com/MetaMask/accounts/pull/321))
  - This requires the `AccountProvider`s to also use new `Bip44Account` type constraint.

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

[Unreleased]: https://github.com/MetaMask/accounts/compare/@metamask/account-api@0.3.0...HEAD
[0.3.0]: https://github.com/MetaMask/accounts/compare/@metamask/account-api@0.2.0...@metamask/account-api@0.3.0
[0.2.0]: https://github.com/MetaMask/accounts/compare/@metamask/account-api@0.1.0...@metamask/account-api@0.2.0
[0.1.0]: https://github.com/MetaMask/accounts/releases/tag/@metamask/account-api@0.1.0
