import type { Infer, Struct } from '@metamask/superstruct';
import { assert, integer, is, object } from '@metamask/superstruct';
import { JsonStruct, type Json } from '@metamask/utils';

/**
 * A single migration step that transforms keyring state from one version to the next.
 *
 * The generic `Output` parameter controls the return type of `migrate`. Use
 * {@link defineMigration} to create migrations with compile-time type binding between
 * `migrate` and `schema`.
 *
 * Use an array with `as const` so that `applyMigrations` can infer the last migration's
 * output type and return a typed `data` field.
 *
 * @example
 * ```typescript
 * const V1Schema = object({ accountCount: number(), hdPath: string() });
 * type V1State = Infer<typeof V1Schema>;
 *
 * const migration = defineMigration<V1State>({
 *   version: 1,
 *   schema: V1Schema,
 *   migrate: (data) => {
 *     const prev = data as V0State;
 *     return { accountCount: prev.numberOfAccounts, hdPath: prev.hdPath };
 *   },
 * });
 * ```
 */
export type KeyringMigration<
  Output extends Json = Json,
  Input extends Json = Json,
> = {
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
   * @param data - The state data from the previous version.
   * @returns The migrated data.
   */
  migrate(data: Input): Output | Promise<Output>;
  /**
   * Optional validation function called by `applyMigrations` after this migration step.
   *
   * When using {@link defineMigration} with a `schema`, this is wired up automatically.
   *
   * @param data - The output of `migrate` to validate.
   */
  validate?(data: unknown): void;
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
 * When `inputSchema` is provided, state is validated against it before `migrate` is
 * called, and the `Input` type parameter is inferred so `migrate` receives a typed
 * argument with no manual cast needed.
 *
 * Returns `KeyringMigration<Output>` so that {@link defineMigrations} and
 * {@link applyMigrations} can infer the output type.
 *
 * @param config - The migration configuration.
 * @param config.version - The version this migration produces.
 * @param config.migrate - Transform state from the previous version.
 * @param config.schema - Optional schema to validate the migration output.
 * @param config.inputSchema - Optional schema to validate the migration input.
 * @returns A typed migration for use in arrays.
 * @example
 * ```typescript
 * const V0Schema = object({ numberOfItems: number() });
 * const V1Schema = object({ count: number() });
 *
 * const migration = defineMigration({
 *   version: 1,
 *   inputSchema: V0Schema,
 *   schema: V1Schema,
 *   migrate: (data) => ({ count: data.numberOfItems }),
 * });
 * ```
 */
export function defineMigration<
  Output extends Json,
  Input extends Json = Json,
>(config: {
  version: number;
  migrate: (data: Input) => Output | Promise<Output>;
  schema?: Struct<Output>;
  inputSchema?: Struct<Input>;
}): KeyringMigration<Output, Input> & { validate(data: unknown): void } {
  const { version, schema, inputSchema, migrate } = config;
  return {
    version,
    migrate: (data: Input): Output | Promise<Output> => {
      // `assert` can't accept `Struct<Input> | Struct<Json>`; cast is safe because
      // `Input extends Json`.
      assert(data, (inputSchema ?? JsonStruct) as Struct<Json>);
      return migrate(data);
    },
    validate: (data: unknown): void => {
      if (schema) {
        assert(data, schema);
      }
    },
  };
}

/**
 * Superstruct schema for the versioned state envelope.
 */
export const VersionedStateStruct = object({
  version: integer(),
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
 * Return value of {@link applyMigrations}.
 *
 * Extends {@link VersionedState} with a `migrated` flag that is `true` when at least
 * one migration was applied during the call. Callers can use this to detect that the
 * in-memory state has been upgraded and schedule a persist so the new version is
 * written to storage — even when no other state change happens in the session.
 *
 * `Data` is inferred as the last migration's output type when the migrations array is
 * declared with `as const` — see {@link applyMigrations}.
 */
export type MigrationResult<Data extends Json = Json> = VersionedState<Data> & {
  migrated: boolean;
};

/**
 * Type guard to check if a value is a {@link VersionedState} envelope.
 *
 * @param state - The value to check.
 * @returns `true` if the value is a versioned state envelope.
 */
export function isVersionedState<State extends Json = Json>(
  state: State | VersionedState<State>,
): state is VersionedState<State> {
  return is(state, VersionedStateStruct);
}

/**
 * Returns the highest version number from a migrations array, or 0 if empty.
 *
 * @param migrations - The migrations array.
 * @returns The latest version number.
 */
export function getLatestVersion(
  migrations: readonly KeyringMigration[],
): number {
  return Math.max(0, ...migrations.map((migration) => migration.version));
}

/**
 * Validate that migrations are sequential starting from 1 with no gaps or duplicates.
 *
 * @param migrations - The migrations array to validate.
 * @throws If migrations are invalid.
 */
function validateMigrations(migrations: readonly KeyringMigration[]): void {
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
function getVersionAndData<State extends Json = Json>(
  state: State | VersionedState<State>,
): VersionedState<State> {
  return isVersionedState(state)
    ? { version: state.version, data: state.data }
    : { version: 0, data: state };
}

/**
 * Extracts the output type of the last migration in a readonly tuple.
 *
 * Used by {@link applyMigrations} to infer the `data` type of the result when the
 * migrations array is declared with `as const`.
 */
type LastOutput<Migrations extends readonly KeyringMigration[]> =
  Migrations extends readonly [...KeyringMigration[], infer Last]
    ? Last extends KeyringMigration<infer Output>
      ? Output
      : Json
    : Json;

/**
 * Apply pending migrations to keyring state.
 *
 * Handles both versioned state (wrapped in `{ version, data }` envelope) and
 * unversioned legacy state (treated as version 0).
 *
 * Use an array with `as const` to declare the migrations and get a typed `data` field
 * without a cast in `deserialize()`:
 *
 * ```typescript
 * const migrations = [
 *   defineMigration({ version: 1, ... }),
 *   defineMigration({ version: 2, ... }),
 * ] as const;
 *
 * const { data } = await applyMigrations(state, migrations);
 * // data is V2
 * ```
 *
 * Without `as const` (array typed as `KeyringMigration[]`), `data` falls back to
 * `Json`.
 *
 * @param state - The serialized keyring state (from vault or previous serialize).
 * @param migrations - Ordered array of migrations to apply.
 * @returns The migrated state wrapped in a versioned envelope, plus a `migrated` flag.
 */
export async function applyMigrations<
  Migrations extends readonly KeyringMigration[],
>(
  state: Json,
  migrations: Migrations,
): Promise<MigrationResult<LastOutput<Migrations>>> {
  validateMigrations(migrations);

  const latestVersion = getLatestVersion(migrations);
  let { version, data } = getVersionAndData(state);

  if (version > latestVersion) {
    throw new Error(
      `State version ${version} is newer than the latest migration version ${latestVersion}`,
    );
  }

  let migrated = false;
  for (const migration of migrations) {
    if (version < migration.version) {
      data = await migration.migrate(data);
      version = migration.version;
      migrated = true;

      // This will throw if the validation fails, so it's not possible to return a
      // partially migrated state.
      migration.validate?.(data);
    }
  }

  return { version, data, migrated } as MigrationResult<LastOutput<Migrations>>;
}
