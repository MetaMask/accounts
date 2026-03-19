# Money Keyring

An Ethereum keyring that extends [`@metamask/eth-hd-keyring`](../keyring-eth-hd) with a distinct keyring type and derivation path for money accounts.

Money accounts use a separate HD derivation path to keep funds isolated from the primary HD keyring, while reusing the same seed phrase and signing infrastructure.

## Installation

`yarn add @metamask/eth-money-keyring`

or

`npm install @metamask/eth-money-keyring`

## Usage

```ts
import { MoneyKeyring } from '@metamask/eth-money-keyring';

const keyring = new MoneyKeyring();
```

The `MoneyKeyring` class implements the same `Keyring` interface as `HdKeyring` — see the [HD Keyring README](../keyring-eth-hd/README.md) for full API documentation.

## Contributing

### Setup

- Install [Node.js](https://nodejs.org) version 18
  - If you are using [nvm](https://github.com/creationix/nvm#installation) (recommended) running `nvm use` will automatically choose the right node version for you.
- Install [Yarn v4](https://yarnpkg.com/getting-started/install)
- Run `yarn install` to install dependencies and run any required post-install scripts

### Testing and Linting

Run `yarn test` to run the tests once.

Run `yarn lint` to run the linter, or run `yarn lint:fix` to run the linter and fix any automatically fixable issues.
