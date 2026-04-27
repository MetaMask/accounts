# Lattice Keyring

A MetaMask-owned Ethereum keyring for the [GridPlus Lattice1](https://gridplus.io/lattice) hardware wallet. This package wraps [`eth-lattice-keyring`](https://www.npmjs.com/package/eth-lattice-keyring) under the `@metamask` namespace.

## Installation

`yarn add @metamask/eth-lattice-keyring`

or

`npm install @metamask/eth-lattice-keyring`

## Usage

```ts
import { LatticeKeyring } from '@metamask/eth-lattice-keyring';

const keyring = new LatticeKeyring();
```

## Contributing

### Setup

- Install [Node.js](https://nodejs.org) version 18
  - If you are using [nvm](https://github.com/creationix/nvm#installation) (recommended) running `nvm use` will automatically choose the right node version for you.
- Install [Yarn v4](https://yarnpkg.com/getting-started/install)
- Run `yarn install` to install dependencies and run any required post-install scripts

### Testing and Linting

Run `yarn test` to run the tests once.

Run `yarn lint` to run the linter, or run `yarn lint:fix` to run the linter and fix any automatically fixable issues.
