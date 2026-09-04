# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial release of `@metamask/eth-mpc-keyring` ([#627](https://github.com/MetaMask/accounts/pull/627))

### Changed

- Send the MPC profile token as an `Authorization: Bearer` header instead of in the JSON request body ([#630](https://github.com/MetaMask/accounts/pull/630))
- Load key-share backups with `GET /load-key-share-backup` instead of `POST` ([#631](https://github.com/MetaMask/accounts/pull/631))

[Unreleased]: https://github.com/MetaMask/accounts/
