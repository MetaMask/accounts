# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Uncategorized

- chore(account-api): fixup changelog ([#363](https://github.com/MetaMask/accounts/pull/363))

## [0.10.0]

### Added

- Add group/wallet ID parsing/validation support ([#360](https://github.com/MetaMask/accounts/pull/360))
- Add `Bip44AccountProvider` type alias ([#361](https://github.com/MetaMask/accounts/pull/361))

### Changed

- **BREAKING:** Bump `@metamask/keyring-api` to `^21.0.0` ([#362](https://github.com/MetaMask/accounts/pull/362))

## [0.9.0]

### Changed

- **BREAKING:** Bump `@metamask/keyring-api` to `^20.0.0` ([#348](https://github.com/MetaMask/accounts/pull/348))

## [0.8.0]

### Added

- Add `selectOne` and `select` selectors functions ([#342](https://github.com/MetaMask/accounts/pull/342))
  - Those functions can be used to filter a list of accounts using an `AccountSelector` object.
- Add common mock account definitions + `MockAccountBuilder` ([#341](https://github.com/MetaMask/accounts/pull/341))
  - You can now import/use them with `@metamask/account-api/mocks`.
- Add `assertIsBip44Account` ([#339](https://github.com/MetaMask/accounts/pull/339))

### Changed

- **BREAKING:** Rename `MultichainAccountGroup.index` to `MultichainAccountGroup.groupIndex` ([#344](https://github.com/MetaMask/accounts/pull/344))
- **BREAKING:** Move `get` and `select` methods to the `AccountGroup` type ([#343](https://github.com/MetaMask/accounts/pull/343))

## [0.7.0]

### Added

- Add `AccountProvider.{createAccounts,discoverAndCreateAccounts}` ([#337](https://github.com/MetaMask/accounts/pull/337))

### Changed

- **BREAKING:** Rename `getGroupIndexFromMultichainAccountId` to `getGroupIndexFromMultichainAccountGroupId` ([#336](https://github.com/MetaMask/accounts/pull/336))
  - This function was not following the same naming convention (this is an oversight from previous release).

## [0.6.0]

### Changed

- **BREAKING:** `MultichainAccount` is now an interface and has been renamed `MultichainAccountGroup` ([#333](https://github.com/MetaMask/accounts/pull/333))
  - Its implementation will be moved to the [`MultichainAccountService`](https://github.com/MetaMask/core/tree/main/packages/multichain-account-service).
- **BREAKING:** `MultichainAccountWallet` is now an interface ([#333](https://github.com/MetaMask/accounts/pull/333))
  - Its implementation will be moved to the [`MultichainAccountService`](https://github.com/MetaMask/core/tree/main/packages/multichain-account-service).

## [0.5.0]

### Added

- Add `Account{Wallet,Group}IdOf` type utility ([#331](https://github.com/MetaMask/accounts/pull/331))

### Changed

- Use generic type for `toAccount{Wallet,Group}Id` ([#331](https://github.com/MetaMask/accounts/pull/331))

## [0.4.0]

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

[Unreleased]: https://github.com/MetaMask/accounts/compare/@metamask/account-api@0.10.0...HEAD
[0.10.0]: https://github.com/MetaMask/accounts/compare/@metamask/account-api@0.9.0...@metamask/account-api@0.10.0
[0.9.0]: https://github.com/MetaMask/accounts/compare/@metamask/account-api@0.8.0...@metamask/account-api@0.9.0
[0.8.0]: https://github.com/MetaMask/accounts/compare/@metamask/account-api@0.7.0...@metamask/account-api@0.8.0
[0.7.0]: https://github.com/MetaMask/accounts/compare/@metamask/account-api@0.6.0...@metamask/account-api@0.7.0
[0.6.0]: https://github.com/MetaMask/accounts/compare/@metamask/account-api@0.5.0...@metamask/account-api@0.6.0
[0.5.0]: https://github.com/MetaMask/accounts/compare/@metamask/account-api@0.4.0...@metamask/account-api@0.5.0
[0.4.0]: https://github.com/MetaMask/accounts/compare/@metamask/account-api@0.3.0...@metamask/account-api@0.4.0
[0.3.0]: https://github.com/MetaMask/accounts/compare/@metamask/account-api@0.2.0...@metamask/account-api@0.3.0
[0.2.0]: https://github.com/MetaMask/accounts/compare/@metamask/account-api@0.1.0...@metamask/account-api@0.2.0
[0.1.0]: https://github.com/MetaMask/accounts/releases/tag/@metamask/account-api@0.1.0
