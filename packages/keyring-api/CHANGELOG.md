# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [8.1.0]

### Added

- Add optional `nameLastUpdatedAt` metadata field ([#366](https://github.com/MetaMask/keyring-api/pull/366))

### Changed

- Bump @metamask/snaps-sdk from 6.1.0 to 6.2.0 ([#367](https://github.com/MetaMask/keyring-api/pull/367))
- Bump @metamask/providers from 17.1.1 to 17.1.2 ([#362](https://github.com/MetaMask/keyring-api/pull/362))

## [8.0.2]

### Changed

- Bump `@metamask/snaps-sdk` from `^6.0.0` to `^6.1.0` ([#358](https://github.com/MetaMask/keyring-api/pull/358))

## [8.0.1]

### Changed

- Migrate to @metamask/superstruct and update required dependencies ([#355](https://github.com/MetaMask/keyring-api/pull/355)).
- Bump @metamask/providers from 17.1.0 to 17.1.1 ([#354](https://github.com/MetaMask/keyring-api/pull/354)).
- Bump @metamask/key-tree from 9.1.1 to 9.1.2 ([#351](https://github.com/MetaMask/keyring-api/pull/351)).
- Bump @metamask/rpc-errors from 6.3.0 to 6.3.1 ([#350](https://github.com/MetaMask/keyring-api/pull/350)).
- Bump @metamask/providers from 17.0.0 to 17.1.0 ([#348](https://github.com/MetaMask/keyring-api/pull/348)).
- Bump @metamask/snaps-sdk from 4.4.2 to 6.0.0 ([#347](https://github.com/MetaMask/keyring-api/pull/347)).
- Bump braces from 3.0.2 to 3.0.3 ([#345](https://github.com/MetaMask/keyring-api/pull/345)).

## [8.0.0]

### Changed

- **BREAKING:** Revert "feat: allow multiple address per account (#315)" ([#342](https://github.com/MetaMask/keyring-api/pull/342)).

## [7.0.0]

### Added

- Add `getAccountBalances` to `KeyringClient` ([#340](https://github.com/MetaMask/keyring-api/pull/340)).
- **BREAKING:** Allow multiple address per account ([#315](https://github.com/MetaMask/keyring-api/pull/315)).

### Changed

- **BREAKING:** Keep all ETH methods in the same `enum` ([#313](https://github.com/MetaMask/keyring-api/pull/313)).
- Bump @metamask/snaps-sdk from 4.4.1 to 4.4.2 ([#339](https://github.com/MetaMask/keyring-api/pull/339)).
- Bump @metamask/rpc-errors from 6.2.1 to 6.3.0 ([#337](https://github.com/MetaMask/keyring-api/pull/337)).
- Bump @metamask/json-rpc-middleware-stream from 7.0.1 to 7.0.2 ([#333](https://github.com/MetaMask/keyring-api/pull/333)).
- Bump @metamask/snaps-sdk from 4.4.0 to 4.4.1 ([#334](https://github.com/MetaMask/keyring-api/pull/334)).

### Fixed

- Allow stale action to be run manually and fix permissions ([#336](https://github.com/MetaMask/keyring-api/pull/336)).

## [6.4.0]

### Changed

- **BREAKING:** Keep all ETH methods in the same `enum` ([#313](https://github.com/MetaMask/keyring-api/pull/313)).
- Add support for `@metamask/providers` v17 ([#329](https://github.com/MetaMask/keyring-api/pull/329)).

## [6.3.1]

### Changed

- **BREAKING:** Keep all ETH methods in the same `enum` ([#313](https://github.com/MetaMask/keyring-api/pull/313)).

### Fixed

- Export `Caip*` types used in the API ([#325](https://github.com/MetaMask/keyring-api/pull/325)).

## [6.3.0]

### Added

- Add `getAccountBalances` method to `Keyring` interface ([#320](https://github.com/MetaMask/keyring-api/pull/320)).
- Add CAIP-19 types to `utils` ([#321](https://github.com/MetaMask/keyring-api/pull/321)).

### Changed

- **BREAKING:** Keep all ETH methods in the same `enum` ([#313](https://github.com/MetaMask/keyring-api/pull/313)).
- Bump @metamask/snaps-sdk from 4.2.0 to 4.3.0 ([#323](https://github.com/MetaMask/keyring-api/pull/323)).
- Split `api.ts` into different files ([#319](https://github.com/MetaMask/keyring-api/pull/319)).
- Make the `KeyringAccount` type less rigid ([#311](https://github.com/MetaMask/keyring-api/pull/311)).

### Fixed

- Ensure that errors are JSON-serializable ([#162](https://github.com/MetaMask/keyring-api/pull/162)).
- Don't use internal types in the public API ([#312](https://github.com/MetaMask/keyring-api/pull/312)).

## [6.2.1]

### Changed

- Bump @metamask/key-tree from 9.1.0 to 9.1.1 ([#310](https://github.com/MetaMask/keyring-api/pull/310)).

### Fixed

- Use internal `object` function instead of the upstream one ([#316](https://github.com/MetaMask/keyring-api/pull/316)).

## [6.2.0]

### Added

- Add `accountNameSuggestion` field to the `AccountCreatedEvent` ([#291](https://github.com/MetaMask/keyring-api/pull/291))
- Add `displayConfirmation` field to the `AccountCreatedEvent` ([#307](https://github.com/MetaMask/keyring-api/pull/307))

## [6.1.1]

### Changed

- Fix `isEvmAccountType` accountType type to `string` or `InternalAccountType` ([#304](https://github.com/MetaMask/keyring-api/pull/304))
- Bump @metamask/snaps-sdk from ^4.0.0 to ^4.2.0 ([#305](https://github.com/MetaMask/keyring-api/pull/305))

## [6.1.0]

### Added

- Add `isEvmAccountType` helper ([#297](https://github.com/MetaMask/keyring-api/pull/297))
- Add `bip121:p2wpkh` account support ([#294](https://github.com/MetaMask/keyring-api/pull/294))

### Changed

- Remove incorrect `SignTransaction` from `EthErc4337Account` ([#300](https://github.com/MetaMask/keyring-api/pull/300))
- Bump @metamask/providers from 16.0.0 to 16.1.0 ([#298](https://github.com/MetaMask/keyring-api/pull/298))
- Bump @metamask/snaps-sdk from 4.0.0 to 4.0.1 ([#292](https://github.com/MetaMask/keyring-api/pull/292))
- Split account types (EOA + Erc4337) ([#293](https://github.com/MetaMask/keyring-api/pull/293))

## [6.0.0]

### Changed

- **BREAKING**: Add `importTime` property to `InternalAccount` metadata ([#289](https://github.com/MetaMask/keyring-api/pull/289))
- Bump tar from 6.1.15 to 6.2.1 ([#286](https://github.com/MetaMask/keyring-api/pull/286))
- Bump @metamask/snaps-sdk from 3.2.0 to 4.0.0 ([#287](https://github.com/MetaMask/keyring-api/pull/287))
- Add documentation for `eth_decodeUserOperationCallData` ([#254](https://github.com/MetaMask/keyring-api/pull/254))
- Bump @metamask/snaps-sdk from 3.1.1 to 3.2.0 ([#284](https://github.com/MetaMask/keyring-api/pull/284))

## [5.1.0]

### Changed

- Use @metamask/providers as a peer dependency ([#282](https://github.com/MetaMask/keyring-api/pull/282))
- Bump @metamask/utils from 8.3.0 to 8.4.0 ([#280](https://github.com/MetaMask/keyring-api/pull/280))
- Add stale CI workflow to close issues and PRs ([#279](https://github.com/MetaMask/keyring-api/pull/279))

## [5.0.0]

### Changed

- **BREAKING**: Add new `KeyringExecutionContext` to user operation methods ([#275](https://github.com/MetaMask/keyring-api/pull/275))
- Fix bundler type (defined as `string` now) ([#277](https://github.com/MetaMask/keyring-api/pull/277))
- Bump @metamask/providers from 15.0.0 to 16.0.0 ([#276](https://github.com/MetaMask/keyring-api/pull/276))
- Bump @metamask/safe-event-emitter from 3.1.0 to 3.1.1 ([#274](https://github.com/MetaMask/keyring-api/pull/274))

## [4.0.2]

### Changed

- Bump @metamask/snaps-sdk to ^3.1.1 ([#271](https://github.com/MetaMask/keyring-api/pull/271))
- Bump @metamask/safe-event-emitter from 3.0.0 to 3.1.0 ([#270](https://github.com/MetaMask/keyring-api/pull/270))
- Fix bundler URL validation ([#262](https://github.com/MetaMask/keyring-api/pull/262))

## [4.0.1]

### Changed

- Bump @metamask/providers to 15.0.0, @metamask/snaps-sdk to ^3.1.0 and @@metamask/utils to ^8.3.0([#266](https://github.com/MetaMask/keyring-api/pull/266))
- Bump @metamask/json-rpc-engine from 7.3.2 to 7.3.3 ([#264](https://github.com/MetaMask/keyring-api/pull/264))
- Bump @metamask/snaps-sdk from 3.0.0 to 3.0.1 ([#261](https://github.com/MetaMask/keyring-api/pull/261))
- Bump @metamask/snaps-sdk from 1.4.0 to 3.0.0 ([#259](https://github.com/MetaMask/keyring-api/pull/259))
- Bump @metamask/rpc-errors from 6.1.0 to 6.2.1 ([#258](https://github.com/MetaMask/keyring-api/pull/258))

## [4.0.0]

### Changed

- **BREAKING** Update node min version to 18.x ([#247](https://github.com/MetaMask/keyring-api/pull/247))
- Update `eth_patchUserOperation` to return optional gas limit values ([#250](https://github.com/MetaMask/keyring-api/pull/250))
- Bump `ip` from 2.0.0 to 2.0.1 ([#253](https://github.com/MetaMask/keyring-api/pull/253))
- Bump `@metamask/json-rpc-engine` from 7.3.1 to 7.3.2 ([#246](https://github.com/MetaMask/keyring-api/pull/246))
- Bump `@metamask/snaps-sdk` from 1.3.2 to 1.4.0 ([#243](https://github.com/MetaMask/keyring-api/pull/243))

## [3.0.0]

### Changed

- Bump `@metamask/utils` from 8.2.1 to 8.3.0 ([#238](https://github.com/MetaMask/keyring-api/pull/238))
- Bump Snap dependencies ([#236](https://github.com/MetaMask/keyring-api/pull/236))
  - Bump `@metamask/snaps-controllers` to ^4.0.0
  - Bump `@metamask/snaps-sdk` to ^1.3.2
  - Bump `@metamask/snaps-utils` to ^5.1.2
- Bump `@metamask/approval-controller` from 5.0.0 to 5.1.1 ([#225](https://github.com/MetaMask/keyring-api/pull/225))
- Bump `@metamask/base-controller` from 4.0.0 to 4.0.1 ([#226](https://github.com/MetaMask/keyring-api/pull/226))
- Bump `@metamask/json-rpc-engine` from 7.3.0 to 7.3.1 ([#227](https://github.com/MetaMask/keyring-api/pull/227))
- Bump `@metamask/auto-changelog` from 3.4.3 to 3.4.4 ([#223](https://github.com/MetaMask/keyring-api/pull/223))
- Bump `@metamask/snaps-sdk` from 1.3.0 to 1.3.1 ([#222](https://github.com/MetaMask/keyring-api/pull/222))

### Removed

- **BREAKING**: remove `KeyringSnapControllerClient` class to fix dependency problems ([#241](https://github.com/MetaMask/keyring-api/pull/241))

## [2.0.0]

### Added

- **BREAKING**: Add support for ERC-4337 transactions ([#213](https://github.com/MetaMask/keyring-api/pull/213))
  - Enum `EthMethods` has been extended with `eth_prepareUserOperation`, `eth_patchUserOperation`, `eth_signUserOperation`
  - Enum `EthAccountType` has been extended with `eip155:erc4337`

### Changed

- **BREAKING**: Update `@metamask/providers` from `^13.0.0` to `^14.0.1` ([#209](https://github.com/MetaMask/keyring-api/pull/209))
  - Consolidation on `readable-stream@^3.6.2`. Users should upgrade to `extension-port-stream@^3.0.0` and `json-rpc-middleware-stream@^5.0.0`.
- Replace deprecated `@metamask/snaps-ui` with `@metamask/snaps-sdk` ([#204](https://github.com/MetaMask/keyring-api/pull/204))
  - Replace `@metamask/snaps-rpc-methods` with `@metamask/snaps-sdk`
  - Update `@metamask/snaps-controllers` and `@metamask/snaps-utils` to versions that don't rely on `@metamask/snaps-ui`
- Documentation updates ([#185](https://github.com/MetaMask/keyring-api/pull/185)) ([#201](https://github.com/MetaMask/keyring-api/pull/201))

### Removed

- **BREAKING** `EthAccountType.Eip4337` has been removed. `eip155:eip4337` should be replaced with `erc:4337`

### Fixed

- Exclude `*.test-d.ts` files from builds ([#184](https://github.com/MetaMask/keyring-api/pull/184))
- Remove `@metamask/snaps-ui` from dependency tree ([#204](https://github.com/MetaMask/keyring-api/pull/204))

## [1.1.0]

### Changed

- `UuidStruct` is now a named type ([#159](https://github.com/MetaMask/keyring-api/pull/159))
- Migrate from `@metamask/rpc-methods` to `@metamask/snaps-rpc-methods` ([#175](https://github.com/MetaMask/keyring-api/pull/175))

### Fixed

- Allow the request ID to be a string, number or null ([#156](https://github.com/MetaMask/keyring-api/pull/156))
- Documentation fixes ([#160](https://github.com/MetaMask/keyring-api/pull/160)) ([#174](https://github.com/MetaMask/keyring-api/pull/174)) ([#173](https://github.com/MetaMask/keyring-api/pull/173)) ([#172](https://github.com/MetaMask/keyring-api/pull/172))
- Use `UuidStruct` for IDs in the internal API ([#158](https://github.com/MetaMask/keyring-api/pull/158))
- Bump `@metamask/json-rpc-engine` from `^7.1.1` to `^7.2.0` ([#164](https://github.com/MetaMask/keyring-api/pull/164))

## [1.0.0]

### Added

- Add migration steps to 1.0.0 ([#149](https://github.com/MetaMask/keyring-api/pull/149)).
- Add Account Snaps security guidelines ([#143](https://github.com/MetaMask/keyring-api/pull/143)).

### Changed

- Bump @metamask/rpc-errors from 6.0.0 to 6.1.0 ([#151](https://github.com/MetaMask/keyring-api/pull/151)).
- Bump postcss from 8.4.24 to 8.4.31 ([#150](https://github.com/MetaMask/keyring-api/pull/150)).

## [1.0.0-rc.1]

### Added

- Document how to migrate from API 0.1.x to 0.2.x ([#124](https://github.com/MetaMask/keyring-api/pull/124)).

### Changed

- **BREAKING:** Use the `onKeyringRequest` snap export ([#145](https://github.com/MetaMask/keyring-api/pull/145)).
- **BREAKING:** Change the events' prefix to `notify:` ([#139](https://github.com/MetaMask/keyring-api/pull/139)).

## [0.2.7]

### Added

- Export events types ([#125](https://github.com/MetaMask/keyring-api/pull/125))

## [0.2.6]

### Changed

- Remove unused lavamoat allowed scripts ([#122](https://github.com/MetaMask/keyring-api/pull/122)).
- Update events in sequence diagram ([#121](https://github.com/MetaMask/keyring-api/pull/121)).
- Update Snap and ESLint dependencies ([#117](https://github.com/MetaMask/keyring-api/pull/117)).
- Bump @metamask/rpc-methods from 0.38.1-flask.1 to 2.0.0 ([#120](https://github.com/MetaMask/keyring-api/pull/120)).

## [0.2.5]

### Changed

- Remove `buildHandlersChain` ([#114](https://github.com/MetaMask/keyring-api/pull/114)).
- Update doc for `eth_signTransaction` ([#111](https://github.com/MetaMask/keyring-api/pull/111)).
- Remove un-versioned `eth_signTypedData` method ([#113](https://github.com/MetaMask/keyring-api/pull/113)).

## [0.2.4]

### Changed

- Fix linting and compatibility with older `tsc` ([#108](https://github.com/MetaMask/keyring-api/pull/108)).

## [0.2.3]

### Added

- Add redirection message to snap async response ([#102](https://github.com/MetaMask/keyring-api/pull/102)).

### Changed

- Use `Omit` instead of `OmitUnion` ([#106](https://github.com/MetaMask/keyring-api/pull/106)).
- Update `KeyringResponse` comment ([#103](https://github.com/MetaMask/keyring-api/pull/103)).
- Use `KeyringRpcMethod` enum instead of string ([#105](https://github.com/MetaMask/keyring-api/pull/105)).
- Refactor tests to match superstruct examples ([#104](https://github.com/MetaMask/keyring-api/pull/104)).
- Add `exactOptional()` superstruct type ([#100](https://github.com/MetaMask/keyring-api/pull/100)).
- Bump @metamask/providers from 11.1.2 to 12.0.0 ([#99](https://github.com/MetaMask/keyring-api/pull/99)).
- Bump @metamask/providers from 11.1.1 to 11.1.2 ([#98](https://github.com/MetaMask/keyring-api/pull/98)).

## [0.2.2]

### Added

- Add architecture and EVM methods docs ([#86](https://github.com/MetaMask/keyring-api/pull/86)).
- Add `lastSelected` and `lastActive` to metadata ([#92](https://github.com/MetaMask/keyring-api/pull/92)).

### Changed

- Make request `params` optional ([#96](https://github.com/MetaMask/keyring-api/pull/96)).
- Remove `lastActive` field from internal account model ([#95](https://github.com/MetaMask/keyring-api/pull/95)).
- Move request ID to outer request ([#94](https://github.com/MetaMask/keyring-api/pull/94)).

## [0.2.1]

### Changed

- Set `snap` object keys to be mandatory and move `name` to `metadata` ([#87](https://github.com/MetaMask/keyring-api/pull/87)).

## [0.2.0]

### Added

- Add `InternalAccount` type and create submodule `internal` ([#65](https://github.com/MetaMask/keyring-api/pull/65)).
- Add keyring events and helper functions ([#74](https://github.com/MetaMask/keyring-api/pull/74)).
- Add a `redirect` field to asynchronous request responses ([#75](https://github.com/MetaMask/keyring-api/pull/75)).
- Add `exportAccount` method ([#60](https://github.com/MetaMask/keyring-api/pull/60)).
- Add `getController` to client ([#43](https://github.com/MetaMask/keyring-api/pull/43)).

### Changed

- Rename `erc4337` -> `eip4337` ([#42](https://github.com/MetaMask/keyring-api/pull/42)).
- Make `options` a mandatory field of `KeyringAccount` ([#30](https://github.com/MetaMask/keyring-api/pull/30)).
- Make `approveRequest` and `rejectRequest` optional ([#63](https://github.com/MetaMask/keyring-api/pull/63)).
- Make `exportAccount`, `listRequests` and `getRequest` optional ([#73](https://github.com/MetaMask/keyring-api/pull/73)).
- Export enums with account methods and types ([#66](https://github.com/MetaMask/keyring-api/pull/66)).
- Make `approveRequest` accept a `result` argument ([#59](https://github.com/MetaMask/keyring-api/pull/59)).
- Remove account name from `KeyringAccount` type ([#55](https://github.com/MetaMask/keyring-api/pull/55)).
- Remove `eth_sendTransaction` method ([#50](https://github.com/MetaMask/keyring-api/pull/50)).
- Rename `supportedMethods` to `methods` ([#35](https://github.com/MetaMask/keyring-api/pull/35)).

## [0.1.3]

### Changed

- Downgrade snaps dependencies to `0.35.2-flask.1` ([#25](https://github.com/MetaMask/keyring-api/pull/25)).

## [0.1.2]

### Changed

- Update snaps dependencies ([#21](https://github.com/MetaMask/keyring-api/pull/21)).

## [0.1.1]

### Added

- Validate snap responses for type correctness ([#15](https://github.com/MetaMask/keyring-api/pull/15)).

### Changed

- Rename RPC handling functions ([#16](https://github.com/MetaMask/keyring-api/pull/16)).

## [0.1.0] - 2023-06-20

### Added

- Usage examples to [`README.md`](./README.md).
- Keyring API definition.
- JSON-RPC snap keyring client. It is intended to be used by a snap's companion dapp to send requests to the snap.
- SnapController keyring client. It is intended to be used by MetaMask to talk to the snap.
- Helper functions to create keyring handler in the snap.

[Unreleased]: https://github.com/MetaMask/keyring-api/compare/v8.1.0...HEAD
[8.1.0]: https://github.com/MetaMask/keyring-api/compare/v8.0.2...v8.1.0
[8.0.2]: https://github.com/MetaMask/keyring-api/compare/v8.0.1...v8.0.2
[8.0.1]: https://github.com/MetaMask/keyring-api/compare/v8.0.0...v8.0.1
[8.0.0]: https://github.com/MetaMask/keyring-api/compare/v7.0.0...v8.0.0
[7.0.0]: https://github.com/MetaMask/keyring-api/compare/v6.4.0...v7.0.0
[6.4.0]: https://github.com/MetaMask/keyring-api/compare/v6.3.1...v6.4.0
[6.3.1]: https://github.com/MetaMask/keyring-api/compare/v6.3.0...v6.3.1
[6.3.0]: https://github.com/MetaMask/keyring-api/compare/v6.2.1...v6.3.0
[6.2.1]: https://github.com/MetaMask/keyring-api/compare/v6.2.0...v6.2.1
[6.2.0]: https://github.com/MetaMask/keyring-api/compare/v6.1.1...v6.2.0
[6.1.1]: https://github.com/MetaMask/keyring-api/compare/v6.1.0...v6.1.1
[6.1.0]: https://github.com/MetaMask/keyring-api/compare/v6.0.0...v6.1.0
[6.0.0]: https://github.com/MetaMask/keyring-api/compare/v5.1.0...v6.0.0
[5.1.0]: https://github.com/MetaMask/keyring-api/compare/v5.0.0...v5.1.0
[5.0.0]: https://github.com/MetaMask/keyring-api/compare/v4.0.2...v5.0.0
[4.0.2]: https://github.com/MetaMask/keyring-api/compare/v4.0.1...v4.0.2
[4.0.1]: https://github.com/MetaMask/keyring-api/compare/v4.0.0...v4.0.1
[4.0.0]: https://github.com/MetaMask/keyring-api/compare/v3.0.0...v4.0.0
[3.0.0]: https://github.com/MetaMask/keyring-api/compare/v2.0.0...v3.0.0
[2.0.0]: https://github.com/MetaMask/keyring-api/compare/v1.1.0...v2.0.0
[1.1.0]: https://github.com/MetaMask/keyring-api/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/MetaMask/keyring-api/compare/v1.0.0-rc.1...v1.0.0
[1.0.0-rc.1]: https://github.com/MetaMask/keyring-api/compare/v0.2.7...v1.0.0-rc.1
[0.2.7]: https://github.com/MetaMask/keyring-api/compare/v0.2.6...v0.2.7
[0.2.6]: https://github.com/MetaMask/keyring-api/compare/v0.2.5...v0.2.6
[0.2.5]: https://github.com/MetaMask/keyring-api/compare/v0.2.4...v0.2.5
[0.2.4]: https://github.com/MetaMask/keyring-api/compare/v0.2.3...v0.2.4
[0.2.3]: https://github.com/MetaMask/keyring-api/compare/v0.2.2...v0.2.3
[0.2.2]: https://github.com/MetaMask/keyring-api/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/MetaMask/keyring-api/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/MetaMask/keyring-api/compare/v0.1.3...v0.2.0
[0.1.3]: https://github.com/MetaMask/keyring-api/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/MetaMask/keyring-api/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/MetaMask/keyring-api/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/MetaMask/keyring-api/releases/tag/v0.1.0
