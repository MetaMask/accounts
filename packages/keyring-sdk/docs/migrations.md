# Keyring State Migrations

A framework for evolving keyring serialized state across versions. Migrations run during `deserialize()` and transform old state into the current format.

Versioned state is stored as an envelope:

```json5
{
  version: 1,
  data: {
    // Keyring state
  },
}
```

Unversioned state (vaults created before migration support was added) has no envelope. The framework treats it as version 0 and applies all steps.

## Key Concepts

- **`createMigrations()`**: Starts an empty migration chain.
- **`.add(step)`**: Appends a step to the chain and returns a new chain typed to that step's output.
- **`outputSchema`**: (Optional) Validates the **output** of a step at runtime.
- **`inputSchema`**: (Optional) Validates the **input** before the `migrate` function is called.
- **Positional versions**: The first `.add()` call produces version 1, the second version 2, and so on.

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

const HdStateV1Schema = object({
  accountCount: number(), // renamed from numberOfAccounts
  mnemonic: array(number()),
  hdPath: string(),
});

const HdStateV2Schema = object({
  accountCount: number(),
  mnemonic: array(number()),
  hdPath: string(),
  createdAt: number(), // new field
});

type HdStateV0 = Infer<typeof HdStateV0Schema>;
type HdStateV1 = Infer<typeof HdStateV1Schema>;
type HdStateV2 = Infer<typeof HdStateV2Schema>;
```

### 2. Define the Migration Chain

```typescript
import { createMigrations } from '@metamask/keyring-sdk';

const migrations = createMigrations()
  .add({
    inputSchema: HdStateV0Schema,
    outputSchema: HdStateV1Schema,
    migrate: (data) => ({
      accountCount: data.numberOfAccounts,
      mnemonic: data.mnemonic,
      hdPath: data.hdPath,
    }),
  })
  .add({
    outputSchema: HdStateV2Schema,
    migrate: (data) => ({ ...data, createdAt: Date.now() }), // data is typed as HdStateV1, no cast needed
  });
```

### 3. Implement in your Keyring

```typescript
import type { VersionedState } from '@metamask/keyring-sdk';
import type { Json } from '@metamask/utils';

class MyKeyring {
  async deserialize(state: Json): Promise<void> {
    const { data } = await migrations.apply(state);

    // data is typed as HdStateV2
    this.#mnemonic = data.mnemonic;
    this.#accountCount = data.accountCount;
    this.#hdPath = data.hdPath;
  }

  async serialize(): Promise<VersionedState<HdStateV2>> {
    return {
      version: migrations.version,
      data: {
        mnemonic: this.#mnemonic,
        accountCount: this.#accountCount,
        hdPath: this.#hdPath,
      },
    };
  }
}
```

## Best Practices

- **Idempotent migrations**: Design steps so re-running them on already-migrated data is harmless.
- **Immutability**: Treat the input `data` as immutable within the `migrate` function.
- **Schema coverage**: Ensure `outputSchema` covers all fields expected in the new version to prevent runtime errors.
- **Non-mutating chains**: `.add()` returns a new chain rather than mutating the one it's called on, so it's safe to branch multiple chains off a shared base.

## Constraints

- **Forward-only**: there is no downgrade path. Code that does not understand the versioned envelope will fail on migrated state.
