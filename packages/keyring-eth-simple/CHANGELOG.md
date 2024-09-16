# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [6.0.3]

### Uncategorized

- fix: fix preview builds artifacts ([#17](https://github.com/MetaMask/accounts/pull/17))
- refactor: remove nested .gitignores + use the top-level one ([#18](https://github.com/MetaMask/accounts/pull/18))
- feat: preview builds ([#15](https://github.com/MetaMask/accounts/pull/15))
- refactor: update all changelogs to use monorepo links
- build: add changelog:{validate,update} for each packages
- build: add yarn build:force command
- build: use tsc --build rather than tsc --project
- refactor: update global jest.config.js in packages + use it in packages
- refactor: remove packages/\*/.gitattributes
- refactor: remove packages/\*/.editorconfig
- refactor: move packages/keyring-api/.vscode -> .vscode + remove .vscode from other packages
- refactor: remove .nvmrc from all packages
- refactor: migrate depcheck to the top-level
- fix(prettier): update changelogs for kerying-eth-{hd,ledger-bridge,simple,trezor}
- chore: run prettier for all package.json
- refactor: remove packages/\*/.prettierrc.js + remove prettier from packages
- refactor: use top-level eslint + cleanup packages lint commands/files + adapt rules to match previous linting rules
- refactor: remove packages/_/.yarn_
- refactor: migrate .github folder to the top-level (without publish-\*docs.yml for now)
- refactor: remove packageManager from packages
- build: re-organize tsconfig.\* + force resolutions
- build: add new build/test commands for all packages
- refactor: remove packages/\*/yarn.lock
- refactor(eth-simple-keyring): \* -> packages/keyring-eth-simple

## [6.0.2]

### Changed

- Bump `@metamask/utils` from `^8.1.0` to `^9.0.0` ([#177](https://github.com/MetaMask/eth-simple-keyring/pull/177))

## [6.0.1]

### Fixed

- Treat `undefined` and `null` as empty array in deserialize function ([#163](https://github.com/MetaMask/eth-simple-keyring/pull/163))

## [6.0.0]

### Changed

- **BREAKING**: Increase minimum Node.js version to 16 ([#152](https://github.com/MetaMask/eth-simple-keyring/pull/152))
- **BREAKING**: Bump @metamask/eth-sig-util from ^6.0.1 to ^7.0.0 ([#156](https://github.com/MetaMask/eth-simple-keyring/pull/156))
- Bump @metamask/utils from ^5.0.0 to ^8.1.0 ([#153](https://github.com/MetaMask/eth-simple-keyring/pull/153))
- Bump ethereum-cryptography from ^1.2.0 to ^2.1.2 ([#153](https://github.com/MetaMask/eth-simple-keyring/pull/153))

## [5.1.1]

### Fixed

- Treat `undefined` and `null` as empty array in deserialize function ([#166](https://github.com/MetaMask/eth-simple-keyring/pull/166))

## [5.1.0]

### Changed

- Export TypeScript interfaces ([#140](https://github.com/MetaMask/eth-simple-keyring/pull/140))
- Update all dependencies ([#140](https://github.com/MetaMask/eth-simple-keyring/pull/140)) ([#149](https://github.com/MetaMask/eth-simple-keyring/pull/149))

### Fixed

- Add `validateMessage` option to `signMessage` to configure if runtime-validation should be done that input string is hex (default: `true`) ([#148](https://github.com/MetaMask/eth-simple-keyring/pull/148))

## [5.0.0]

### Changed

- **BREAKING:** Makes version-specific `signTypedData` methods private ([#84](https://github.com/MetaMask/eth-simple-keyring/pull/84))
  - Consumers should use the generic `signTypedData` method and pass the version they'd like as a property in the options argument.
- **BREAKING:** Makes the `wallets` property private ([#87](https://github.com/MetaMask/eth-simple-keyring/pull/87))
  - Consumers should not use this property as it is intended for internal use only.
- **BREAKING:** Makes `getPrivateKeyFor` a private method ([#83](https://github.com/MetaMask/eth-simple-keyring/pull/83))
  - Consumers who wish to get the private key for a given account should use the `exportAccount` method.
- **BREAKING:** Set the minimum Node.js version to 14 ([#68](https://github.com/MetaMask/eth-simple-keyring/pull/68)) ([#109](https://github.com/MetaMask/eth-simple-keyring/pull/109))
- Always return rejected Promise upon failure ([#85](https://github.com/MetaMask/eth-simple-keyring/pull/85))

### Removed

- **BREAKING:** Remove redundant `newGethSignMessage` method ([#72](https://github.com/MetaMask/eth-simple-keyring/pull/72))
  - Consumers can use `signPersonalMessage` method as a replacement for `newGethSignMessage`.

[Unreleased]: https://github.com/MetaMask/accounts/compare/@metamask/eth-simple-keyring@6.0.3...HEAD
[6.0.3]: https://github.com/MetaMask/accounts/compare/@metamask/eth-simple-keyring@6.0.2...@metamask/eth-simple-keyring@6.0.3
[6.0.2]: https://github.com/MetaMask/accounts/compare/@metamask/eth-simple-keyring@6.0.1...@metamask/eth-simple-keyring@6.0.2
[6.0.1]: https://github.com/MetaMask/accounts/compare/@metamask/eth-simple-keyring@6.0.0...@metamask/eth-simple-keyring@6.0.1
[6.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/eth-simple-keyring@5.1.1...@metamask/eth-simple-keyring@6.0.0
[5.1.1]: https://github.com/MetaMask/accounts/compare/@metamask/eth-simple-keyring@5.1.0...@metamask/eth-simple-keyring@5.1.1
[5.1.0]: https://github.com/MetaMask/accounts/compare/@metamask/eth-simple-keyring@5.0.0...@metamask/eth-simple-keyring@5.1.0
[5.0.0]: https://github.com/MetaMask/accounts/releases/tag/@metamask/eth-simple-keyring@5.0.0
