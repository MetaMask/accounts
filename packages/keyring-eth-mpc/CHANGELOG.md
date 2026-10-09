# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Uncategorized

- revert: release: 129.0.0 (#658) ([#658](https://github.com/MetaMask/accounts/pull/658))

### Added

- Initial release of `@metamask/eth-mpc-keyring` ([#641](https://github.com/MetaMask/accounts/pull/641))
  - The V1 MPC keyring implementation is not included yet.
- Add a V2 keyring implementation, available via the `./v2` export ([#641](https://github.com/MetaMask/accounts/pull/641), [#653](https://github.com/MetaMask/accounts/pull/653))
  - `MpcKeyring` (V2) implements the unified V2 `Keyring` interface with type `KeyringType.Mpc`.
  - Account creation uses custom options: `{ type: 'custom', mode: 'create' | 'import' }`, and the keyring declares `custom.createAccounts` in its capabilities.
  - Account are created with `options: { entropy: { type: 'mpc' }}`.
  - Exposes `rotateKeyShares`, `checkKeyShare`, and `syncKeyShare` maintenance operations.

[Unreleased]: https://github.com/MetaMask/accounts/
