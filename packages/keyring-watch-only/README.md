# Watch-Only Keyring

A watch-only keyring that holds accounts imported by address, without any
signing capability.

Watch-only accounts make it possible to track addresses as first-class
[`KeyringAccount`](https://github.com/MetaMask/accounts/tree/main/packages/keyring-api)
objects without holding any secret material. The keyring is a v2-only
[`Keyring`](https://github.com/MetaMask/accounts/tree/main/packages/keyring-api)
implementation: it cannot sign (`submitRequest` always throws), cannot export
accounts, and its accounts declare no methods.

EVM addresses are supported for now. Addresses are validated and normalized to
their EIP-55 checksum representation.

## Installation

`yarn add @metamask/watch-only-keyring`

or

`npm install @metamask/watch-only-keyring`

## Contributing

This package is part of a monorepo. Instructions for contributing can be found in the [monorepo README](https://github.com/MetaMask/accounts#readme).
