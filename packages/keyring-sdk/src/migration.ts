import type { Infer, Struct } from '@metamask/superstruct';
import { assert, integer, is, object } from '@metamask/superstruct';
import { JsonStruct } from '@metamask/utils';
import type { Json } from '@metamask/utils';

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
 * Return value of {@link MigrationChain.apply}.
 *
 * Extends {@link VersionedState} with a `migrated` flag that is `true` when at least
 * one step was applied during the call. Callers can use this to detect that the
 * in-memory state has been upgraded and schedule a persist so the new version is
 * written to storage, even when no other state change happens in the session.
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
 * Get the version and data from state, treating unversioned state as version 0.
 *
 * @param state - The state to check.
 * @returns The version and data.
 */
function getVersionAndData<State extends Json = Json>(
  state: State | VersionedState<State>,
): VersionedState<State> {
  return isVersionedState(state)
    ? { version: state.version, data: state.data }
    : { version: 0, data: state };
}

/**
 * A single migration step, added to a {@link MigrationChain} via `.add()`.
 *
 * `Input` is bound automatically to the chain's current data type when the step is
 * passed to `.add()`, so `migrate` receives a correctly typed argument with no manual
 * cast.
 */
export type MigrationStep<
  Input extends Json = Json,
  Output extends Json = Json,
> = {
  /**
   * Transform state from the previous step's output to this step's output.
   *
   * Receives the raw inner data (not the versioned envelope). May be sync or async to
   * support complex operations like re-deriving data from secrets.
   *
   * @param data - The state data from the previous step.
   * @returns The migrated data.
   */
  migrate(data: Input): Output | Promise<Output>;
  /**
   * Optional schema validating this step's input before `migrate` is called. Defaults
   * to a generic JSON-shape check when omitted.
   */
  inputSchema?: Struct<Input>;
  /**
   * Optional schema validating this step's output at runtime.
   */
  outputSchema?: Struct<Output>;
};

/**
 * A chain of migration steps for evolving keyring serialized state across versions.
 *
 * Steps are versioned by position: the first `.add()` call produces version 1, the
 * second version 2, and so on. Create one with {@link createMigrations}.
 */
export type MigrationChain<Data extends Json = Json> = {
  /**
   * The number of steps added so far. Since steps are versioned by position starting at
   * 1, this also doubles as "the latest version" (use it in `serialize()`).
   */
  readonly version: number;
  /**
   * Append a step to the chain.
   *
   * Returns a new chain typed to `Output`. It does not mutate the chain it's called on,
   * so branching from a shared base chain is safe.
   *
   * `Input` defaults to the chain's current `Data` type. Providing `inputSchema` lets
   * TypeScript infer a narrower `Input` (bounded to extend `Data`), so `migrate`
   * receives a schema-typed argument when narrowing raw state into a specific shape,
   * typically on a chain's first step, where `Data` is `Json`.
   *
   * @param step - The migration step to append.
   * @returns A new chain whose data type is the step's `Output`.
   */
  add<Input extends Data = Data, Output extends Json = Json>(
    step: MigrationStep<Input, Output>,
  ): MigrationChain<Output>;
  /**
   * Apply all pending steps to `state`.
   *
   * Handles both versioned state (wrapped in `{ version, data }` envelope) and
   * unversioned legacy state (treated as version 0).
   *
   * @param state - The serialized keyring state (from vault or previous serialize).
   * @returns The migrated state wrapped in a versioned envelope, plus a `migrated`
   * flag.
   * @throws If `state`'s version is newer than this chain's latest version, or if a
   * step's `inputSchema`/`outputSchema` validation fails.
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
 * @returns The migrated state wrapped in a versioned envelope, plus a `migrated` flag.
 */
async function applySteps<Data extends Json>(
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
  let data = initialData;

  for (const step of pendingSteps) {
    assert(data, step.inputSchema ?? JsonStruct);
    data = await step.migrate(data);
    assert(data, step.outputSchema ?? JsonStruct);
  }

  return {
    version: latestVersion,
    data,
    migrated: pendingSteps.length > 0,
  } as MigrationResult<Data>;
}

/**
 * Build a {@link MigrationChain} wrapping the given internal steps.
 *
 * @param steps - The steps accumulated so far.
 * @returns A chain exposing `add`, `version`, and `apply`.
 */
function buildChain<Data extends Json>(
  steps: readonly MigrationStep[],
): MigrationChain<Data> {
  return {
    version: steps.length,
    add: <Input extends Data, Output extends Json>(
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
 * const { data } = await migrations.apply(state);
 * ```
 * @returns An empty chain, typed to accept `Json` as its first step's input.
 */
export function createMigrations(): MigrationChain<Json> {
  return buildChain<Json>([]);
}
