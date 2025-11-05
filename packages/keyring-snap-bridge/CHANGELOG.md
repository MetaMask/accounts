# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [18.0.1]

### Changed

- Bump `@metamask/keyring-api` from `^21.1.0` to `^21.2.0` ([#395](https://github.com/MetaMask/accounts/pull/395))
- Bump `@metamask/keyring-snap-sdk` from `^7.1.0` to `^7.2.0` ([#395](https://github.com/MetaMask/accounts/pull/395))

## [18.0.0]

### Changed

- **BREAKING:** Migrate `SnapKeyringMessenger` to new `Messenger` type from `@metamask/messenger` ([#383](https://github.com/MetaMask/accounts/pull/383))

## [17.3.0]

### Added

- Add `SnapKeyring.setSelectedAccounts` and `snap_manageAccounts.getSelectedAccounts` support ([#387](https://github.com/MetaMask/accounts/pull/387))
  - The `SnapKeyring.setSelectedAccounts` method can be invoked by the MetaMask client to inform which accounts are now selected for this Snap.
  - The `snap_manageAccounts.getSelectedAccounts` RPC method can be invoked by the Snap to get the currently selected accounts for this Snap.

### Changed

- Add dependency to `@metamask/keyring-snap-sdk` version `^7.1.0` ([#387](https://github.com/MetaMask/accounts/pull/387)), ([#388](https://github.com/MetaMask/accounts/pull/388))
- Bump `@metamask/keyring-api` from `^21.0.0` to `^21.1.0` ([#388](https://github.com/MetaMask/accounts/pull/388))

## [17.2.0]

### Added

- Add `name` and `state` properties to `SnapKeyring` to allow modular initialisation in the clients ([#379](https://github.com/MetaMask/accounts/pull/379))

### Changed

- `SnapKeyring` no longer extend `EventEmitter` ([#379](https://github.com/MetaMask/accounts/pull/379))

## [17.1.0]

### Changed

- Bump `@metamask/base-controller` from `^7.1.1` to `^8.3.0` ([#364](https://github.com/MetaMask/accounts/pull/364))

## [17.0.0]

### Changed

- **BREAKING:** Bump `@metamask/keyring-api` from `^20.0.0` to `^21.0.0` ([#355](https://github.com/MetaMask/accounts/pull/355)), ([#356](https://github.com/MetaMask/accounts/pull/356))

## [16.1.0]

### Added

- Add Tron support ([#349](https://github.com/MetaMask/accounts/pull/349))

## [16.0.0]

### Changed

- **BREAKING:** Bump `@metamask/keyring-api` from `^19.0.0` to `^20.0.0` ([#347](https://github.com/MetaMask/accounts/pull/347))
  - This is similar to version `15.0.0`, but since the `@metamask/keyring-api` was not versioned as a new major, we have to re-bump it here again.
- **BREAKING:** Bump `@metamask/keyring-internal-api` from `^7.0.0` to `^8.0.0` ([#347](https://github.com/MetaMask/accounts/pull/347))
  - This is similar to version `15.0.0`, but since the `@metamask/keyring-internal-api` was not versioned as a new major, we have to re-bump it here again.

## [15.0.0]

### Changed

- **BREAKING:** Add `isAnyAccountTypeAllowed` flag to `SnapKeyring` constructor ([#322](https://github.com/MetaMask/accounts/pull/322))
  - The `SnapKeyring` constructor now accepts an options object instead of individual parameters.
  - The new `isAnyAccountTypeAllowed` flag defaults to `false`.
  - This flag only affects account creation and update; account deletion is unaffected by it.

## [14.0.0]

### Changed

- **BREAKING:** Bump `@metamask/keyring-api` from `^18.0.0` to `^19.0.0` ([#317](https://github.com/MetaMask/accounts/pull/317))
  - The `KeyringAccount.options` field is now partially typed.
- **BREAKING:** Bump `@metamask/keyring-internal-api` from `^6.2.0` to `^7.0.0` ([#317](https://github.com/MetaMask/accounts/pull/317))
  - The `InternalAccount.options` field is now partially typed.

## [13.0.0]

### Changed

- **BREAKING:** Now requires `origin` to be passed to `SnapKeyring.submitRequest` ([#273](https://github.com/MetaMask/accounts/pull/273))
  - Starting from `KeyringVersion.V2` (platform version: `7.0.0`), Snaps will now have to use `@metamask/keyring-api@18.0.0` and use the `origin` when processing keyring requests (`submitRequest`).
- Bump `@metamask/keyring-api` from `^17.6.0` to `^18.0.0` ([#291](https://github.com/MetaMask/accounts/pull/291))

## [12.2.0]

### Added

- Add support for Bitcoin account type: p2pkh, p2sh, p2tr ([#284](https://github.com/MetaMask/accounts/pull/284))

### Changed

- Bump `@metamask/keyring-api` from `^17.4.0` to `^17.6.0` ([#277](https://github.com/MetaMask/accounts/pull/277)), ([#288](https://github.com/MetaMask/accounts/pull/288))

## [12.1.1]

### Changed

- Bump `@metamask/keyring-api` from `^17.1.0` to `^17.4.0` ([#212](https://github.com/MetaMask/accounts/pull/212)), ([#220](https://github.com/MetaMask/accounts/pull/220)), ([#263](https://github.com/MetaMask/accounts/pull/263)), ([#269](https://github.com/MetaMask/accounts/pull/269))

## [12.1.0]

### Added

- Add new concept of "internal options" and add a new `SnapKeyring.createAccount` method ([#252](https://github.com/MetaMask/accounts/pull/252)), ([#261](https://github.com/MetaMask/accounts/pull/261))
  - Those internal options can be used by the caller of that method to customize the account creation flow.
- Add `setSelectedAccount` internal option ([#257](https://github.com/MetaMask/accounts/pull/257))

## [12.0.0]

### Changed

- **BREAKING:** The method `signTransaction` can now returns various type of transactions ([#209](https://github.com/MetaMask/accounts/pull/209))
  - Initially was supporting: `Transaction | AccessListEIP2930Transaction | FeeMarketEIP1559Transaction` (types from `@ethereumjs/tx`).
  - Now also supports `BlobEIP4844Transaction | EOACodeEIP7702Transaction` (types from `@ethereumjs/tx`).
- **BREAKING:** Bump `@ethereumjs/tx` from `^4.2.0` to `^5.4.0` ([#209](https://github.com/MetaMask/accounts/pull/209))

## [11.1.0]

### Added

- Add `displayAccountNameSuggestion` option handling for `"notify:accountCreated"` ([#213](https://github.com/MetaMask/accounts/pull/213))

## [11.0.0]

### Changed

- **BREAKING:** Make account creation asynchronous ([#207](https://github.com/MetaMask/accounts/pull/207)), ([#211](https://github.com/MetaMask/accounts/pull/211))
  - We no longer wait for `saveState` to finish before resuming the Snap account execution.
  - Add `onceSaved` deferred promise to `addAccount` callback. This new promise is required so the callback can `await` the account creation.
- Use `ts-bridge/cli@0.6.3` ([#214](https://github.com/MetaMask/accounts/pull/214))
  - This new version fixes a bug regarding some missing exports.
- Bump `@metamask/keyring-api` from `^17.0.0` to `^17.1.0` ([#212](https://github.com/MetaMask/accounts/pull/212))

## [10.0.0]

### Changed

- **BREAKING:** Use `CaipAccountId` for `ResolvedAccountAddress.address` ([#186](https://github.com/MetaMask/accounts/pull/186))
  - This was missing from SIP-26, but we expect this address to be CAIP-10 compliant.
- Bump `@metamask/keyring-api` from `^16.1.0` to `^17.0.0` ([#192](https://github.com/MetaMask/accounts/pull/192))
- Rename `ControllerMessenger` to `Messenger` ([#185](https://github.com/MetaMask/accounts/pull/185))
- Bump `@metamask/snaps-controllers` dependency from `^9.10.0` to `^9.18.0` ([#177](https://github.com/MetaMask/accounts/pull/177))
- Bump `@metamask/snaps-sdk` dependency from `^6.7.0` to `^6.16.0` ([#177](https://github.com/MetaMask/accounts/pull/177))
- Bump `@metamask/snaps-utils` dependency from `^8.3.0` to `^8.9.1` ([#177](https://github.com/MetaMask/accounts/pull/177))

## [9.1.1]

### Changed

- Bump `@metamask/keyring-api` from `^16.0.0` to `^16.1.0` ([#176](https://github.com/MetaMask/accounts/pull/176))

## [9.1.0]

### Added

- Add `submitRequest` and `resolveAccountAddress` methods ([#157](https://github.com/MetaMask/accounts/pull/157))
  - Those new methods are required by the new signing request routing system (see SIP-26).

### Changed

- Bump `@metamask/keyring-api` from `^15.0.0` to `^16.0.0` ([#172](https://github.com/MetaMask/accounts/pull/172))
- Bump `@metamask/utils` from `^11.0.1` to `^11.1.0` ([#167](https://github.com/MetaMask/accounts/pull/167))

### Fixed

- Fix async Snap request leak ([#171](https://github.com/MetaMask/accounts/pull/171))
  - There was a leak with the deferred promises when an asynchronous request was not allowed.

## [9.0.0]

### Added

- Add `account{AssetList,Balances,Transactions}Updated` keyring events and re-publish them through the new `Messenger` ([#154](https://github.com/MetaMask/accounts/pull/154))

### Changed

- **BREAKING:** Use `Messenger` instead of `SnapsController` ([#152](https://github.com/MetaMask/accounts/pull/152))
  - This allows to break the runtime dependency we had with some `snaps-*` pacakges.
- **BREAKING:** Make `scopes` more strict ([#159](https://github.com/MetaMask/accounts/pull/159))
  - We now use specific `*AccountStucts` when checking created/updated accounts to make the `scopes` sent by the Snap are valid regarding their account type definition.

## [8.1.1]

### Changed

- Bump `@metamask/keyring-api` from `^13.0.0` to `^14.0.0` ([#155](https://github.com/MetaMask/accounts/pull/155))

## [8.1.0]

### Added

- Add Snap keyring migrations ([#147](https://github.com/MetaMask/accounts/pull/147))
  - This is required to support the new `scopes` field on `KeyringAccount`. The keyring state will now be automatically migrated upon deserialization to match the latest `KeyringAccount` type requirements.

## [8.0.0]

### Changed

- **BREAKING:** Bump `@metamask/keyring-api` from `^12.0.0` to `^13.0.0` ([#101](https://github.com/MetaMask/accounts/pull/101))
  - This change was not properly reported as breaking on the `7.1.0`.
  - `KeyringAccount` and `InternalAccount` have a new required field (`scopes`) and are part of the public API.
- **BREAKING:** Bump `@metamask/keyring-internal-api` from `^1.0.0` to `^2.0.0` ([#135](https://github.com/MetaMask/accounts/pull/135))
  - This change was not properly reported as breaking on the `7.1.0`.
  - `InternalAccount` extends `KeyringAccount` which has a new required field (`scopes`) and is part of the public API.
- **BREAKING:** Bump `@metamask/keyring-snap-internal-client` from `^1.0.0` to `^2.0.0` ([#135](https://github.com/MetaMask/accounts/pull/135))
  - This change was not properly reported as breaking on the `7.1.0`.
  - `KeyringAccount` has a new required field (`scopes`) and is part of the public API.

## [7.1.0]

### Changed

- Bump `@metamask/keyring-api` from `^12.0.0` to `^13.0.0` ([#101](https://github.com/MetaMask/accounts/pull/101))

## [7.0.0]

### Changed

- Use `ts-bridge/cli@0.6.1` ([#118](https://github.com/MetaMask/accounts/pull/118))
  - This new version fixes a bug with CJS re-exports.
- Uses new `keyring-api` splitted packages ([#24](https://github.com/MetaMask/accounts/pull/24))

## [6.0.0]

### Added

- **BREAKING:** Add ESM build ([#40](https://github.com/MetaMask/accounts/pull/40))
  - It's no longer possible to import files from `./dist` directly.
- Export type `JsonRpcRequest` ([#95](https://github.com/MetaMask/accounts/pull/95))

## [5.0.1]

### Fixed

- Do not lower address for non-EVM accounts during account creation ([#90](https://github.com/MetaMask/accounts/pull/90))

## [5.0.0]

### Changed

- Add proprietary license ([#83](https://github.com/MetaMask/accounts/pull/83))
- **BREAKING**: Bump `@metamask/eth-sig-util` dependency from `^7.0.3` to `^8.0.0` ([#79](https://github.com/MetaMask/accounts/pull/79))
  - `signTypedData` no longer support `number` for addresses, see [here](https://github.com/MetaMask/eth-sig-util/blob/main/CHANGELOG.md#800).

## [4.4.0]

### Added

- Sanitize redirect URL ([#70](https://github.com/MetaMask/accounts/pull/70))

### Changed

- Bump `@metamask/*` dependencies and add `@lavamoat/preinstall-always-fail` ([#65](https://github.com/MetaMask/accounts/pull/65)), ([#59](https://github.com/MetaMask/accounts/pull/59)), ([#58](https://github.com/MetaMask/accounts/pull/58))
- Use TypeScript 5 ([#55](https://github.com/MetaMask/accounts/pull/55))

## [4.3.6]

### Changed

- Bump `sinon` and `@types/sinon` to latest versions ([#51](https://github.com/MetaMask/accounts/pull/51))
- Add `syncpack` and sync dependencies ([#53](https://github.com/metamask/accounts/pull/53))

## [4.3.5]

### Changed

- Bump `@metamask/*` and `@lavamoat/*` dependencies ([#46](https://github.com/MetaMask/accounts/pull/46))
- Move `deepmerge` to `devDependencies` ([#44](https://github.com/MetaMask/accounts/pull/44))

## [4.3.4]

### Changed

- Convert to monorepo
  - Package name does not change (`@metamask/eth-snap-keyring`) and sources have been moved to: `packages/keyring-snap-bridge`.
  - You can find all the changes [here](https://github.com/MetaMask/accounts/compare/6da58b4...38794aa).

## [4.3.3]

### Changed

- Bump `@metamask/snaps-controllers` from `^9.3.0` to `^9.6.0` ([#372](https://github.com/MetaMask/eth-snap-keyring/pull/372), [#389](https://github.com/MetaMask/eth-snap-keyring/pull/389))
- Bump `@metamask/snaps-sdk` from `^6.1.0` to `^6.4.0` ([#389](https://github.com/MetaMask/eth-snap-keyring/pull/389))
- Bump `@metamask/utils` from `^9.1.0` to `^9.2.1` ([#385](https://github.com/MetaMask/eth-snap-keyring/pull/385))
- Bump `@metamask/keyring-api` from `^8.0.1` to `^8.1.0` ([#374](https://github.com/MetaMask/eth-snap-keyring/pull/374), [#376](https://github.com/MetaMask/eth-snap-keyring/pull/376))

## [4.3.2]

### Changed

- Bump `@metamask/eth-sig-util` from `^7.0.1` to `^7.0.3` ([#311](https://github.com/MetaMask/eth-snap-keyring/pull/311))
- Bump `@metamask/keyring-api` from `^8.0.0` to `^8.0.1` ([#311](https://github.com/MetaMask/eth-snap-keyring/pull/311))
- Bump `@metamask/snaps-controllers` from `^8.1.1` to `^9.3.0` ([#311](https://github.com/MetaMask/eth-snap-keyring/pull/311), [#363](https://github.com/MetaMask/eth-snap-keyring/pull/363))
- Bump `@metamask/snaps-sdk` from `^4.2.0` to `^6.1.0` ([#311](https://github.com/MetaMask/eth-snap-keyring/pull/311), [#363](https://github.com/MetaMask/eth-snap-keyring/pull/363))
- Bump `@metamask/snaps-utils` from `^7.4.0` to `^7.8.0` ([#311](https://github.com/MetaMask/eth-snap-keyring/pull/311), [#363](https://github.com/MetaMask/eth-snap-keyring/pull/363))
- Bump `@metamask/utils` from `^8.4.0` to `^9.1.0` ([#311](https://github.com/MetaMask/eth-snap-keyring/pull/311))
- Set tsconfig options `module`, `moduleResolution` to `Node16` ([#311](https://github.com/MetaMask/eth-snap-keyring/pull/311))

### Fixed

- Replace `superstruct` with ESM-compatible `@metamask/superstruct` `^3.1.0` ([#311](https://github.com/MetaMask/eth-snap-keyring/pull/311))
  - This fixes the issue of this package being unusable by any TypeScript project that uses `Node16` or `NodeNext` as its `moduleResolution` option.

## [4.3.1]

### Changed

- Bump @metamask/keyring-api from 6.3.1 to 8.0.0 ([#331](https://github.com/MetaMask/eth-snap-keyring/pull/331)).

## [4.3.0]

### Added

- Export `KeyringSnapControllerClient` ([#328](https://github.com/MetaMask/eth-snap-keyring/pull/328)).

### Changed

- Bump @metamask/snaps-utils from 7.4.1 to 7.5.0 ([#326](https://github.com/MetaMask/eth-snap-keyring/pull/326)).
- Bump @metamask/snaps-controllers from 8.3.1 to 8.4.0 ([#325](https://github.com/MetaMask/eth-snap-keyring/pull/325)).
- Bump @metamask/snaps-sdk from 4.4.1 to 4.4.2 ([#327](https://github.com/MetaMask/eth-snap-keyring/pull/327)).
- Bump @metamask/rpc-errors from 6.2.1 to 6.3.0 ([#322](https://github.com/MetaMask/eth-snap-keyring/pull/322)).
- Bump @metamask/snaps-controllers from 8.2.0 to 8.3.1 ([#321](https://github.com/MetaMask/eth-snap-keyring/pull/321)).
- Bump @metamask/snaps-sdk from 4.3.0 to 4.4.1 ([#314](https://github.com/MetaMask/eth-snap-keyring/pull/314)).
- Bump @metamask/permission-controller from 9.1.0 to 9.1.1 ([#316](https://github.com/MetaMask/eth-snap-keyring/pull/316)).
- Bump @metamask/snaps-utils from 7.4.0 to 7.4.1 ([#319](https://github.com/MetaMask/eth-snap-keyring/pull/319)).
- Bump @metamask/keyring-api from 6.3.1 to 6.4.0 ([#315](https://github.com/MetaMask/eth-snap-keyring/pull/315)).
- Bump @metamask/json-rpc-middleware-stream from 7.0.1 to 7.0.2 ([#317](https://github.com/MetaMask/eth-snap-keyring/pull/317)).
- Bump @metamask/phishing-controller from 9.0.3 to 9.0.4 ([#318](https://github.com/MetaMask/eth-snap-keyring/pull/318)).
- Bump @metamask/snaps-rpc-methods from 9.1.0 to 9.1.2 ([#320](https://github.com/MetaMask/eth-snap-keyring/pull/320)).
- Bump @lavamoat/allow-scripts@^2.3.1->^3.0.4 ([#296](https://github.com/MetaMask/eth-snap-keyring/pull/296)).
- Bump @metamask/key-tree from 9.1.0 to 9.1.1 ([#298](https://github.com/MetaMask/eth-snap-keyring/pull/298)).
- Bump @metamask/phishing-controller from 9.0.2 to 9.0.3 ([#302](https://github.com/MetaMask/eth-snap-keyring/pull/302)).
- Bump @metamask/json-rpc-engine from 8.0.1 to 8.0.2 ([#291](https://github.com/MetaMask/eth-snap-keyring/pull/291)).
- Bump @metamask/snaps-controllers from 8.1.1 to 8.2.0 ([#307](https://github.com/MetaMask/eth-snap-keyring/pull/307)).

## [4.2.1]

### Changed

- Fixed 4337 methods enum ([#312](https://github.com/MetaMask/eth-snap-keyring/pull/312))
- Bump @metamask/post-message-stream from 8.0.0 to 8.1.0 ([#297](https://github.com/MetaMask/eth-snap-keyring/pull/297))
- Bump @metamask/permission-controller from 9.0.2 to 9.1.0 ([#306](https://github.com/MetaMask/eth-snap-keyring/pull/306))
- Bump @metamask/snaps-sdk from 4.2.0 to 4.3.0 ([#308](https://github.com/MetaMask/eth-snap-keyring/pull/308))

## [4.2.0]

### Added

- Add `accountNameSuggestion` and `displayConfirmation` options handling for `"notify:accountCreated"` ([#300](https://github.com/MetaMask/eth-snap-keyring/pull/300))
- Bump @metamask/keyring-api from 6.1.1 to 6.2.1 ([#304](https://github.com/MetaMask/eth-snap-keyring/pull/304))

## [4.1.1]

### Changed

- Bump @metamask/snaps-\* and @metamask/keyring-api ([#294](https://github.com/MetaMask/eth-snap-keyring/pull/294))
- Bump @metamask/key-tree from 9.0.0 to 9.1.0 ([#293](https://github.com/MetaMask/eth-snap-keyring/pull/293))

## [4.1.0]

### Changed

- Bump @metamask/keyring-api to version 6.1.0 and introduce btc account types ([#285](https://github.com/MetaMask/eth-snap-keyring/pull/285))
- Bump @metamask/phishing-controller from 9.0.1 to 9.0.2 ([#279](https://github.com/MetaMask/eth-snap-keyring/pull/279))
- Bump @metamask/base-controller from 5.0.1 to 5.0.2 ([#280](https://github.com/MetaMask/eth-snap-keyring/pull/280))
- Bump @metamask/eth-sig-util from 7.0.1 to 7.0.2 ([#281](https://github.com/MetaMask/eth-snap-keyring/pull/281))
- Bump @metamask/approval-controller from 6.0.1 to 6.0.2 ([#282](https://github.com/MetaMask/eth-snap-keyring/pull/282))
- Bump @metamask/providers from 16.0.0 to 16.1.0 ([#283](https://github.com/MetaMask/eth-snap-keyring/pull/283))
- Bump @metamask/snaps-controllers from 7.0.1 to 8.0.0 ([#278](https://github.com/MetaMask/eth-snap-keyring/pull/278))
- Bump @metamask/snaps-utils from 7.1.0 to 7.2.0 ([#277](https://github.com/MetaMask/eth-snap-keyring/pull/277))

## [4.0.0]

### Changed

- **BREAKING**: Bump @metamask/keyring-api to version 6.0.0 ([#275](https://github.com/MetaMask/eth-snap-keyring/pull/275))
- Bump @metamask/snaps-controllers from 6.0.3 to 7.0.1 and @metamask/snaps-sdk 3.1.1 to 4.0.1 ([#272](https://github.com/MetaMask/eth-snap-keyring/pull/272))
- Bump @metamask/snaps-utils from 7.0.4 to 7.1.0 ([#268](https://github.com/MetaMask/eth-snap-keyring/pull/268))
- Bump @metamask/controller-utils from 9.0.2 to 9.1.0 ([#270](https://github.com/MetaMask/eth-snap-keyring/pull/270))
- Bump @metamask/snaps-controllers from 6.0.3 to 6.0.4 ([#266](https://github.com/MetaMask/eth-snap-keyring/pull/266))
- Bump @metamask/snaps-registry from 3.0.1 to 3.1.0 ([#265](https://github.com/MetaMask/eth-snap-keyring/pull/265))
- Bump @metamask/snaps-rpc-methods from 7.0.1 to 7.0.2 ([#264](https://github.com/MetaMask/eth-snap-keyring/pull/264))
- Bump @metamask/snaps-utils from 7.0.3 to 7.0.4 ([#263](https://github.com/MetaMask/eth-snap-keyring/pull/263))
- Bump @metamask/snaps-sdk from 3.1.1 to 3.2.0 ([#262](https://github.com/MetaMask/eth-snap-keyring/pull/262))

## [3.0.0]

### Added

- Add logger and now log Snap requests ([#254](https://github.com/MetaMask/eth-snap-keyring/pull/254))

### Changed

- **BREAKING**: Add KeyringExecutionContext to user ops methods ([#253](https://github.com/MetaMask/eth-snap-keyring/pull/253))
- Bump @metamask/utils from 8.3.0 to 8.4.0
  ([#260](https://github.com/MetaMask/eth-snap-keyring/pull/260))
  ([#256](https://github.com/MetaMask/eth-snap-keyring/pull/256))
- Bump @metamask/keyring-api from 5.0.0 to 5.1.0 ([#259](https://github.com/MetaMask/eth-snap-keyring/pull/259))
- Bump @metamask/keyring-api from 4.0.2 to 5.0.0 ([#255](https://github.com/MetaMask/eth-snap-keyring/pull/255))

## [2.2.2]

### Changed

- Bump @metamask/safe-event-emitter from 3.1.0 to 3.1.1 ([#251](https://github.com/MetaMask/eth-snap-keyring/pull/251))
- Bump dependencies ([#246](https://github.com/MetaMask/eth-snap-keyring/pull/246))
- Bump @metamask/safe-event-emitter from 3.0.0 to 3.1.0 ([#245](https://github.com/MetaMask/eth-snap-keyring/pull/245))
- Fix enforcing responses of `prepareUserOperation` and `patchUserOperation` to be synchronous ([#243](https://github.com/MetaMask/eth-snap-keyring/pull/243))
- Bump @metamask/snaps-registry from 3.0.0 to 3.0.1 ([#244](https://github.com/MetaMask/eth-snap-keyring/pull/244))

## [2.2.1]

### Changed

- Bump @metamask dependencies ([#236](https://github.com/MetaMask/eth-snap-keyring/pull/236))
- Extract logic in 'submitRequest' ([#232](https://github.com/MetaMask/eth-snap-keyring/pull/232))
- Bump @metamask/controller-utils from 8.0.3 to 8.0.4 ([#233](https://github.com/MetaMask/eth-snap-keyring/pull/233))
- Bump @metamask/json-rpc-engine from 7.3.2 to 7.3.3 ([#234](https://github.com/MetaMask/eth-snap-keyring/pull/234))
- Bump @metamask/approval-controller from 5.1.2 to 5.1.3 ([#235](https://github.com/MetaMask/eth-snap-keyring/pull/235))
- Bump update Snap and dev dependencies ([#230](https://github.com/MetaMask/eth-snap-keyring/pull/230))
- Bump @metamask/rpc-errors from 6.2.0 to 6.2.1 ([#223](https://github.com/MetaMask/eth-snap-keyring/pull/223))
- Bump @metamask/snaps-utils from 6.1.0 to 7.0.0 ([#224](https://github.com/MetaMask/eth-snap-keyring/pull/224))
- Bump @metamask/rpc-errors from 6.1.0 to 6.2.0 ([#219](https://github.com/MetaMask/eth-snap-keyring/pull/219))
- Bump ip from 2.0.0 to 2.0.1 ([#218](https://github.com/MetaMask/eth-snap-keyring/pull/218))

### Fixed

- Add `chainId` to Keyring API requests (transaction/typed message) ([#231](https://github.com/MetaMask/eth-snap-keyring/pull/231))
- Enforce async request redirect URL is in the snaps 'allowedOrigins' ([#228](https://github.com/MetaMask/eth-snap-keyring/pull/228))

## [2.2.0]

### Changed

- Bump dependencies ([#220](https://github.com/MetaMask/eth-snap-keyring/pull/220))
  - @metamask/snaps-controllers from ^4.1.0 to ^5.0.1
  - @metamask/snaps-sdk from ^1.4.0 to ^2.1.0
  - @metamask/snaps-utils from ^5.2.0 to ^6.1.0
  - @metamask/utils from ^8.1.0 to ^8.3.0
  - @metamask/keyring-api from ^2.0.0 to ^4.0.0

## [2.1.2]

### Fixed

- Fixed inconsistent signature signing ([#200](https://github.com/MetaMask/eth-snap-keyring/pull/200))

## [2.1.1]

### Fixed

- Reject unsupported account methods ([#190](https://github.com/MetaMask/eth-snap-keyring/pull/190))

## [2.1.0]

### Added

- Add methods to support ERC-4337 accounts ([#180](https://github.com/MetaMask/eth-snap-keyring/pull/180)).

### Changed

- Use a `snapId`-indexed map ([#172](https://github.com/MetaMask/eth-snap-keyring/pull/172)).
- Update CODEOWNERS and run CI on merge queues ([#165](https://github.com/MetaMask/eth-snap-keyring/pull/165)).
- Bump min Node version to 18.18 and use LTS for dev ([#183](https://github.com/MetaMask/eth-snap-keyring/pull/183)).

## [2.0.0]

### Changed

- **BREAKING**: Remove async from `listAccounts` and `getAccountByAddress` ([#148](https://github.com/MetaMask/eth-snap-keyring/pull/148)).

## [1.0.0]

### Changed

- Bump `@metamask/keyring-api` to 1.0.0 ([#145](https://github.com/MetaMask/eth-snap-keyring/pull/145)).
- Bump `semver` and `word-wrap` dependencies ([#144](https://github.com/MetaMask/eth-snap-keyring/pull/144)).
- Bump @metamask/rpc-errors from 6.0.0 to 6.1.0 ([#143](https://github.com/MetaMask/eth-snap-keyring/pull/143)).

## [1.0.0-rc.2]

### Added

- Add `redirectUser` callback ([#136](https://github.com/MetaMask/eth-snap-keyring/pull/136)).

## [1.0.0-rc.1]

### Added

- Add `getAccountByAddress` method ([#134](https://github.com/MetaMask/eth-snap-keyring/pull/134)).

### Changed

- Bump `word-wrap` and `semver` ([#140](https://github.com/MetaMask/eth-snap-keyring/pull/140)).
- Bump `@metamask/scure-bip39` from 2.1.0 to 2.1.1 ([#133](https://github.com/MetaMask/eth-snap-keyring/pull/133)).
- Bump `postcss` from 8.4.20 to 8.4.31 ([#137](https://github.com/MetaMask/eth-snap-keyring/pull/137)).
- Bump `@metamask` dependencies ([#139](https://github.com/MetaMask/eth-snap-keyring/pull/139)).

## [0.3.1]

### Added

- Add the `getAccountsBySnapId` method ([#122](https://github.com/MetaMask/eth-snap-keyring/pull/122)).

### Fixed

- Remove the `removeAccountsBySnapId` method ([#121](https://github.com/MetaMask/eth-snap-keyring/pull/121)).
- Call external function with lowercase address ([#120](https://github.com/MetaMask/eth-snap-keyring/pull/120)).

## [0.3.0]

### Changed

- Handle approval when adding/removing account with `handleUserInput` callback ([#99](https://github.com/MetaMask/eth-snap-keyring/pull/99)).

## [0.2.3]

### Added

- Add method to remove all accounts given a snap ID ([#116](https://github.com/MetaMask/eth-snap-keyring/pull/116)).

### Fixed

- Don't allow duplicate accounts to be added ([#115](https://github.com/MetaMask/eth-snap-keyring/pull/115)).
- Ignore event if account was already removed ([#101](https://github.com/MetaMask/eth-snap-keyring/pull/101)).

## [0.2.2]

### Changed

- Add `removeAccount` callback to constructor ([#96](https://github.com/MetaMask/eth-snap-keyring/pull/96)).

## [0.2.1]

### Changed

- Add `callbacks` argument to constructor ([#82](https://github.com/MetaMask/eth-snap-keyring/pull/82)).
- Increase minimum Node.js version to 16 (default to 18) ([#83](https://github.com/MetaMask/eth-snap-keyring/pull/83)).
- Migrate to the new `keyring-api` ([#78](https://github.com/MetaMask/eth-snap-keyring/pull/78)).
- Upgrade dependencies.

## [0.2.0]

### Changed

- Add account and snap metadata ([#75](https://github.com/MetaMask/eth-snap-keyring/pull/75)).
- Rename files to be more idiomatic ([#42](https://github.com/MetaMask/eth-snap-keyring/pull/42)).
- Move internal state from objects to maps ([#41](https://github.com/MetaMask/eth-snap-keyring/pull/41)).

### Fixed

- Remove promise if `submitRequest()` throws ([#43](https://github.com/MetaMask/eth-snap-keyring/pull/43)).

## [0.1.4]

### Changed

- **BREAKING**: Add `callbacks` that will be used to inject dependencies ([#79](https://github.com/MetaMask/eth-snap-keyring/pull/79), [MetaMask/snaps#1725](https://github.com/MetaMask/snaps/pull/1725), [MetaMask/metamask-extension#20786](https://github.com/MetaMask/metamask-extension/pull/20786)).

## [0.1.3]

### Fixed

- Remove account from maps before calling the snap ([#39](https://github.com/MetaMask/eth-snap-keyring/pull/39)).

## [0.1.2]

### Changed

- Remove unused `#listAccounts()` method ([#35](https://github.com/MetaMask/eth-snap-keyring/pull/35)).

### Fixed

- Sync all accounts on snap notificaiton ([#36](https://github.com/MetaMask/eth-snap-keyring/pull/36)).
- Don't sync accounts twice on deletion ([#32](https://github.com/MetaMask/eth-snap-keyring/pull/32)).

## [0.1.1]

### Changed

- Use objects in snap -> controller methods ([#28](https://github.com/MetaMask/eth-snap-keyring/pull/28)).
- Fix circular call when handling `'read'` requests ([#27](https://github.com/MetaMask/eth-snap-keyring/pull/27)).
- Remove `saveSnapKeyring` argument from `handleKeyringSnapMessage` ([#26](https://github.com/MetaMask/eth-snap-keyring/pull/26)).

## [0.1.0]

### Added

- Initial release.

[Unreleased]: https://github.com/MetaMask/accounts/compare/@metamask/eth-snap-keyring@18.0.1...HEAD
[18.0.1]: https://github.com/MetaMask/accounts/compare/@metamask/eth-snap-keyring@18.0.0...@metamask/eth-snap-keyring@18.0.1
[18.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/eth-snap-keyring@17.3.0...@metamask/eth-snap-keyring@18.0.0
[17.3.0]: https://github.com/MetaMask/accounts/compare/@metamask/eth-snap-keyring@17.2.0...@metamask/eth-snap-keyring@17.3.0
[17.2.0]: https://github.com/MetaMask/accounts/compare/@metamask/eth-snap-keyring@17.1.0...@metamask/eth-snap-keyring@17.2.0
[17.1.0]: https://github.com/MetaMask/accounts/compare/@metamask/eth-snap-keyring@17.0.0...@metamask/eth-snap-keyring@17.1.0
[17.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/eth-snap-keyring@16.1.0...@metamask/eth-snap-keyring@17.0.0
[16.1.0]: https://github.com/MetaMask/accounts/compare/@metamask/eth-snap-keyring@16.0.0...@metamask/eth-snap-keyring@16.1.0
[16.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/eth-snap-keyring@15.0.0...@metamask/eth-snap-keyring@16.0.0
[15.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/eth-snap-keyring@14.0.0...@metamask/eth-snap-keyring@15.0.0
[14.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/eth-snap-keyring@13.0.0...@metamask/eth-snap-keyring@14.0.0
[13.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/eth-snap-keyring@12.2.0...@metamask/eth-snap-keyring@13.0.0
[12.2.0]: https://github.com/MetaMask/accounts/compare/@metamask/eth-snap-keyring@12.1.1...@metamask/eth-snap-keyring@12.2.0
[12.1.1]: https://github.com/MetaMask/accounts/compare/@metamask/eth-snap-keyring@12.1.0...@metamask/eth-snap-keyring@12.1.1
[12.1.0]: https://github.com/MetaMask/accounts/compare/@metamask/eth-snap-keyring@12.0.0...@metamask/eth-snap-keyring@12.1.0
[12.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/eth-snap-keyring@11.1.0...@metamask/eth-snap-keyring@12.0.0
[11.1.0]: https://github.com/MetaMask/accounts/compare/@metamask/eth-snap-keyring@11.0.0...@metamask/eth-snap-keyring@11.1.0
[11.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/eth-snap-keyring@10.0.0...@metamask/eth-snap-keyring@11.0.0
[10.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/eth-snap-keyring@9.1.1...@metamask/eth-snap-keyring@10.0.0
[9.1.1]: https://github.com/MetaMask/accounts/compare/@metamask/eth-snap-keyring@9.1.0...@metamask/eth-snap-keyring@9.1.1
[9.1.0]: https://github.com/MetaMask/accounts/compare/@metamask/eth-snap-keyring@9.0.0...@metamask/eth-snap-keyring@9.1.0
[9.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/eth-snap-keyring@8.1.1...@metamask/eth-snap-keyring@9.0.0
[8.1.1]: https://github.com/MetaMask/accounts/compare/@metamask/eth-snap-keyring@8.1.0...@metamask/eth-snap-keyring@8.1.1
[8.1.0]: https://github.com/MetaMask/accounts/compare/@metamask/eth-snap-keyring@8.0.0...@metamask/eth-snap-keyring@8.1.0
[8.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/eth-snap-keyring@7.1.0...@metamask/eth-snap-keyring@8.0.0
[7.1.0]: https://github.com/MetaMask/accounts/compare/@metamask/eth-snap-keyring@7.0.0...@metamask/eth-snap-keyring@7.1.0
[7.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/eth-snap-keyring@6.0.0...@metamask/eth-snap-keyring@7.0.0
[6.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/eth-snap-keyring@5.0.1...@metamask/eth-snap-keyring@6.0.0
[5.0.1]: https://github.com/MetaMask/accounts/compare/@metamask/eth-snap-keyring@5.0.0...@metamask/eth-snap-keyring@5.0.1
[5.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/eth-snap-keyring@4.4.0...@metamask/eth-snap-keyring@5.0.0
[4.4.0]: https://github.com/MetaMask/accounts/compare/@metamask/eth-snap-keyring@4.3.6...@metamask/eth-snap-keyring@4.4.0
[4.3.6]: https://github.com/MetaMask/accounts/compare/@metamask/eth-snap-keyring@4.3.5...@metamask/eth-snap-keyring@4.3.6
[4.3.5]: https://github.com/MetaMask/accounts/compare/@metamask/eth-snap-keyring@4.3.4...@metamask/eth-snap-keyring@4.3.5
[4.3.4]: https://github.com/MetaMask/accounts/compare/@metamask/eth-snap-keyring@4.3.3...@metamask/eth-snap-keyring@4.3.4
[4.3.3]: https://github.com/MetaMask/accounts/compare/@metamask/eth-snap-keyring@4.3.2...@metamask/eth-snap-keyring@4.3.3
[4.3.2]: https://github.com/MetaMask/accounts/compare/@metamask/eth-snap-keyring@4.3.1...@metamask/eth-snap-keyring@4.3.2
[4.3.1]: https://github.com/MetaMask/accounts/compare/@metamask/eth-snap-keyring@4.3.0...@metamask/eth-snap-keyring@4.3.1
[4.3.0]: https://github.com/MetaMask/accounts/compare/@metamask/eth-snap-keyring@4.2.1...@metamask/eth-snap-keyring@4.3.0
[4.2.1]: https://github.com/MetaMask/accounts/compare/@metamask/eth-snap-keyring@4.2.0...@metamask/eth-snap-keyring@4.2.1
[4.2.0]: https://github.com/MetaMask/accounts/compare/@metamask/eth-snap-keyring@4.1.1...@metamask/eth-snap-keyring@4.2.0
[4.1.1]: https://github.com/MetaMask/accounts/compare/@metamask/eth-snap-keyring@4.1.0...@metamask/eth-snap-keyring@4.1.1
[4.1.0]: https://github.com/MetaMask/accounts/compare/@metamask/eth-snap-keyring@4.0.0...@metamask/eth-snap-keyring@4.1.0
[4.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/eth-snap-keyring@3.0.0...@metamask/eth-snap-keyring@4.0.0
[3.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/eth-snap-keyring@2.2.2...@metamask/eth-snap-keyring@3.0.0
[2.2.2]: https://github.com/MetaMask/accounts/compare/@metamask/eth-snap-keyring@2.2.1...@metamask/eth-snap-keyring@2.2.2
[2.2.1]: https://github.com/MetaMask/accounts/compare/@metamask/eth-snap-keyring@2.2.0...@metamask/eth-snap-keyring@2.2.1
[2.2.0]: https://github.com/MetaMask/accounts/compare/@metamask/eth-snap-keyring@2.1.2...@metamask/eth-snap-keyring@2.2.0
[2.1.2]: https://github.com/MetaMask/accounts/compare/@metamask/eth-snap-keyring@2.1.1...@metamask/eth-snap-keyring@2.1.2
[2.1.1]: https://github.com/MetaMask/accounts/compare/@metamask/eth-snap-keyring@2.1.0...@metamask/eth-snap-keyring@2.1.1
[2.1.0]: https://github.com/MetaMask/accounts/compare/@metamask/eth-snap-keyring@2.0.0...@metamask/eth-snap-keyring@2.1.0
[2.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/eth-snap-keyring@1.0.0...@metamask/eth-snap-keyring@2.0.0
[1.0.0]: https://github.com/MetaMask/accounts/compare/@metamask/eth-snap-keyring@1.0.0-rc.2...@metamask/eth-snap-keyring@1.0.0
[1.0.0-rc.2]: https://github.com/MetaMask/accounts/compare/@metamask/eth-snap-keyring@1.0.0-rc.1...@metamask/eth-snap-keyring@1.0.0-rc.2
[1.0.0-rc.1]: https://github.com/MetaMask/accounts/compare/@metamask/eth-snap-keyring@0.3.1...@metamask/eth-snap-keyring@1.0.0-rc.1
[0.3.1]: https://github.com/MetaMask/accounts/compare/@metamask/eth-snap-keyring@0.3.0...@metamask/eth-snap-keyring@0.3.1
[0.3.0]: https://github.com/MetaMask/accounts/compare/@metamask/eth-snap-keyring@0.2.3...@metamask/eth-snap-keyring@0.3.0
[0.2.3]: https://github.com/MetaMask/accounts/compare/@metamask/eth-snap-keyring@0.2.2...@metamask/eth-snap-keyring@0.2.3
[0.2.2]: https://github.com/MetaMask/accounts/compare/@metamask/eth-snap-keyring@0.2.1...@metamask/eth-snap-keyring@0.2.2
[0.2.1]: https://github.com/MetaMask/accounts/compare/@metamask/eth-snap-keyring@0.2.0...@metamask/eth-snap-keyring@0.2.1
[0.2.0]: https://github.com/MetaMask/accounts/compare/@metamask/eth-snap-keyring@0.1.4...@metamask/eth-snap-keyring@0.2.0
[0.1.4]: https://github.com/MetaMask/accounts/compare/@metamask/eth-snap-keyring@0.1.3...@metamask/eth-snap-keyring@0.1.4
[0.1.3]: https://github.com/MetaMask/accounts/compare/@metamask/eth-snap-keyring@0.1.2...@metamask/eth-snap-keyring@0.1.3
[0.1.2]: https://github.com/MetaMask/accounts/compare/@metamask/eth-snap-keyring@0.1.1...@metamask/eth-snap-keyring@0.1.2
[0.1.1]: https://github.com/MetaMask/accounts/compare/@metamask/eth-snap-keyring@0.1.0...@metamask/eth-snap-keyring@0.1.1
[0.1.0]: https://github.com/MetaMask/accounts/releases/tag/@metamask/eth-snap-keyring@0.1.0
