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

Use `defineMigration<Output, Input>()` to create migrations with compile-time type
binding between `migrate` and `schema`. TypeScript enforces that both use the same
output type. The `schema` is passed as a superstruct `Struct<Output>`, and
`defineMigration` wires validation automatically via `assert`.

When `inputSchema` is provided, state is validated before `migrate` is called, and
`migrate` receives a typed argument with no manual cast needed. Each migration's
`schema` (output validation) also serves as implicit input validation for the next
migration, so a fully-schemed chain gives end-to-end validation with no extra work.

```typescript
import type { Infer } from '@metamask/superstruct';
import { object, array, number, string } from '@metamask/superstruct';

// Version 0 (unversioned, original format)
const HdStateV0Schema = object({
  numberOfAccounts: number(),
  mnemonic: array(number()),
  hdPath: string(),
});
type HdStateV0 = Infer<typeof HdStateV0Schema>;

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
  defineMigration<HdStateV1, HdStateV0>({
    version: 1,
    inputSchema: HdStateV0Schema, // validates legacy state; state typed as HdStateV0
    schema: HdStateV1Schema,
    migrate: (state) => ({
      mnemonic: state.mnemonic,
      accountCount: state.numberOfAccounts,
      hdPath: state.hdPath,
    }),
  }),
  defineMigration<HdStateV2, HdStateV1>({
    version: 2,
    inputSchema: HdStateV1Schema, // covered by v1 output schema; shown for explicitness
    schema: HdStateV2Schema,
    migrate: (state) => ({ ...state, createdAt: Date.now() }),
  }),
];
```

Both `schema` and `inputSchema` are optional.

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
    const { data, migrated } = await applyMigrations(state, migrations);

    if (migrated) {
      // At least one migration ran. Schedule a persist so the upgraded state
      // is written to storage even if nothing else changes this session.
      // How you trigger this depends on your keyring's persistence mechanism.
    }

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

## API reference

### `applyMigrations(state, migrations): Promise<MigrationResult>`

Applies pending migrations to keyring state.

- If `state` has a `version` envelope, extracts current version and inner data
- If `state` has no envelope (legacy), treats as version 0
- Validates migrations are sequential (1, 2, 3, ...)
- Applies each migration where `migration.version > currentVersion`
- Calls `validate(result)` after each step that has validation (via `defineMigration`
  schema)
- Returns `{ version, data, migrated }` — `migrated` is `true` if any migration ran
- Throws if state version is newer than the latest migration

### `defineMigration<Output, Input>(config): KeyringMigration`

Creates a migration with compile-time type binding between `migrate` and `schema`.
TypeScript enforces that `schema` validates the same `Output` type that `migrate`
returns. Wires the schema into a `validate` callback via `assert` automatically.

- `inputSchema` — optional `Struct<Input>`: validated before `migrate` is called.
  `migrate` then receives a typed `Input` argument with no manual cast needed.

### `getLatestVersion(migrations): number`

Returns the highest version from the migrations array, or 0 if empty.

## Constraints

- **Sequential versions**: migrations must be numbered 1, 2, 3, ... with no gaps
- **Forward-only**: there is no downgrade path. Code that doesn't understand the
  versioned envelope will fail on migrated state
- **Idempotent migrations**: a migration may run more than once in a session if the
  controller doesn't persist state after unlock. Design migrations so that running them
  again on already-migrated data is harmless, and use the `migrated` flag to schedule a
  persist when possible
- **Runs during `deserialize()`**: migrations execute at wallet unlock time, keep them
  fast
- **KeyringController is unchanged**: the controller treats serialized state as opaque
  `Json`, so the versioned envelope is transparent to it
