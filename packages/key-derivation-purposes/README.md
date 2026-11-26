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
import { Purpose } from '@metamask/key-derivation-purposes';

const purpose = Purpose.MoneyAccountMpcDeviceShareWrappingKey;
```

`Purpose` is also a type representing the union of registered purpose values.
Use `KeyDerivationPurpose` when accepting consumer-defined purposes as well.

## Registry

| Constant                                        | Owner          | Intended use                                                 | Key type                       |
| ----------------------------------------------- | -------------- | ------------------------------------------------------------ | ------------------------------ |
| `Purpose.MoneyAccountMpcDeviceShareWrappingKey` | Money Accounts | Wrap MPC device-share backups for MFA recovery using AES-GCM | 32-byte symmetric wrapping key |

The device-share constant's value is `metamask:money-account:mpc:device-share:wrapping-key:v1`.
Wrapping means AES-256-GCM encryption of serialized device-share backups, not AES-KW or AES-KWP. Use a fresh 96-bit IV for each backup and reject authentication failures.

## Allocation rules

- Use a unique, stable purpose matching `metamask:<scope>:v<version>`, with a
  non-empty scope and non-negative integer version.
- Document each entry's owner, intended use, and key type.
- Published strings are immutable: changing a purpose changes the derived key.
  Introduce a new constant and purpose version for a new use rather than editing
  an existing value.
- A purpose version identifies the consumer-specific use, not the derivation
  scheme version.
- This registry is not an allowlist. SDK helpers also accept correctly formatted
  consumer-defined purposes without requiring a registry or SDK release.
- Callers are responsible for the purpose format; the TypeScript type cannot
  enforce every constraint, and SDK helpers do not validate it at runtime.

Keep this package limited to constants, types, and documentation. It has no
runtime registration framework, secrets, or per-user state.
