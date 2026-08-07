import type { Infer, Struct } from '@metamask/superstruct';
import {
  assert,
  integer,
  is,
  record,
  refine,
  string,
  type,
} from '@metamask/superstruct';
import { JsonStruct } from '@metamask/utils';
import type { Json } from '@metamask/utils';

/**
 * Constraint for flat migration state: must be a plain JSON object so that the
 * `version` field can be inlined alongside its other fields.
 */
export type JsonObject = Record<string, Json>;

/**
 * Superstruct schema for a plain JSON object (`Record<string, Json>`).
 *
 * Used as the default fallback schema for step input/output validation when no
 * explicit schema is provided.
 */
// `record(string(), JsonStruct)` alone would accept arrays: `typeof [] === 'object'`
// satisfies superstruct's `isObject` check, and `Object.entries(['a', 'b'])` yields
// valid string keys with JSON values. The refinement makes the array rejection explicit.
export const JsonObjectStruct: Struct<JsonObject> = refine(
  record(string(), JsonStruct),
  'JsonObject',
  (value) =>
    typeof value === 'object' && value !== null && !Array.isArray(value),
);

/**
 * Superstruct schema for an exact `{ version: integer }` object with no other
 * fields.
 *
 * Use this struct when you need to validate a pure version token. To check
 * whether arbitrary flat state carries a version field, use
 * {@link isVersionedState} instead.
 */
export const VersionedStateStruct = type({
  version: integer(),
});

/**
 * Flat versioned state: the keyring state with `version` inlined alongside its
 * own fields.
 *
 * This is the format that `serialize()` should produce and `deserialize()` will
 * consume. The `version` field is managed by the migration framework; every
 * other field belongs to the keyring.
 *
 * Do not use `version` or `migrated` as field names in keyring state, as the
 * framework writes both at the top level when constructing a
 * {@link MigrationResult}.
 *
 * @example
 * const state: VersionedState<{ accounts: string[] }> = {
 *   version: 3,
 *   accounts: [],
 * };
 */
export type VersionedState<Data extends JsonObject = JsonObject> = Data &
  Infer<typeof VersionedStateStruct>;

/**
 * Return value of {@link MigrationChain.apply}.
 *
 * `state` is the flat {@link VersionedState} to persist. `migrated` is a
 * runtime-only flag that is never written to storage. `version` duplicates
 * `state.version` for convenience.
 */
export type MigrationResult<Data extends JsonObject = JsonObject> = {
  /** Convenience alias for `state.version`. */
  version: number;
  /** The migrated flat state to persist. */
  state: VersionedState<Data>;
  /** `true` when at least one migration step was applied during this call. */
  migrated: boolean;
};

/**
 * Type guard to check if a value is a plain JSON object.
 *
 * @param value - The value to check.
 * @returns `true` if the value is a non-null, non-array object.
 */
function isJsonObject(value: Json): value is JsonObject {
  return is(value, JsonObjectStruct);
}

/**
 * Type guard to check if a value is a {@link VersionedState}.
 *
 * Returns `true` for any plain object that carries a `version: integer` field,
 * regardless of what other fields are present.
 *
 * @param state - The value to check.
 * @returns `true` if the value has a `version: integer` field.
 */
export function isVersionedState(state: Json): state is VersionedState {
  return is(state, VersionedStateStruct);
}

/**
 * Extract the version and inner data from state.
 *
 * For versioned state (`isVersionedState` returns true), strips the `version`
 * field and returns the rest as data. For unversioned legacy state (plain
 * object with no `version` field), returns version 0 and the object as-is.
 *
 * @param state - The state to decompose.
 * @returns The version number and the inner data object.
 */
function getVersionAndData(state: Json): { version: number; data: JsonObject } {
  if (isVersionedState(state)) {
    const { version, ...data } = state;
    return { version, data };
  }

  if (!isJsonObject(state)) {
    throw new Error('Unversioned state must be a plain object');
  }

  return { version: 0, data: state };
}

/**
 * A single migration step, added to a {@link MigrationChain} via `.add()`.
 *
 * `Input` is bound automatically to the chain's current data type when the
 * step is passed to `.add()`, so `migrate` receives a correctly typed argument
 * with no manual cast.
 */
export type MigrationStep<
  Input extends JsonObject = JsonObject,
  Output extends JsonObject = JsonObject,
