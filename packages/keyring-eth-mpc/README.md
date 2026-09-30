# MPC Keyring

A Keyring for Ethereum accounts that uses Multi-Party Computation (MPC) for key management and signing, built on top of the [MFA Wallet SDK](https://github.com/MetaMask/mfa-wallet-sdk).

> [!NOTE]
> The full V1 MPC keyring implementation is not included yet. Implement the `MpcKeyringV1` contract yourself and pass it to the V2 keyring; the official implementation will be provided in a later release, once the MFA Wallet SDK packages are releasable.

## Installation

`yarn add @metamask/eth-mpc-keyring`

or

`npm install @metamask/eth-mpc-keyring`
