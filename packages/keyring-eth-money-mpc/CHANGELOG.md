# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.1]

### Changed

- Use `MpcAccount<KeyringAccount>` for the accounts returned by the V2 `MpcMoneyKeyring` ([#677](https://github.com/MetaMask/accounts/pull/677))
- Mark accounts as non-exportable by setting the `exportable` account option to `false` ([#676](https://github.com/MetaMask/accounts/pull/676))
- Bump `@metamask/account-api` from `^2.1.1` to `^2.2.0` ([#678](https://github.com/MetaMask/accounts/pull/678))

## [0.1.0]

### Added

- Initial release of `@metamask/eth-money-mpc-keyring` ([#627](https://github.com/MetaMask/accounts/pull/627), [#641](https://github.com/MetaMask/accounts/pull/641)), [#673](https://github.com/MetaMask/accounts/pull/673))

### Changed

- Bump `@metamask/keyring-api` from `^24.2.0` to `^24.3.0` ([#674](https://github.com/MetaMask/accounts/pull/674))

[Unreleased]: https://github.com/MetaMask/accounts/compare/@metamask/eth-money-mpc-keyring@0.1.1...HEAD
[0.1.1]: https://github.com/MetaMask/accounts/compare/@metamask/eth-money-mpc-keyring@0.1.0...@metamask/eth-money-mpc-keyring@0.1.1
[0.1.0]: https://github.com/MetaMask/accounts/releases/tag/@metamask/eth-money-mpc-keyring@0.1.0
