# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.1.0]

### Added

- Implement `keyring_setSelectedAccounts` and `keyring_resolveAccountAddress` ([#176](https://github.com/MetaMask/snap-simple-keyring/pull/176))
  - Required for compatibility with `@metamask/eth-snap-keyring@^22`, which invokes these methods when MetaMask switches the active account or needs to resolve the signer for a request.
- Allow the `metamask` origin to call `keyring_createAccount`, `keyring_resolveAccountAddress`, and `keyring_setSelectedAccounts` ([#176](https://github.com/MetaMask/snap-simple-keyring/pull/176))

## [2.0.1]

### Changed

- Bump `@metamask/keyring-api` from `^8.1.3` to `^23.1.0` ([#169](https://github.com/MetaMask/snap-simple-keyring/pull/169), [#173](https://github.com/MetaMask/snap-simple-keyring/pull/173))
- Add `@metamask/keyring-snap-sdk@^7.0.0` ([#169](https://github.com/MetaMask/snap-simple-keyring/pull/169))
  - Some code that the snap was relying on was moved from `@metamask/keyring-api` to `@metamask/keyring-snap-sdk`.
- Bump `@metamask/keyring-snap-sdk` from `^7.0.0` to `^9.0.1` ([#173](https://github.com/MetaMask/snap-simple-keyring/pull/173))
- Bump `@metamask/snaps-sdk` from `6.19.0` to `^11.1.0` ([#169](https://github.com/MetaMask/snap-simple-keyring/pull/169), [#173](https://github.com/MetaMask/snap-simple-keyring/pull/173))
  - `platformVersion` in `snap.manifest.json` is updated from `7.1.0` to `11.1.0` to match.
- Bump `@metamask/utils` from `^8.1.0` to `^11.11.0` ([#173](https://github.com/MetaMask/snap-simple-keyring/pull/173))

## [2.0.0]

### Changed

- Bump `crypto-browserify@^3.12.1` + `snaps-*` ([#159](https://github.com/MetaMask/snap-simple-keyring/pull/159))

## [1.1.6]

### Changed

- Bump `@metamask/keyring-api` from `^8.1.0` to `^8.1.3` ([#155](https://github.com/MetaMask/snap-simple-keyring/pull/155))
  - This version is now built slightly differently and is part of the [accounts monorepo](https://github.com/MetaMask/accounts).

## [1.1.5]

### Added

- Add "metamask.github.io" to `allowedOrigins` list in the `endowment:keyring` ([#153](https://github.com/MetaMask/snap-simple-keyring/pull/153))

## [1.1.4]

### Added

- Allow the origin `metamask.github.io` to call snap methods ([#151](https://github.com/MetaMask/snap-simple-keyring/pull/151)).

### Fixed

- Moved `build-preinstalled-snap.js` script inside snap package and fixed bundle paths for pre installed snaps ([#150](https://github.com/MetaMask/snap-simple-keyring/pull/150))

## [1.1.3]

### Added

- Include `preinstalled-snap.json` in release ([#148](https://github.com/MetaMask/snap-simple-keyring/pull/148)).
- Script to generate `preinstalled-snap.json` ([#146](https://github.com/MetaMask/snap-simple-keyring/pull/146)).

## [1.1.2]

### Added

- Add account name suggestion to `"notify:accountCreated"` event ([#144](https://github.com/MetaMask/snap-simple-keyring/pull/144))

## [1.1.1]

### Changed

- Remove unused `snap_dialog` permission ([#127](https://github.com/MetaMask/snap-simple-keyring/pull/127))

## [1.1.0]

### Added

- Add logger utility ([#116](https://github.com/MetaMask/snap-simple-keyring/pull/116)).
- Add "Update Account" to companion dapp ([#118](https://github.com/MetaMask/snap-simple-keyring/pull/118)).

### Fixed

- Remove `localhost` from `allowedOrigin` ([#125](https://github.com/MetaMask/snap-simple-keyring/pull/125)).
- Sanitize error message when importing invalid private key ([#119](https://github.com/MetaMask/snap-simple-keyring/pull/119)).

## [1.0.1]

### Changed

- Remove logs from Snap ([#108](https://github.com/MetaMask/snap-simple-keyring/pull/108)).

## [1.0.0]

### Changed

- Remove <http://localhost:8000> from allowed origins ([#106](https://github.com/MetaMask/snap-simple-keyring/pull/106)).

## [0.4.0]

### Added

- Add URL and message to async approval redirect ([#98](https://github.com/MetaMask/snap-simple-keyring/pull/98)).

## [0.3.1]

## [0.3.0]

### Changed

- **BREAKING:** Use `onKeyringRequest` to handle keyring methods ([#97](https://github.com/MetaMask/snap-simple-keyring/pull/97)).

## [0.2.4]

### Fixed

- Fix Snap and Extension are out of sync when creating/removing account ([#95](https://github.com/MetaMask/snap-simple-keyring/pull/95)).
- Remove private key from options after generating key pair ([#90](https://github.com/MetaMask/snap-simple-keyring/pull/90)).

## [0.2.3]

### Changed

- Update linting targets ([#85](https://github.com/MetaMask/snap-simple-keyring/pull/85)).
- Update Gatsby to version 5 ([#83](https://github.com/MetaMask/snap-simple-keyring/pull/83)).
- Enable linters and fix errors ([#81](https://github.com/MetaMask/snap-simple-keyring/pull/81)).

## [0.2.2]

### Fixed

- Persist snap state after switching between sync <-> async ([#76](https://github.com/MetaMask/snap-simple-keyring/pull/76)).

## [0.2.1]

### Changed

- Migrate to new `keyring-api` version (0.2.x) ([#64](https://github.com/MetaMask/snap-simple-keyring/pull/64)).
- Polyfill crypto dependency introduced in `metamask-utils` 6.2.0 ([#62](https://github.com/MetaMask/snap-simple-keyring/pull/62)).

## [0.2.0]

### Added

- Support the async approval flow ([#50](https://github.com/MetaMask/snap-simple-keyring/pull/50)).
- Import account ([#58](https://github.com/MetaMask/snap-simple-keyring/pull/58)).

## [0.1.4]

### Changed

- Bump `@metamask/snaps-cli` to `v0.38.2-flask.1` ([#55](https://github.com/MetaMask/snap-simple-keyring/pull/55)).

## [0.1.3]

### Fixed

- Fix address checksum and account update order. ([#44](https://github.com/MetaMask/snap-simple-keyring/pull/44)).
- Fix unique name during account creation. ([#43](https://github.com/MetaMask/snap-simple-keyring/pull/43)).

## [0.1.2]

### Changed

- Update snaps and API dependencies. ([#41](https://github.com/MetaMask/snap-simple-keyring/pull/41)).
- Add IDs for e2e tests. ([#40](https://github.com/MetaMask/snap-simple-keyring/pull/40)).

## [0.1.1] - 2023-06-23

### Changed

- Update snap's `README.md` ([#37](https://github.com/MetaMask/snap-simple-keyring/pull/37)).

### Fixed

- Allow calls from `https://metamask.github.io` to the snap. ([#36](https://github.com/MetaMask/snap-simple-keyring/pull/36)).

## [0.1.0] - 2023-06-22

### Added

- Initial release.

[Unreleased]: https://github.com/MetaMask/snap-simple-keyring/compare/v2.1.0...HEAD
[2.1.0]: https://github.com/MetaMask/snap-simple-keyring/compare/v2.0.1...v2.1.0
[2.0.1]: https://github.com/MetaMask/snap-simple-keyring/compare/v2.0.0...v2.0.1
[2.0.0]: https://github.com/MetaMask/snap-simple-keyring/compare/v1.1.6...v2.0.0
[1.1.6]: https://github.com/MetaMask/snap-simple-keyring/compare/v1.1.5...v1.1.6
[1.1.5]: https://github.com/MetaMask/snap-simple-keyring/compare/v1.1.4...v1.1.5
[1.1.4]: https://github.com/MetaMask/snap-simple-keyring/compare/v1.1.3...v1.1.4
[1.1.3]: https://github.com/MetaMask/snap-simple-keyring/compare/v1.1.2...v1.1.3
[1.1.2]: https://github.com/MetaMask/snap-simple-keyring/compare/v1.1.1...v1.1.2
[1.1.1]: https://github.com/MetaMask/snap-simple-keyring/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/MetaMask/snap-simple-keyring/compare/v1.0.1...v1.1.0
[1.0.1]: https://github.com/MetaMask/snap-simple-keyring/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/MetaMask/snap-simple-keyring/compare/v0.4.0...v1.0.0
[0.4.0]: https://github.com/MetaMask/snap-simple-keyring/compare/v0.3.1...v0.4.0
[0.3.1]: https://github.com/MetaMask/snap-simple-keyring/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/MetaMask/snap-simple-keyring/compare/v0.2.4...v0.3.0
[0.2.4]: https://github.com/MetaMask/snap-simple-keyring/compare/v0.2.3...v0.2.4
[0.2.3]: https://github.com/MetaMask/snap-simple-keyring/compare/v0.2.2...v0.2.3
[0.2.2]: https://github.com/MetaMask/snap-simple-keyring/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/MetaMask/snap-simple-keyring/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/MetaMask/snap-simple-keyring/compare/v0.1.4...v0.2.0
[0.1.4]: https://github.com/MetaMask/snap-simple-keyring/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/MetaMask/snap-simple-keyring/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/MetaMask/snap-simple-keyring/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/MetaMask/snap-simple-keyring/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/MetaMask/snap-simple-keyring/releases/tag/v0.1.0
