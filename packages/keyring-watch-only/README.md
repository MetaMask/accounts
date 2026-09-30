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

## Usage

```ts
import { WatchOnlyKeyring } from '@metamask/watch-only-keyring';

const keyring = new WatchOnlyKeyring();

// Import an address. `accountType` is optional and defaults to `eip155:eoa`.
const [account] = await keyring.createAccounts({
  type: 'address:import',
  address: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
});

// account: {
//   id: '…',
//   type: 'eip155:eoa',
//   address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
//   scopes: ['eip155:0'],
//   methods: [],
//   options: {},
// }
```

Importing an address that is already held by the keyring is idempotent: the
existing account is returned. Account IDs are deterministic (derived from the
address), so they survive state resets.

### Capabilities

```ts
keyring.capabilities;
// {
//   scopes: ['eip155:0'],
//   address: { import: true },
// }
```

### Legacy v1 adapter

`KeyringController` interacts with keyrings through the legacy v1 interface.
Use `WatchOnlyKeyringV1Adapter` to expose the watch-only keyring to it:

```ts
import { WatchOnlyKeyringV1Adapter } from '@metamask/watch-only-keyring';

const adapter = new WatchOnlyKeyringV1Adapter(keyring);
```

The inherited signing methods always throw for watch-only accounts (they
declare no methods), as does `exportAccount`. The adapter adds
address-based account removal:

```ts
await adapter.removeAccount('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');
```

## Contributing

### Setup

- Install [Node.js](https://nodejs.org) version 22
  - If you are using [nvm](https://github.com/creationix/nvm#installation) (recommended) running `nvm use` will automatically choose the right node version for you.
- Install [Yarn v4](https://yarnpkg.com/getting-started/install)
- Run `yarn install` to install dependencies and run any required post-install scripts

### Testing and Linting

Run `yarn test` to run the tests once.

Run `yarn lint` to run the linter, or run `yarn lint:fix` to run the linter and fix any automatically fixable issues.
