# eth-onekey-bridge-keyring

An implementation of MetaMask's [Keyring interface](https://github.com/MetaMask/eth-simple-keyring#the-keyring-class-protocol), that uses a OneKey hardware wallet for all cryptographic operations.

In most regards, it works in the same way as
[eth-hd-keyring](https://github.com/MetaMask/eth-hd-keyring), but using a OneKey
device. However there are a number of differences:

- Because the keys are stored in the device, operations that rely on the device
  will fail if there is no OneKey device attached, or a different OneKey device
  is attached.

- It does not support the `signMessage`, `signTypedData` or `exportAccount`
  methods, because OneKey devices do not support these operations.

- Because extensions have limited access to browser features, there's no easy way to interact wth the OneKey Hardware wallet from the MetaMask extension. This library implements a workaround to those restrictions by injecting (on demand) an iframe to the background page of the extension,

## Usage

In addition to all the known methods from the [Keyring class protocol](https://github.com/MetaMask/eth-simple-keyring#the-keyring-class-protocol),
there are a few others:

- **isUnlocked** : Returns true if we have the public key in memory, which allows to generate the list of accounts at any time

- **unlock** : Connects to the OneKey device and exports the extended public key, which is later used to read the available ethereum addresses inside the OneKey account.

- **setAccountToUnlock** : the index of the account that you want to unlock in order to use with the signTransaction and signPersonalMessage methods

- **getFirstPage** : returns the first ordered set of accounts from the OneKey account

- **getNextPage** : returns the next ordered set of accounts from the OneKey account based on the current page

- **getPreviousPage** : returns the previous ordered set of accounts from the OneKey account based on the current page

- **forgetDevice** : removes all the device info from memory so the next interaction with the keyring will prompt the user to connect the OneKey device and export the account information

## Testing and Linting

Run `yarn test` to run the tests once. To run tests on file changes, run `yarn test:watch`.

Run `yarn lint` to run the linter, or run `yarn lint:fix` to run the linter and fix any automatically fixable issues.
