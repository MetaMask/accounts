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

The keyring derives the backup encryption key using `KeyRoot.fromMnemonic` and
`root.deriveSecret` with length `32`, index `0`, and the shared registry constant
`Purpose.MoneyAccountMpcDeviceShareWrappingKey`
(`metamask:money-account:mpc:device-share:wrapping-key:v1`), using the SDK's MetaMask-specific
BIP-85 root profile independently of share
epochs. Recovery requires the same primary mnemonic. Backups encrypted using the
old `getBackupEncryptionKey` callback are compatible only if it returned this same
key; other existing backups require re-encryption before switching.
The temporary root is destroyed after derivation, including when derivation fails.

The wrapping key protects serialized device-share backups using AES-256-GCM,
not AES-KW or AES-KWP. Each backup uses a fresh random 96-bit IV; decryption
rejects authentication failures. The SDK derives raw secret bytes; this consumer
defines their use as an AES-256-GCM wrapping key.

## Installation

`yarn add @metamask/eth-money-mpc-keyring`

or

`npm install @metamask/eth-money-mpc-keyring`

## Contributing

This package is part of a monorepo. Instructions for contributing can be found in the [monorepo README](https://github.com/MetaMask/accounts#readme).
