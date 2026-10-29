# MPC Money Keyring

A Keyring for Ethereum money accounts that uses Multi-Party Computation (MPC) for key management and signing, built on top of the [MFA Wallet SDK](https://github.com/MetaMask/mfa-wallet-sdk).

The default export is the V1 `MpcMoneyKeyring` implementation. A V2 adapter that wraps it is available from `@metamask/eth-money-mpc-keyring/v2`.

## MFA

Pass `isMfaRequired` to decide which signature requests can skip MFA. The callback receives the original request, the signing address, and the hash, and returns whether the profile token must include 2FA. A client can call [`getMfaRequirement`](https://github.com/MetaMask/core/tree/main/packages/money-account-mfa-whitelist) with its own pinned configuration and return `mfaRequired`.

The keyring sends the original request with the hash. The backend repeats its own check. When that still requires MFA, `/sign` responds with `{ "code": "mfa_required" }`. The keyring then requests a 2FA profile token and calls `/sign` once more.

Key generation, import, share rotation, share sync, and transaction signing always use a 2FA token. Omitting `isMfaRequired`, or a callback that throws, does too.

## Installation

`yarn add @metamask/eth-money-mpc-keyring`

or

`npm install @metamask/eth-money-mpc-keyring`

## Contributing

This package is part of a monorepo. Instructions for contributing can be found in the [monorepo README](https://github.com/MetaMask/accounts#readme).
