# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Replace `getMfaWhitelistConfig` with an `isMfaRequired` callback that decides whether a signature requires MFA ([#689](https://github.com/MetaMask/accounts/pull/689))
  - The keyring no longer calls `getMfaRequirement`.
  - Omitting the callback, or a callback that throws, still requires MFA.
  - Replace the `MfaWhitelistConfig` re-export with `MoneyAccountSignatureRequest`.
- Bump `@metamask/keyring-sdk` from `^4.0.0` to `^4.1.0` ([#686](https://github.com/MetaMask/accounts/pull/686))
- Bump `@metamask/mfa-wallet-network` from `^0.1.0` to `^0.2.0` ([#688](https://github.com/MetaMask/accounts/pull/688))
  - Noise transport keys no longer match peers on `0.1.0`.
- Bump `@metamask/mfa-wallet-cl24` and `@metamask/mfa-wallet-interface` from `^0.1.0` to `^0.2.0` ([#688](https://github.com/MetaMask/accounts/pull/688))
  - Key creation and rotation take custodian share bindings.
  - Import and sync keep the stored key share, which no longer includes a party mapping.
  - Key shares persisted by `0.1.0` still deserialize; `partyMapping` is omitted on the next serialize.

### Fixed

- Sign plain-text messages in `signPersonalMessage` as UTF-8 instead of throwing ([#687](https://github.com/MetaMask/accounts/pull/687))
  - Treat `0x` as an empty hex string, matching the HD keyring.
- Serialize `bigint` values in the cloud signature request as decimal strings instead of throwing ([#687](https://github.com/MetaMask/accounts/pull/687))

## [0.2.0]

### Added

- Skip MFA for whitelisted signature requests, and retry with a 2FA token when the backend returns `mfa_required` ([#670](https://github.com/MetaMask/accounts/pull/670))

### Changed

- Replace `init` with an explicit `setup` method that runs key generation or import, inferring the mode from the backend ([#679](https://github.com/MetaMask/accounts/pull/679)), ([#681](https://github.com/MetaMask/accounts/pull/681))
  - The mode is inferred on every `setup` call: `import` when an active epoch exists for the profile, `create` otherwise.
  - Use mode `create` if the backend has only pending share or backup.
  - The V2 `createAccounts` no longer accepts a `mode` option.
  - Remove the `MpcMoneyKeyringSetupMode` export.
  - `deserialize` no longer accepts `{ mode }` setup params.
  - `serialize` no longer includes `{ mode }`; the keyring state is either empty (`{}`) or initialized.

## [0.1.1]

### Changed

- Use `MpcAccount<KeyringAccount>` for the accounts returned by the V2 `MpcMoneyKeyring` ([#677](https://github.com/MetaMask/accounts/pull/677))
- Mark accounts as non-exportable by setting the `exportable` account option to `false` ([#676](https://github.com/MetaMask/accounts/pull/676))
- Bump `@metamask/account-api` from `^2.1.1` to `^2.2.0` ([#678](https://github.com/MetaMask/accounts/pull/678))

## [0.1.0]

### Added

- Initial release of `@metamask/eth-money-mpc-keyring` ([#627](https://github.com/MetaMask/accounts/pull/627), [#641](https://github.com/MetaMask/accounts/pull/641)), [#673](https://github.com/MetaMask/accounts/pull/673))

### Changed

- Bump `@metamask/keyring-api` from `^24.2.0` to `^24.3.0` ([#674](https://github.com/MetaMask/accounts/pull/674))

[Unreleased]: https://github.com/MetaMask/accounts/compare/@metamask/eth-money-mpc-keyring@0.2.0...HEAD
[0.2.0]: https://github.com/MetaMask/accounts/compare/@metamask/eth-money-mpc-keyring@0.1.1...@metamask/eth-money-mpc-keyring@0.2.0
[0.1.1]: https://github.com/MetaMask/accounts/compare/@metamask/eth-money-mpc-keyring@0.1.0...@metamask/eth-money-mpc-keyring@0.1.1
[0.1.0]: https://github.com/MetaMask/accounts/releases/tag/@metamask/eth-money-mpc-keyring@0.1.0
