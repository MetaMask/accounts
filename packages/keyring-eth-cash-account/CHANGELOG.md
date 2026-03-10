# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Add initial implementation of `CashAccountKeyring` ([#472](https://github.com/MetaMask/accounts/pull/472))
  - Extends `HdKeyring` from `@metamask/eth-hd-keyring`.
  - Uses keyring type `"Cash Account Keyring"`.
  - Uses derivation path `"m/44'/4392018'/0'/0"`.

[Unreleased]: https://github.com/MetaMask/accounts/
