import type { Infer, Struct } from '@metamask/superstruct';
import { assert, is, number, object } from '@metamask/superstruct';
import { JsonStruct, type Json } from '@metamask/utils';

/**
 * A single migration step that transforms keyring state from one version to the next.
 *
 * The generic `Output` parameter controls the return type of `migrate`. Use
 * {@link defineMigration} to create migrations with compile-time type binding between
 * `migrate` and `schema`.
 *
 * Migrations arrays should be typed as `KeyringMigration[]` and can contain
 * migrations with different output types.
 *
 * @example
 * ```typescript
 * const V1Schema = object({ accountCount: number(), hdPath: string() });
 * type V1State = Infer<typeof V1Schema>;
 *
 * const migration = defineMigration<V1State>({
 *   version: 1,
 *   schema: V1Schema,
 *   migrate: (state) => {
 *     const prev = state as V0State;
 *     return { accountCount: prev.numberOfAccounts, hdPath: prev.hdPath };
 *   },
 * });
 * ```
 */
export type KeyringMigration<Output extends Json = Json> = {
  /**
   * The version this migration produces. Must be sequential starting from 1.
   */
  version: number;

  /**
   * Transform state from the previous version to this version.
   *
   * Receives the raw inner data (not the versioned envelope). May be sync or async to
   * support complex operations like re-deriving data from secrets.
   *
   * @param state - The state from the previous version.
   * @returns The migrated state.
   */
  migrate: (state: Json) => Output | Promise<Output>;

  /**
   * Optional validation function called by `applyMigrations` after this migration step.
   *
   * When using {@link defineMigration} with a `schema`, this is wired up automatically.
   *
   * @param data - The output of `migrate` to validate.
   */
  validate?: (data: unknown) => void;
};

/**
 * Create a migration with compile-time type binding between `migrate` and `schema`.
 *
 * Unlike constructing a {@link KeyringMigration} directly, `defineMigration` ensures
 * that `schema` validates the same `Output` type that `migrate` returns. This prevents
 * mismatched schemas at compile time.
 *
 * The `schema` is a superstruct `Struct<Output>`. `defineMigration` wires it into the
 * `validate` callback automatically using `assert`.
 *
 * Returns `KeyringMigration` for array compatibility.
 *
 * @param config - The migration configuration.
 * @param config.version - The version this migration produces.
 * @param config.migrate - Transform state from the previous version.
 * @param config.schema - Optional superstruct schema to validate the migration output.
 * @returns A type-erased migration for use in arrays.
 * @example
 * ```typescript
 * const V1Schema = object({ count: number() });
 * type V1 = Infer<typeof V1Schema>;
 *
 * const migration = defineMigration<V1>({
 *   version: 1,
 *   schema: V1Schema,
 *   migrate: (state) => {
 *     const prev = state as V0;
 *     return { count: prev.numberOfItems };
 *   },
 * });
 * ```
 */
export function defineMigration<Output extends Json>(config: {
  version: number;
  migrate: (state: Json) => Output | Promise<Output>;
  schema?: Struct<Output>;
}): KeyringMigration {
  const { schema, ...rest } = config;
  return {
    ...rest,
    validate: schema
      ? (data: unknown): void => assert(data, schema)
      : undefined,
  } as KeyringMigration;
}

/**
 * Superstruct schema for the versioned state envelope.
 */
export const VersionedStateStruct = object({
  version: number(),
  data: JsonStruct,
});

/**
 * Versioned state envelope wrapping the actual keyring data.
 *
 * After migrations are applied, state is always wrapped in this format. `serialize()`
 * should produce this envelope so that subsequent `deserialize()` calls can detect the
 * version.
 */
export type VersionedState<Data extends Json = Json> = Omit<
  Infer<typeof VersionedStateStruct>,
  'data'
> & {
  data: Data;
};

/**
 * Type guard to check if a value is a {@link VersionedState} envelope.
 *
 * @param state - The value to check.
 * @returns `true` if the value is a versioned state envelope.
 */
export function isVersionedState(state: Json): state is VersionedState {
  return is(state, VersionedStateStruct);
}

/**
 * Returns the highest version number from a migrations array, or 0 if empty.
 *
 * @param migrations - The migrations array.
 * @returns The latest version number.
 */
export function getLatestVersion(migrations: KeyringMigration[]): number {
  return Math.max(0, ...migrations.map((migration) => migration.version));
}

/**
 * Validate that migrations are sequential starting from 1 with no gaps or duplicates.
 *
 * @param migrations - The migrations array to validate.
 * @throws If migrations are invalid.
 */
function validateMigrations(migrations: KeyringMigration[]): void {
  for (const [index, migration] of migrations.entries()) {
    const expectedVersion = index + 1;

    if (migration.version !== expectedVersion) {
      throw new Error(
        `Invalid migration: expected version ${expectedVersion} at index ${index}, got ${migration.version}`,
      );
    }
  }
}

/**
 * Get the version number from state, treating unversioned state as version 0.
 *
 * @param state - The state to check.
 * @returns The version number.
 */
function getVersionAndData(state: Json | VersionedState): {
  version: number;
  data: Json;
} {
  return isVersionedState(state)
    ? { version: state.version, data: state.data }
    : { version: 0, data: state };
}

/**
 * Apply pending migrations to keyring state.
 *
 * Handles both versioned state (wrapped in `{ version, data }` envelope) and
 * unversioned legacy state (treated as version 0).
 *
 * @param state - The serialized keyring state (from vault or previous serialize).
 * @param migrations - Ordered array of migrations to apply.
 * @returns The migrated state wrapped in a versioned envelope.
 */
export async function applyMigrations(
  state: Json,
  migrations: KeyringMigration[],
): Promise<VersionedState> {
  validateMigrations(migrations);

  const latestVersion = getLatestVersion(migrations);
  let { version, data } = getVersionAndData(state);

  if (version > latestVersion) {
    throw new Error(
      `State version ${version} is newer than the latest migration version ${latestVersion}`,
    );
  }

  for (const migration of migrations) {
    if (version < migration.version) {
      version = migration.version;
      data = await migration.migrate(data);

      if (migration.validate) {
        migration.validate(data);
      }
    }
  }

  return { version, data };
}
