# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial release of `@metamask/eth-mpc-keyring` ([#627](https://github.com/MetaMask/accounts/pull/627))
  - 2-party client/server MPC keyring with DKLS23 TSS and cloud backup sync.
  - Supports create/import, share-epoch rotate/check/sync, and signing (transactions, personal_sign, typed data, EIP-7702 authorizations).
  - Create and rotate append a share epoch, store backup, assert readiness, then `setActiveEpoch` before updating local state.
  - Bind key-share backups to the DKG attempt nonce so a delayed backup cannot attach to a retried share.
  - Serialize sign, rotate, and sync on one op queue to avoid stale local state overwrites.

### Changed

- Send the MPC profile token as an `Authorization: Bearer` header instead of in the JSON request body ([#TODO](https://github.com/MetaMask/accounts/pull/TODO))

[Unreleased]: https://github.com/MetaMask/accounts/
