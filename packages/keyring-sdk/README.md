# MetaMask Keyring SDK

This package contains the heavy runtime dependencies related to the `@metamask/keyring-api` package
to keep it as a lightweight API surface (types, structs, interfaces).

## Installation

```bash
yarn add @metamask/keyring-sdk
```

or

```bash
npm install @metamask/keyring-sdk
```

## Usage

```ts
import { EthKeyringWrapper, EthKeyringMethod } from '@metamask/keyring-sdk';
import { EthMethod, KeyringType } from '@metamask/keyring-api';

export class MyKeyringV2 extends EthKeyringWrapper<MyLegacyKeyring> {
  constructor(inner: MyLegacyKeyring) {
    super({
      type: KeyringType.Hd,
      inner,
      capabilities: { scopes: ['eip155:1'] },
    });
  }

  async getAccounts() { /* ... */ }
  async createAccounts(options) { /* ... */ }
  async deleteAccount(accountId) { /* ... */ }
}
```

## Contributing

This package is part of a monorepo. Instructions for contributing can be found in the [monorepo README](https://github.com/MetaMask/accounts#readme).
