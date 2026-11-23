# Key Derivation Purposes

A shared registry of immutable purpose constants and the `KeyDerivationPurpose`
format type. This package has no runtime dependencies or cryptographic code.

## Installation

```bash
yarn add @metamask/key-derivation-purposes
```

or

```bash
npm install @metamask/key-derivation-purposes
```

## Usage

```ts
import { MONEY_ACCOUNT_MFA_ENCRYPTION_KEY_PURPOSE } from '@metamask/key-derivation-purposes';

const purpose = MONEY_ACCOUNT_MFA_ENCRYPTION_KEY_PURPOSE;
```

## Registry

| Constant                                   | Owner          | Intended use                                      | Key type                         | Derivation scheme/helper                                                                                                                                       |
| ------------------------------------------ | -------------- | ------------------------------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MONEY_ACCOUNT_MFA_ENCRYPTION_KEY_PURPOSE` | Money Accounts | Encrypt MPC device-share backups for MFA recovery | 32-byte symmetric encryption key | [ADR-0009](https://github.com/MetaMask/decisions/blob/main/decisions/accounts/0009-entropy-wrapping-keys.md), `deriveEncryptionKey` in `@metamask/keyring-sdk` |

The MFA constant's value is `metamask:money-account:mfa:encryption-key:v1`.

## Allocation rules

- Use a unique, stable purpose matching `metamask:<scope>:v<version>`, with a
  non-empty scope and non-negative integer version.
- Document each entry's owner, intended use, key type, and derivation scheme/helper.
- Published strings are immutable: changing a purpose changes the derived key.
  Introduce a new constant and purpose version for a new use rather than editing
  an existing value.
- A purpose version identifies the consumer-specific use, not the derivation
  scheme version.
- This registry is not an allowlist. SDK helpers also accept correctly formatted
  consumer-defined purposes without requiring a registry or SDK release.
- The TypeScript format type is not a substitute for runtime validation by the
  derivation helper.

Keep this package limited to constants, types, and documentation. It has no
runtime registration framework, secrets, or per-user state.
