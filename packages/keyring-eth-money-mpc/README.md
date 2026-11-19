# MPC Money Keyring

A Keyring for Ethereum money accounts that uses Multi-Party Computation (MPC) for key management and signing, built on top of the [MFA Wallet SDK](https://github.com/MetaMask/mfa-wallet-sdk).

The default export is the V1 `MpcMoneyKeyring` implementation. A V2 adapter that wraps it is available from `@metamask/eth-money-mpc-keyring/v2`.

## MFA

The backend decides which signature requests require MFA, using [`getMfaRequirement`](https://github.com/MetaMask/core/tree/main/packages/money-account-mfa-whitelist). The keyring doesn't check the request itself, so the backend can change its whitelist without a client update.

The keyring first calls `/sign` with a profile token without 2FA, and sends the original request with the hash. When the request requires MFA, `/sign` responds with `{ "code": "mfa_required" }`. The keyring then requests a 2FA profile token for the hash and calls `/sign` once more.

Key generation, import, share rotation, share sync, and transaction signing always use a 2FA token.

## Device-share backups

Provide `getPrimaryMnemonic: () => Promise<number[]>` when constructing the keyring.
It returns the wallet's primary mnemonic as UTF-8 byte values, like the normal
Money keyring's `getMnemonic` callback, without an entropy-source argument.

The keyring derives the backup wrapping key using the SDK helpers with index `0`
and purpose `metamask:money-account:mfa:encryption-key:v1`, independently of share
epochs. Recovery requires the same primary mnemonic. Backups encrypted using the
old `getBackupEncryptionKey` callback are compatible only if it returned this same
key; other existing backups require re-encryption before switching.

## Installation

`yarn add @metamask/eth-money-mpc-keyring`

or

`npm install @metamask/eth-money-mpc-keyring`

## Contributing

This package is part of a monorepo. Instructions for contributing can be found in the [monorepo README](https://github.com/MetaMask/accounts#readme).