> = {
  /**
   * Transform state from the previous step's output to this step's output.
   *
   * Receives the raw inner data (not the versioned envelope). May be sync or
   * async to support complex operations like re-deriving data from secrets.
   *
   * @param data - The state data from the previous step.
   * @returns The migrated data.
   */
  migrate(data: Input): Output | Promise<Output>;
  /**
   * Optional schema validating this step's input before `migrate` is called.
   */
  inputSchema?: Struct<Input>;
  /**
   * Optional schema validating this step's output at runtime.
   */
  outputSchema?: Struct<Output>;
};

/**
 * A chain of migration steps for evolving keyring serialized state across
 * versions.
 *
 * Steps are versioned by position: the first `.add()` call produces version 1,
 * the second version 2, and so on. Create one with {@link createMigrations}.
 */
export type MigrationChain<Data extends JsonObject = JsonObject> = {
  /**
   * The number of steps added so far. Also the latest version number (use it
   * in `serialize()`).
   */
  readonly version: number;
  /**
   * Append a step to the chain.
   *
   * Returns a new chain typed to `Output`. Does not mutate the chain it is
   * called on, so branching from a shared base chain is safe.
   *
   * @param step - The migration step to append.
   * @returns A new chain whose data type is the step's `Output`.
   */
  add<Input extends Data = Data, Output extends JsonObject = JsonObject>(
    step: MigrationStep<Input, Output>,
  ): MigrationChain<Output>;
  /**
   * Apply all pending steps to `state`.
   *
   * Handles both flat versioned state (with a `version` field) and unversioned
   * legacy state (plain object without `version`, treated as version 0).
   *
   * @param state - The serialized keyring state (from vault or previous
   * serialize).
   * @returns The migrated state wrapped in a {@link MigrationResult}.
   * @throws If `state` is not a plain object, if its version is newer than the
   * chain's latest version, or if a step's `inputSchema`/`outputSchema`
   * validation fails.
   */
  apply(state: Json): Promise<MigrationResult<Data>>;
};

/**
 * Apply the pending steps of a chain to `state`.
 *
 * Implements {@link MigrationChain.apply} for the chain built from `steps`.
 *
 * @param steps - All steps of the chain.
 * @param state - The serialized keyring state.
 * @returns The migrated state in a {@link MigrationResult}.
 */
async function applySteps<Data extends JsonObject>(
  steps: readonly MigrationStep[],
  state: Json,
): Promise<MigrationResult<Data>> {
  const latestVersion = steps.length;
  const { version, data: initialData } = getVersionAndData(state);

  if (version < 0) {
    throw new Error(
      `State version ${version} is invalid; it cannot be negative`,
    );
  }

  if (version > latestVersion) {
    throw new Error(
      `State version ${version} is newer than the latest migration version ${latestVersion}`,
    );
  }

  const pendingSteps = steps.slice(version);
  let data: JsonObject = initialData;

  for (const step of pendingSteps) {
    assert(data, step.inputSchema ?? JsonObjectStruct);
    data = await step.migrate(data);
    assert(data, step.outputSchema ?? JsonObjectStruct);
  }

  return {
    version: latestVersion,
    state: {
      ...data,
      version: latestVersion,
    },
    migrated: pendingSteps.length > 0,
  } as MigrationResult<Data>;
}

/**
 * Build a {@link MigrationChain} wrapping the given internal steps.
 *
 * @param steps - The steps accumulated so far.
 * @returns A chain exposing `add`, `version`, and `apply`.
 */
function buildChain<Data extends JsonObject>(
  steps: readonly MigrationStep[],
): MigrationChain<Data> {
  return {
    version: steps.length,
    add: <Input extends Data, Output extends JsonObject>(
      step: MigrationStep<Input, Output>,
    ) => buildChain<Output>([...steps, step as unknown as MigrationStep]),
    apply: async (state) => applySteps<Data>(steps, state),
  };
}

/**
 * Start a new, empty migration chain.
 *
 * @example
 * ```typescript
 * const migrations = createMigrations()
 *   .add({ migrate: (data) => ({ count: data.numberOfItems }) })
 *   .add({ migrate: (data) => ({ ...data, createdAt: Date.now() }) }); // data typed as the first step's output, no cast
 *
 * const { state, migrated } = await migrations.apply(serializedState);
 * // Persist `state`; re-save if `migrated` is true.
 * ```
 * @returns An empty chain typed to `JsonObject`.
 */
export function createMigrations(): MigrationChain<JsonObject> {
  return buildChain<JsonObject>([]);
}
