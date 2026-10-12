# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial release of `@metamask/eth-mpc-keyring` ([#641](https://github.com/MetaMask/accounts/pull/641)), ([#653](https://github.com/MetaMask/accounts/pull/653)), ([#627](https://github.com/MetaMask/accounts/pull/627))
  - V1 `MpcKeyring` implementation for create/import, key-share maintenance, and signing.
  - V2 `MpcKeyring` implements the unified V2 `Keyring` interface with type `KeyringType.Mpc` (available via `/v2` export).
  - Account creation uses custom options: `{ type: 'custom', mode: 'create' | 'import' }`, and the keyring declares `custom.createAccounts` in its capabilities.
  - Account are created with `options: { entropy: { type: 'mpc' }}`.
  - Exposes `rotateKeyShares`, `checkKeyShare`, and `syncKeyShare` maintenance operations.

### Changed

- Bump `@metamask/keyring-api` from `^24.1.0` to `^24.2.0` ([#660](https://github.com/MetaMask/accounts/pull/660))
- Bump `@metamask/keyring-sdk` from `^3.1.0` to `^4.0.0` ([#664](https://github.com/MetaMask/accounts/pull/664))

[Unreleased]: https://github.com/MetaMask/accounts/
