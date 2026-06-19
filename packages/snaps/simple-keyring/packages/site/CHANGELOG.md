# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.1.1]

### Changed

- Bump bundled snap version reference from `@metamask/snap-simple-keyring-snap@2.0.1` to `@metamask/snap-simple-keyring-snap@2.1.0` ([#178](https://github.com/MetaMask/snap-simple-keyring/pull/178))
  - The site embeds the snap's `package.json` version at build time, so this republish is required for consumers to install the new snap version through the dapp.

## [2.0.1]

### Changed

- Bump `@metamask/keyring-api` from `^8.1.3` to `^23.1.0` ([#169](https://github.com/MetaMask/snap-simple-keyring/pull/169), [#173](https://github.com/MetaMask/snap-simple-keyring/pull/173))
- Bump `@metamask/keyring-snap-client` from `^8.0.0` to `^9.0.2` ([#173](https://github.com/MetaMask/snap-simple-keyring/pull/173))
- Bump `@metamask/providers` from `^13.0.0` to `^19.0.0` ([#173](https://github.com/MetaMask/snap-simple-keyring/pull/173))
- Use new font Geist ([#172](https://github.com/MetaMask/snap-simple-keyring/pull/172))

## [2.0.0]

### Changed

- Make @metamask/snap-simple-keyring-site publishable ([#163](https://github.com/MetaMask/snap-simple-keyring/pull/163), [#166](https://github.com/MetaMask/snap-simple-keyring/pull/166))
- Use new CentraNo1 font ([#160](https://github.com/MetaMask/snap-simple-keyring/pull/160))
- Bump `crypto-browserify@^3.12.1` + `snaps-*` ([#159](https://github.com/MetaMask/snap-simple-keyring/pull/159))

## [1.1.6]

### Changed

- Bump `@metamask/keyring-api` from `^1.0.0-rc.1` to `^8.1.3` ([#155](https://github.com/MetaMask/snap-simple-keyring/pull/155))
  - This version is now built slightly differently and is part of the [accounts monorepo](https://github.com/MetaMask/accounts).

## [1.1.2]

### Changed

- Hardcode light mode ([#138](https://github.com/MetaMask/snap-simple-keyring/pull/138))

## [1.1.1]

### Changed

- Add ID for E2E test ([#130](https://github.com/MetaMask/snap-simple-keyring/pull/130))

## [1.1.0]

### Added

- Add delete button to account ([#117](https://github.com/MetaMask/snap-simple-keyring/pull/117)).
- Add "Update Account" to companion dapp ([#118](https://github.com/MetaMask/snap-simple-keyring/pull/118)).

### Changed

- Add parenthesis around details of the Snap version ([#123](https://github.com/MetaMask/snap-simple-keyring/pull/123)).
- Move "Delete" button into account details ([#121](https://github.com/MetaMask/snap-simple-keyring/pull/121)).
- Move "Delete" button into account details ([#122](https://github.com/MetaMask/snap-simple-keyring/pull/122)).
- Change `packageInfo` to `snapPackageInfo` ([#114](https://github.com/MetaMask/snap-simple-keyring/pull/114)).

### Fixed

- Remove cache before building site ([#124](https://github.com/MetaMask/snap-simple-keyring/pull/124)).
- Use `stretch` as default alignment in `AccountRow` ([#120](https://github.com/MetaMask/snap-simple-keyring/pull/120)).
- Use the Snap `package.json` for the update check ([#112](https://github.com/MetaMask/snap-simple-keyring/pull/112)).

## [1.0.0]

### Added

- Add alert banner for users ([#104](https://github.com/MetaMask/snap-simple-keyring/pull/104)).

## [0.4.0]

## [0.3.1]

### Changed

- Allow Snap to be installed in MetaMask Stable ([#101](https://github.com/MetaMask/snap-simple-keyring/pull/101)).

## [0.3.0]

### Changed

- **BREAKING:** Use `onKeyringRequest` to handle keyring methods ([#97](https://github.com/MetaMask/snap-simple-keyring/pull/97)).

## [0.2.4]

### Added

- Add update button ([#93](https://github.com/MetaMask/snap-simple-keyring/pull/93)).

### Fixed

- Fix the list of accounts not being displayed on the first load ([#92](https://github.com/MetaMask/snap-simple-keyring/pull/92)).
- Fix the private key format in the import account placeholder ([#89](https://github.com/MetaMask/snap-simple-keyring/pull/89)).
- Check if the snap is installed before trying to get its state ([#87](https://github.com/MetaMask/snap-simple-keyring/pull/87)).
- Remove `console.log` if snap is not installed ([#88](https://github.com/MetaMask/snap-simple-keyring/pull/88)).

## [0.2.3]

### Changed

- Use text fields in account methods inputs ([#82](https://github.com/MetaMask/snap-simple-keyring/pull/82)).
- Update linting targets ([#85](https://github.com/MetaMask/snap-simple-keyring/pull/85)).
- Update Gatsby to version 5 ([#83](https://github.com/MetaMask/snap-simple-keyring/pull/83)).
- Enable linters and fix errors ([#81](https://github.com/MetaMask/snap-simple-keyring/pull/81)).

### Fixed

- Serve self-hosted fonts ([#80](https://github.com/MetaMask/snap-simple-keyring/pull/80)).

## [0.2.2]

### Added

- Let the dapp specifies the Snap version to install ([#72](https://github.com/MetaMask/snap-simple-keyring/pull/72)).
- Add dapp version to header ([#71](https://github.com/MetaMask/snap-simple-keyring/pull/71)).

### Fixed

- Disable async-sync toggle if snap is not installed ([#77](https://github.com/MetaMask/snap-simple-keyring/pull/77)).

## [0.2.1]

### Changed

- Align button and request result with action name ([#66](https://github.com/MetaMask/snap-simple-keyring/pull/66)).
- Remove account name and improve some UI components ([#65](https://github.com/MetaMask/snap-simple-keyring/pull/65)).
- Migrate to new `keyring-api` version (0.2.x) ([#64](https://github.com/MetaMask/snap-simple-keyring/pull/64)).
- Polyfill crypto dependency introduced in `metamask-utils` 6.2.0 ([#62](https://github.com/MetaMask/snap-simple-keyring/pull/62)).

## [0.2.0]

### Added

- Support the async approval flow ([#50](https://github.com/MetaMask/snap-simple-keyring/pull/50)).
- Import account ([#58](https://github.com/MetaMask/snap-simple-keyring/pull/58)).

### Changed

- Improve UI/UX ([#54](https://github.com/MetaMask/snap-simple-keyring/pull/54)).

### Fixed

- Now you don't have to change your `defaultSnapOrigin` ([#59](https://github.com/MetaMask/snap-simple-keyring/pull/59)).

## [0.1.4]

### Fixed

- Fix `rejectRequest` call in site package ([#53](https://github.com/MetaMask/snap-simple-keyring/pull/53)).

## [0.1.3]

### Changed

- No changes in this release.

## [0.1.2]

### Changed

- Update snaps and API dependencies. ([#41](https://github.com/MetaMask/snap-simple-keyring/pull/41)).
- Add IDs for e2e tests. ([#40](https://github.com/MetaMask/snap-simple-keyring/pull/40)).

## [0.1.1] - 2023-06-23

### Changed

- No changes in this release.

## [0.1.0] - 2023-06-22

### Added

- Initial release.

[Unreleased]: https://github.com/MetaMask/accounts/compare/@metamask/snap-simple-keyring-site@2.1.1...HEAD
[2.1.1]: https://github.com/MetaMask/accounts/compare/@metamask/snap-simple-keyring-site@2.0.1...@metamask/snap-simple-keyring-site@2.1.1
[2.0.1]: https://github.com/MetaMask/accounts/compare/@metamask/snap-simple-keyring-site@2.0.0...@metamask/snap-simple-keyring-site@2.0.1
[2.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/snap-simple-keyring-site@1.1.6...@metamask/snap-simple-keyring-site@2.0.0
[1.1.6]: https://github.com/MetaMask/accounts/compare/@metamask/snap-simple-keyring-site@1.1.2...@metamask/snap-simple-keyring-site@1.1.6
[1.1.2]: https://github.com/MetaMask/accounts/compare/@metamask/snap-simple-keyring-site@1.1.1...@metamask/snap-simple-keyring-site@1.1.2
[1.1.1]: https://github.com/MetaMask/accounts/compare/@metamask/snap-simple-keyring-site@1.1.0...@metamask/snap-simple-keyring-site@1.1.1
[1.1.0]: https://github.com/MetaMask/accounts/compare/@metamask/snap-simple-keyring-site@1.0.0...@metamask/snap-simple-keyring-site@1.1.0
[1.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/snap-simple-keyring-site@0.4.0...@metamask/snap-simple-keyring-site@1.0.0
[0.4.0]: https://github.com/MetaMask/accounts/compare/@metamask/snap-simple-keyring-site@0.3.1...@metamask/snap-simple-keyring-site@0.4.0
[0.3.1]: https://github.com/MetaMask/accounts/compare/@metamask/snap-simple-keyring-site@0.3.0...@metamask/snap-simple-keyring-site@0.3.1
[0.3.0]: https://github.com/MetaMask/accounts/compare/@metamask/snap-simple-keyring-site@0.2.4...@metamask/snap-simple-keyring-site@0.3.0
[0.2.4]: https://github.com/MetaMask/accounts/compare/@metamask/snap-simple-keyring-site@0.2.3...@metamask/snap-simple-keyring-site@0.2.4
[0.2.3]: https://github.com/MetaMask/accounts/compare/@metamask/snap-simple-keyring-site@0.2.2...@metamask/snap-simple-keyring-site@0.2.3
[0.2.2]: https://github.com/MetaMask/accounts/compare/@metamask/snap-simple-keyring-site@0.2.1...@metamask/snap-simple-keyring-site@0.2.2
[0.2.1]: https://github.com/MetaMask/accounts/compare/@metamask/snap-simple-keyring-site@0.2.0...@metamask/snap-simple-keyring-site@0.2.1
[0.2.0]: https://github.com/MetaMask/accounts/compare/@metamask/snap-simple-keyring-site@0.1.4...@metamask/snap-simple-keyring-site@0.2.0
[0.1.4]: https://github.com/MetaMask/accounts/compare/@metamask/snap-simple-keyring-site@0.1.3...@metamask/snap-simple-keyring-site@0.1.4
[0.1.3]: https://github.com/MetaMask/accounts/compare/@metamask/snap-simple-keyring-site@0.1.2...@metamask/snap-simple-keyring-site@0.1.3
[0.1.2]: https://github.com/MetaMask/accounts/compare/@metamask/snap-simple-keyring-site@0.1.1...@metamask/snap-simple-keyring-site@0.1.2
[0.1.1]: https://github.com/MetaMask/accounts/compare/@metamask/snap-simple-keyring-site@0.1.0...@metamask/snap-simple-keyring-site@0.1.1
[0.1.0]: https://github.com/MetaMask/accounts/releases/tag/@metamask/snap-simple-keyring-site@0.1.0
