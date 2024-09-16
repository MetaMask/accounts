# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.1.1]

### Uncategorized

- fix: fix preview builds artifacts ([#17](https://github.com/MetaMask/accounts.git/pull/17))
- refactor: remove nested .gitignores + use the top-level one ([#18](https://github.com/MetaMask/accounts.git/pull/18))
- feat: preview builds ([#15](https://github.com/MetaMask/accounts.git/pull/15))
- refactor: update all changelogs to use monorepo links
- build: add changelog:{validate,update} for each packages
- build: add yarn build:force command
- build(keyring-eth-trezor): use nohoist alternative with installConfig
- build: use tsc --build rather than tsc --project
- refactor: update global jest.config.js in packages + use it in packages
- refactor: remove packages/\*/.gitattributes
- refactor: remove packages/\*/.editorconfig
- refactor: remove .nvmrc from all packages
- refactor: migrate depcheck to the top-level
- fix(prettier): update changelogs for kerying-eth-{hd,ledger-bridge,simple,trezor}
- chore: run prettier for all package.json
- refactor: remove packages/\*/.prettierrc.js + remove prettier from packages
- refactor: use top-level eslint + cleanup packages lint commands/files + adapt rules to match previous linting rules
- refactor: remove packages/_/.yarn_
- refactor: migrate .github folder to the top-level (without publish-\*docs.yml for now)
- test(keyring-eth-trezor): use jsdom test environment for some tests
- refactor: remove packageManager from packages
- build: re-organize tsconfig.\* + force resolutions
- build: add new build/test commands for all packages
- refactor: remove packages/\*/yarn.lock
- refactor(eth-trezor-keyring): \* -> packages/keyring-eth-trezor

## [3.1.0]

### Changed

- Bump `@trezor/connect-web` from `^9.0.6` to `^9.1.11` ([#195](https://github.com/MetaMask/eth-trezor-keyring/pull/195))

### Fixed

- Bump `@metamask/eth-sig-util` from `^7.0.0` to `^7.0.1` ([#195](https://github.com/MetaMask/eth-trezor-keyring/pull/195))
- Bump `@trezor/connect-plugin-ethereum` from `^9.0.1` to `^9.0.3` ([#195](https://github.com/MetaMask/eth-trezor-keyring/pull/195))
- Should help fixing MM pop-up closing issue ([#10896](https://github.com/MetaMask/metamask-extension/issues/10896))

## [3.0.0]

### Changed

- **BREAKING**: Remove support for major node versions 14,15,17,19. Minimum Node.js version is now 16. ([#188](https://github.com/MetaMask/eth-trezor-keyring/pull/188))
- Bump `@metamask/eth-sig-util` from `^5.0.2` to `^7.0.0` ([#189](https://github.com/MetaMask/eth-trezor-keyring/pull/189))
- Bump dependency `hdkey` from `0.8.0` to `^2.1.0` ([#190](https://github.com/MetaMask/eth-trezor-keyring/pull/190))

## [2.0.0]

### Added

- Add `destroy` method to `TrezorKeyring`, which replaces `dispose` ([#179](https://github.com/MetaMask/eth-trezor-keyring/pull/179))

### Changed

- **BREAKING:** Separate the bridge from the keyring ([#143](https://github.com/MetaMask/eth-trezor-keyring/pull/143))
  - The Trezor bridge is now a separate class (`TrezorConnectBridge`), which must be constructed separately from the keyring and passed in as a constructor argument.
  - The bridge initialization has been moved from the keyring constructor to the keyring `init` method. The bridge is expected to be passed to the keyring uninitialized, and the keyring `init` method is expected to be called after keyring construction (before the keyring is used).
  - The keyring constructor no longer accepts keyring state. Instead, any pre-existing keyring state should be passed to the `deserialize` method after construction.

### Removed

- **BREAKING:** Remove `dispose` method from `TrezorKeyring`, which is replaced by `destroy` ([#179](https://github.com/MetaMask/eth-trezor-keyring/pull/179))

## [1.1.0]

### Added

- Add legacy derivation path, allowing generation of accounts with the `m/44'/60'/0` path ([#175](https://github.com/MetaMask/eth-trezor-keyring/pull/175))

### Changed

- Migrate to TypeScript ([#161](https://github.com/MetaMask/eth-trezor-keyring/pull/161))

## [1.0.0]

### Changed

- **BREAKING:** Rename package to use `@metamask` scope ([#160](https://github.com/MetaMask/eth-trezor-keyring/pull/160))
- **BREAKING:** Removed support for Node v12 in favor of v14 ([#135](https://github.com/MetaMask/eth-trezor-keyring/pull/135))
- Update `@ethereumjs/util`, `@ethereumjs/tx`, `@metamask/eth-sig-util` to latest versions ([#146](https://github.com/MetaMask/eth-trezor-keyring/pull/146))
- Bump trezor-connect - now @trezor/connect-plugin-ethereum & @trezor/connect-web - to v9 ([#133](https://github.com/MetaMask/eth-trezor-keyring/pull/133), [#163](https://github.com/MetaMask/eth-trezor-keyring/pull/163))

## [0.10.0]

### Added

- Support for EIP-721 signTypedData_v4 ([#117](https://github.com/MetaMask/eth-trezor-keyring/pull/117))

## [0.9.1]

### Changed

- Update trezor connect to 8.2.3, so that 1.10.4 of the Model One firmware is supported ([#115](https://github.com/MetaMask/eth-trezor-keyring/pull/115))

## [0.9.0]

### Added

- Add dispose method, which exposes the TrezorConnect.dispose method, allowing consumers to explictly remove the Trezor Connect iframe ([#113](https://github.com/MetaMask/eth-trezor-keyring/pull/13))

### Fixed

- Fixed the signing of contract creation transactions, which require a nullish (empty string or undefined) `to` parameter ([#112](https://github.com/MetaMask/eth-trezor-keyring/pull/112))

## [0.8.0]

### Added

- Support for EIP-1559 transactions for the Model T ([#108](https://github.com/MetaMask/eth-trezor-keyring/pull/108))
- Add setHdPath method, which allows setting the HD path used by the keyring to known, supported HD paths ([#107](https://github.com/MetaMask/eth-trezor-keyring/pull/107))

## [0.7.0]

### Added

- Support new versions of ethereumjs/tx ([#88](https://github.com/metamask/eth-trezor-keyring/pull/88))

[Unreleased]: https://github.com/MetaMask/accounts.git/compare/@metamask/eth-trezor-keyring@3.1.1...HEAD
[3.1.1]: https://github.com/MetaMask/accounts.git/compare/@metamask/eth-trezor-keyring@3.1.0...@metamask/eth-trezor-keyring@3.1.1
[3.1.0]: https://github.com/MetaMask/accounts.git/compare/@metamask/eth-trezor-keyring@3.0.0...@metamask/eth-trezor-keyring@3.1.0
[3.0.0]: https://github.com/MetaMask/accounts.git/compare/@metamask/eth-trezor-keyring@2.0.0...@metamask/eth-trezor-keyring@3.0.0
[2.0.0]: https://github.com/MetaMask/accounts.git/compare/@metamask/eth-trezor-keyring@1.1.0...@metamask/eth-trezor-keyring@2.0.0
[1.1.0]: https://github.com/MetaMask/accounts.git/compare/@metamask/eth-trezor-keyring@1.0.0...@metamask/eth-trezor-keyring@1.1.0
[1.0.0]: https://github.com/MetaMask/accounts.git/compare/@metamask/eth-trezor-keyring@0.10.0...@metamask/eth-trezor-keyring@1.0.0
[0.10.0]: https://github.com/MetaMask/accounts.git/compare/@metamask/eth-trezor-keyring@0.9.1...@metamask/eth-trezor-keyring@0.10.0
[0.9.1]: https://github.com/MetaMask/accounts.git/compare/@metamask/eth-trezor-keyring@0.9.0...@metamask/eth-trezor-keyring@0.9.1
[0.9.0]: https://github.com/MetaMask/accounts.git/compare/@metamask/eth-trezor-keyring@0.8.0...@metamask/eth-trezor-keyring@0.9.0
[0.8.0]: https://github.com/MetaMask/accounts.git/compare/@metamask/eth-trezor-keyring@0.7.0...@metamask/eth-trezor-keyring@0.8.0
[0.7.0]: https://github.com/MetaMask/accounts.git/releases/tag/@metamask/eth-trezor-keyring@0.7.0
