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

### With `defineMigration` (recommended)

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

### Without validation

For simple migrations that don't need runtime validation, omit the `schema`:

```typescript
const migrations = [
  defineMigration<HdStateV1>({
    version: 1,
    migrate: (state) => {
      const prev = state as HdStateV0;
      return {
        mnemonic: prev.mnemonic,
        accountCount: prev.numberOfAccounts,
        hdPath: prev.hdPath,
      };
    },
  }),
];
```

### Async migrations

`migrate` can be async for complex operations like re-deriving data:

```typescript
type HdStateV3 = HdStateV2 & {
  cachedAddresses: string[];
};

defineMigration<HdStateV3>({
  version: 3,
  migrate: async (state) => {
    const prev = state as HdStateV2;
    const addresses = await deriveAddresses(
      prev.mnemonic,
      prev.accountCount,
      prev.hdPath,
    );
    return { ...prev, cachedAddresses: addresses };
  },
});
```

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

## API reference

### `applyMigrations(state, migrations): Promise<VersionedState>`

Applies pending migrations to keyring state.

- If `state` has a `version` envelope, extracts current version and inner data
- If `state` has no envelope (legacy), treats as version 0
- Validates migrations are sequential (1, 2, 3, ...)
- Applies each migration where `migration.version > currentVersion`
- Calls `validate(result)` after each step that has validation (via `defineMigration`
  schema)
- Returns `{ version, data }` with the latest version and migrated data
- Throws if state version is newer than the latest migration

### `defineMigration<Output extends Json>(config): KeyringMigration`

Creates a migration with compile-time type binding between `migrate` and `schema`.
TypeScript enforces that `schema` validates the same `Output` type that `migrate`
returns. Wires the schema into a `validate` callback via `assert` automatically.

### `isVersionedState(state: Json): state is VersionedState`

Type guard. Returns `true` if `state` is `{ version: number, data: Json }`.

### `getLatestVersion(migrations): number`

Returns the highest version from the migrations array, or 0 if empty.

### `KeyringMigration<Output>`

```typescript
type KeyringMigration<Output extends Json = Json> = {
  version: number;
  migrate: (state: Json) => Output | Promise<Output>;
  validate?: (data: unknown) => void;
};
```

### `VersionedState<Data>`

```typescript
type VersionedState<Data extends Json = Json> = {
  version: number;
  data: Data;
};
```

## Constraints

- **Sequential versions**: migrations must be numbered 1, 2, 3, ... with no gaps
- **Forward-only**: there is no downgrade path. Code that doesn't understand the
  versioned envelope will fail on migrated state
- **Runs during `deserialize()`**: migrations execute at wallet unlock time, keep them
  fast
- **KeyringController is unchanged**: the controller treats serialized state as opaque
  `Json`, so the versioned envelope is transparent to it
