# Keyring State Migrations

A framework for evolving keyring serialized state across versions. Migrations run during
`deserialize()` and transform old state into the current format.

Versioned state is stored as an envelope:

```json
{
  "version": 2,
  "data": { "accountCount": 3, "mnemonic": [...], "hdPath": "m/44'/60'/0'/0" }
}
```

Unversioned state (vaults created before migration support was added) has no envelope.
The framework treats it as version 0 and applies all migrations.

## Example

```typescript
import {
  applyMigrations,
  defineMigration,
  defineMigrations,
  getLatestVersion,
} from '@metamask/keyring-sdk';
import type { Infer } from '@metamask/superstruct';
import { object, array, number, string } from '@metamask/superstruct';
import type { Json } from '@metamask/utils';

// Define a type and schema for each state version.
// `schema` validates the migration output at runtime;
// `inputSchema` validates the input before `migrate` is called.

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

// defineMigration<Output, Input> binds `migrate` and `schema` to the same Output
// type at compile time — a mismatch is a type error, not a runtime surprise.
//
// defineMigrations() wraps the array in a tuple so TypeScript can infer that
// `data` returned by applyMigrations is typed as HdStateV2 (no cast needed).
const migrations = defineMigrations(
  defineMigration<HdStateV1, HdStateV0>({
    version: 1,
    inputSchema: HdStateV0Schema, // validates legacy state before migrate runs
    schema: HdStateV1Schema, // validates output; also covers v2's input implicitly
    migrate: (state) => ({
      // state is typed as HdStateV0
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

class MyKeyring {
  async deserialize(state: Json): Promise<void> {
    // applyMigrations runs only the migrations newer than the state's current version.
    // `migrated` is true if at least one migration ran.
    const { data, migrated } = await applyMigrations(state, migrations);

    if (migrated) {
      // Schedule a persist so the upgraded state is written to storage even if
      // nothing else changes this session.
    }

    // data is typed as HdStateV2 — no cast needed
    this.#mnemonic = data.mnemonic;
    this.#accountCount = data.accountCount;
    this.#hdPath = data.hdPath;
  }

  async serialize(): Promise<Json> {
    // Always wrap in the versioned envelope so the vault stays up to date.
    return {
      version: getLatestVersion(migrations), // 2
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

- **Idempotent migrations**: a migration may run more than once in a session if the
  controller does not persist state after unlock. Design migrations so re-running them
  on already-migrated data is harmless; use the `migrated` flag to schedule a persist.

- **Sequential versions**: migrations must be numbered 1, 2, 3, ... with no gaps.

- **Forward-only**: there is no downgrade path; code that does not understand the
  versioned envelope will fail on migrated state.
