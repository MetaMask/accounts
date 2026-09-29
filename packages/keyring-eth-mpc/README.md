# MPC Keyring

A Keyring for Ethereum accounts that uses Multi-Party Computation (MPC) for key management and signing, built on top of the [MFA Wallet SDK](https://github.com/MetaMask/mfa-wallet-sdk).

> [!NOTE]
> The full V1 MPC keyring implementation is not included yet. Implement the `MpcKeyringV1` contract yourself and pass it to the V2 keyring; the official implementation will be provided in a later release, once the MFA Wallet SDK packages are releasable.

## Installation

`yarn add @metamask/eth-mpc-keyring`

or

`npm install @metamask/eth-mpc-keyring`

## V2 Keyring

This package also provides a V2 keyring that implements the unified `Keyring` interface from `@metamask/keyring-api/v2`. Import it from `@metamask/eth-mpc-keyring/v2`:

```ts
import type { MpcKeyringV1 } from '@metamask/eth-mpc-keyring';
import { MpcKeyring } from '@metamask/eth-mpc-keyring/v2';

// Provided by the client: an implementation of the V1 MPC keyring contract.
const legacyKeyring: MpcKeyringV1 = createMpcKeyringV1();

const keyring = new MpcKeyring({ legacyKeyring });

const [account] = await keyring.createAccounts({
  type: 'custom',
  mode: 'create',
});
```

The V2 keyring has type `KeyringType.Mpc` (`'mpc'`), declares `custom.createAccounts` in its capabilities, and accepts `{ type: 'custom', mode }` options in `createAccounts`.
