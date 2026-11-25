# MPC Money Keyring

A Keyring for Ethereum money accounts that uses Multi-Party Computation (MPC) for key management and signing, built on top of the [MFA Wallet SDK](https://github.com/MetaMask/mfa-wallet-sdk).

The default export is the V1 `MpcMoneyKeyring` implementation. A V2 adapter that wraps it is available from `@metamask/eth-money-mpc-keyring/v2`.

## Watch-only and signing accounts

The constructor requires a tagged options object. Existing signing integrations
must add `type: 'signing'` to their existing options. Watch-only integrations need
only the cloud endpoint and authenticated profile-token callback:

```typescript
const keyring = new MpcMoneyKeyring({
  type: 'watch-only',
  cloudURL: 'https://mpc.example/v2',
  getProfileToken,
});
await keyring.setup();
const [address] = await keyring.getAccounts();
```

Watch-only setup calls `check-key-share` and accepts its public key only when
`activeEpoch` is present and equals `latestShareEpoch` in that same response.
It never creates, imports, backs up, or activates a share, opens a relayer session,
or asks for a mnemonic. A missing key, older backend without public-key support,
or pending share produces an error that the caller can retry. With the current
API, a pending rotation obscures the active public key even though an active
account exists. No background polling is performed.

Public-only state is persisted with `type: 'watch-only'`. Deserialization is
offline; the account remains available after restarting without contacting the
backend. Signing state is persisted with `type: 'signing'`; existing untagged
signing state remains readable.

To enable signing later, reconstruct the keyring with `type: 'signing'` and the
required signing dependencies, deserialize its watch-only state, and explicitly
call `setup()`. This path **only imports** the active backup and requires the
existing mnemonic and MFA. It never falls back to key generation. The imported
address must match the watch-only account before client registration and local
state replacement. Failure preserves public-only state for retry. Loading signing
state into a watch-only constructor is unsupported.

The V1 `canSign` getter reports effective capability, not the constructor option.
The V2 adapter exposes `methods: []` until signing material is ready, then exposes
the supported signing methods without changing the account ID or address.
`createAccounts({ type: 'custom' })` always invokes idempotent setup, including
when an account already exists, to support this transition. Consumers that cache
account metadata must refresh and persist it after successful setup. The keyring
type remains `MPC Money Keyring` in both configurations.

## MFA

The backend decides which signature requests require MFA, using [`getMfaRequirement`](https://github.com/MetaMask/core/tree/main/packages/money-account-mfa-whitelist). The keyring doesn't check the request itself, so the backend can change its whitelist without a client update.

The keyring first calls `/sign` with a profile token without 2FA, and sends the original request with the hash. When the request requires MFA, `/sign` responds with `{ "code": "mfa_required" }`. The keyring then requests a 2FA profile token for the hash and calls `/sign` once more.

Key generation, import, share rotation, share sync, and transaction signing always use a 2FA token.

## Device-share backups

Provide `getPrimaryMnemonic: () => Promise<number[]>` when constructing the keyring.
The callback takes no arguments and returns the wallet's primary mnemonic as UTF-8 byte values.

The keyring uses the SDK's MetaMask-specific BIP-85 profile through `KeyRoot.fromMnemonic` and `root.deriveSecret`:

- **Index:** `0`, independent of share epochs.
- **Length:** `32` bytes.
- **Purpose:** `Purpose.MoneyAccountMpcDeviceShareWrappingKey` (`metamask:money-account:mpc:device-share:wrapping-key:v1`).

The keyring destroys the temporary root on success or failure.
It uses the derived secret to encrypt serialized backups with AES-256-GCM, not AES-KW or AES-KWP.
Each backup uses a fresh random 96-bit IV. Decryption rejects authentication failures.

Recovery requires the same primary mnemonic.
Backups from `getBackupEncryptionKey` remain compatible only if that callback returned the same key.
Otherwise, re-encrypt existing backups before switching.

## Installation

`yarn add @metamask/eth-money-mpc-keyring`

or

`npm install @metamask/eth-money-mpc-keyring`

## Contributing

This package is part of a monorepo. Instructions for contributing can be found in the [monorepo README](https://github.com/MetaMask/accounts#readme).
