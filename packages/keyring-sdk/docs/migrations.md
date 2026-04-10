# Keyring State Migrations

A framework for evolving keyring serialized state across versions. Migrations run during `deserialize()` and transform old state into the current format.

Versioned state is stored as an envelope:

```json
{
  "version": 2,
  "data": { "accountCount": 3, "mnemonic": [...], "hdPath": "m/44'/60'/0'/0" }
}
```

Unversioned state (vaults created before migration support was added) has no envelope. The framework treats it as version 0 and applies all migrations.

## Key Concepts

- **`schema`**: Validates the **output** of a migration at runtime.
- **`inputSchema`**: (Optional) Validates the **input** before the `migrate` function is called.
- **`defineMigration<Output, Input>`**: Ensures the `migrate` function's return type matches the `schema` type at compile time.
- **`defineMigrations()`**: A utility to chain migrations together, allowing TypeScript to infer the final state type.

## Example

### 1. Define State Schemas

Define a schema for each version of your state.

```typescript
import { object, array, number, string } from '@metamask/superstruct';
import type { Infer } from '@metamask/superstruct';

const HdStateV0Schema = object({
  numberOfAccounts: number(), // legacy field name
  mnemonic: array(number()),
  hdPath: string(),
});
type HdStateV0 = Infer<typeof HdStateV0Schema>;

const HdStateV1Schema = object({
  accountCount: number(), // renamed from numberOfAccounts
  mnemonic: array(number()),
  hdPath: string(),
});
type HdStateV1 = Infer<typeof HdStateV1Schema>;

const HdStateV2Schema = object({
  accountCount: number(),
  mnemonic: array(number()),
  hdPath: string(),
  createdAt: number(), // new field
});
type HdStateV2 = Infer<typeof HdStateV2Schema>;
```

### 2. Define the Migration Chain

```typescript
import { defineMigration, defineMigrations } from '@metamask/keyring-sdk';

const migrations = defineMigrations(
  defineMigration({
    version: 1,
    inputSchema: HdStateV0Schema,
    schema: HdStateV1Schema,
    migrate: (state) => ({
      accountCount: state.numberOfAccounts,
      mnemonic: state.mnemonic,
      hdPath: state.hdPath,
    }),
  }),
  defineMigration<HdStateV2, HdStateV1>({
    version: 2,
    schema: HdStateV2Schema,
    migrate: (state) => ({ ...state, createdAt: Date.now() }),
  }),
);
```

### 3. Implement in your Keyring

```typescript
import { applyMigrations, getLatestVersion } from '@metamask/keyring-sdk';
import type { Json } from '@metamask/utils';

class MyKeyring {
  async deserialize(state: Json): Promise<void> {
    const { data } = await applyMigrations(state, migrations);

    // data is typed as HdStateV2
    this.#mnemonic = data.mnemonic;
    this.#accountCount = data.accountCount;
    this.#hdPath = data.hdPath;
  }

  async serialize(): Promise<Json> {
    return {
      version: getLatestVersion(migrations),
      data: {
        mnemonic: this.#mnemonic,
        accountCount: this.#accountCount,
        hdPath: this.#hdPath,
      },
    } as Json;
  }
}
```

## Best Practices

- **Idempotent migrations**: Design migrations so re-running them on already-migrated data is harmless.
- **Immutability**: Treat the input `state` as immutable within the `migrate` function.
- **Schema coverage**: Ensure `schema` covers all fields expected in the new version to prevent runtime errors.

## Constraints

- **Sequential versions**: migrations must be numbered 1, 2, 3, ... with no gaps.
- **Forward-only**: there is no downgrade path; code that does not understand the versioned envelope will fail on migrated state.
