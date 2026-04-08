# Keyring State Migrations

A framework for evolving keyring serialized state across versions. Migrations run during
`deserialize()` and transform old state formats into the current one.

## How it works

Serialized state is wrapped in a versioned envelope, for example:

```json
{
  "version": 2,
  "data": {
    "mnemonic": [...],
    "accountCount": 3,
    "hdPath": "m/44'/60'/0'/0"
  }
}
```

- `version`: the schema version of `data` (integer, starting from 1)
- `data`: the actual keyring state

Unversioned state (from vaults created before migration support) has no envelope. The
framework treats this as version 0 and applies all migrations.

After `deserialize()` applies migrations, `serialize()` must produce the envelope so the
vault auto-updates on the next save.

## Defining migrations

Import from `@metamask/keyring-sdk`:

```typescript
import {
  applyMigrations,
  defineMigration,
  getLatestVersion,
  type KeyringMigration,
} from '@metamask/keyring-sdk';
```

Define explicit types for each version of the state, then define an ordered array of
migrations. Versions must be sequential starting from 1.

Use `defineMigration<OutputType>()` to create migrations with compile-time type binding
between `migrate` and `schema`. TypeScript enforces that both use the same output type.
The `schema` is passed as a superstruct `Struct<Output>`, and `defineMigration` wires
validation automatically via `assert`.

```typescript
import type { Infer } from '@metamask/superstruct';
import { object, array, number, string } from '@metamask/superstruct';

// Version 0 (unversioned, original format)
type HdStateV0 = {
  numberOfAccounts: number;
  mnemonic: number[];
  hdPath: string;
};

// Version 1 (renamed field)
const HdStateV1Schema = object({
  accountCount: number(),
  mnemonic: array(number()),
  hdPath: string(),
});
type HdStateV1 = Infer<typeof HdStateV1Schema>;

// Version 2 (added field)
const HdStateV2Schema = object({
  accountCount: number(),
  mnemonic: array(number()),
  hdPath: string(),
  createdAt: number(),
});
type HdStateV2 = Infer<typeof HdStateV2Schema>;

const migrations: KeyringMigration[] = [
  defineMigration<HdStateV1>({
    version: 1,
    schema: HdStateV1Schema,
    migrate: (state) => {
      const prev = state as HdStateV0;
      return {
        mnemonic: prev.mnemonic,
        accountCount: prev.numberOfAccounts,
        hdPath: prev.hdPath,
      };
    },
  }),
  defineMigration<HdStateV2>({
    version: 2,
    schema: HdStateV2Schema,
    migrate: (state) => {
      const prev = state as HdStateV1;
      return {
        ...prev,
        createdAt: Date.now(),
      };
    },
  }),
];
```

`schema` is optional — omit it for migrations that don't need runtime validation.

## Integrating into a keyring

Update `deserialize()` and `serialize()`:

```typescript
import {
  applyMigrations,
  defineMigration,
  getLatestVersion,
} from '@metamask/keyring-sdk';
import type { Json } from '@metamask/utils';

type MyKeyringState = {
  mnemonic: number[];
  accountCount: number;
  hdPath: string;
};

const migrations = [
  // ... your migrations created with defineMigration()
];

class MyKeyring {
  #mnemonic: number[] = [];

  #accountCount: number = 0;

  #hdPath: string = '';

  async deserialize(state: Json): Promise<void> {
    // Apply pending migrations. Handles both versioned and unversioned state.
    const { data } = await applyMigrations(state, migrations);

    // Use `data` (not `state`) for the rest of deserialization.
    const typed = data as MyKeyringState;
    this.#mnemonic = typed.mnemonic;
    this.#accountCount = typed.accountCount;
    this.#hdPath = typed.hdPath;
  }

  async serialize(): Promise<Json> {
    // Always wrap in the versioned envelope.
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

## Constraints

- **Sequential versions**: migrations must be numbered 1, 2, 3, ... with no gaps
- **Forward-only**: there is no downgrade path. Code that doesn't understand the
  versioned envelope will fail on migrated state
- **Runs during `deserialize()`**: migrations execute at wallet unlock time, keep them
  fast
- **KeyringController is unchanged**: the controller treats serialized state as opaque
  `Json`, so the versioned envelope is transparent to it
