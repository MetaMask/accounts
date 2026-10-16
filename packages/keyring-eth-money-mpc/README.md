# MPC Money Keyring

A Keyring for Ethereum money accounts that uses Multi-Party Computation (MPC) for key management and signing, built on top of the [MFA Wallet SDK](https://github.com/MetaMask/mfa-wallet-sdk).

The default export is the V1 `MpcMoneyKeyring` implementation. A V2 adapter that wraps it is available from `@metamask/eth-money-mpc-keyring/v2`.

## MFA

Pass `getMfaWhitelistConfig` to let signature requests skip MFA when they match [`@metamask/money-account-mfa-whitelist`](https://github.com/MetaMask/core/tree/main/packages/money-account-mfa-whitelist). The keyring sends the original request with the hash. The backend repeats the check with its own account, hash, and pinned configuration. When that still requires MFA, `/sign` responds with `{ "code": "mfa_required" }`. The keyring then requests a 2FA profile token and calls `/sign` once more.

Key generation, import, share rotation, share sync, and transaction signing always use a 2FA token. Omitting `getMfaWhitelistConfig` does too.

## Installation

`yarn add @metamask/eth-money-mpc-keyring`

or

`npm install @metamask/eth-money-mpc-keyring`

## Contributing

This package is part of a monorepo. Instructions for contributing can be found in the [monorepo README](https://github.com/MetaMask/accounts#readme).
