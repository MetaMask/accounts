import {
  Struct,
  assert,
  object as stObject,
  type as stType,
} from '@metamask/superstruct';
import type {
  AnyStruct,
  Context,
  Failure,
  Infer,
  ObjectSchema,
  OmitBy,
  Optionalize,
  PickBy,
  Simplify,
} from '@metamask/superstruct';

import type { Equals } from './types';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const ExactOptionalSymbol: unique symbol;

export type ExactOptionalTag = {
  type: typeof ExactOptionalSymbol;
};

/**
 * Exclude type `Type` from the properties of `Obj`.
 *
 * ```ts
 * type Foo = { a: string | null; b: number };
 * type Bar = ExcludeType<Foo, null>;
 * // Bar = { a: string, b: number }
 * ```
 */
export type ExcludeType<Obj, Type> = {
  [K in keyof Obj]: Exclude<Obj[K], Type>;
};

/**
 * Make optional all properties that have the `ExactOptionalTag` type.
 *
 * ```ts
 * type Foo = { a: string | ExactOptionalTag; b: number};
 * type Bar = ExactOptionalize<Foo>;
 * // Bar = { a?: string; b: number}
 * ```
 */
export type ExactOptionalize<Schema extends object> = OmitBy<
  Schema,
  ExactOptionalTag
> &
  Partial<ExcludeType<PickBy<Schema, ExactOptionalTag>, ExactOptionalTag>>;

/**
 * Infer a type from an superstruct object schema.
 */
export type ObjectType<Schema extends ObjectSchema> = Simplify<
  ExactOptionalize<Optionalize<{ [K in keyof Schema]: Infer<Schema[K]> }>>
>;

export const SENSITIVE_REDACTED = '***';

// Tracks which struct instances were created by `sensitive()`. Using a WeakSet
// avoids mutating the struct object itself and does not prevent garbage
// collection when a struct goes out of scope.
const sensitiveStructs = new WeakSet<AnyStruct>();

/**
 * Return a shallow copy of `sourceObj` with each key in `sensitiveKeys`
 * replaced by the redaction placeholder.
 *
 * @param sourceObj - The source object to copy and redact.
 * @param sensitiveKeys - The property names to redact.
 * @returns A shallow copy with the specified keys replaced.
 */
function redactKeys(
  sourceObj: Record<string, unknown>,
  sensitiveKeys: string[],
): Record<string, unknown> {
  const redacted = { ...sourceObj };
  for (const key of sensitiveKeys) {
    if (key in redacted) {
      redacted[key] = SENSITIVE_REDACTED;
    }
  }
  return redacted;
}

/**
 * Wrap a struct so that every failure it emits has any occurrence of
 * `parentObj` in `failure.branch` replaced with a sanitised copy where
 * `sensitiveKeys` are redacted. This prevents the parent object (which holds
 * secret field values) from leaking through sibling-field failures.
 *
 * The wrapping propagates recursively through `entries` so that failures from
 * deeply nested sibling structs are covered too.
 *
 * How the branch override works: superstruct's internal `toFailure` assembles
 * each `Failure` as `{ value, branch, ...result, message }`. Because the
 * spread of `result` comes *after* the defaults derived from context, returning
 * a failure object that carries a sanitised `branch` property causes it to win
 * over the raw branch that superstruct would otherwise inject from context.
 *
 * @param struct - The struct whose failures should be patched.
 * @param parentObj - The parent-object reference to look for in branch arrays.
 * @param sensitiveKeys - Keys to redact from `parentObj` when it appears.
 * @returns The wrapped struct.
 */
function withRedactedBranch(
  struct: AnyStruct,
  parentObj: unknown,
  sensitiveKeys: string[],
): AnyStruct {
  function* redactBranch(failures: Iterable<Failure>): Iterable<Failure> {
    for (const failure of failures) {
      yield {
        ...failure,
        // Replace the parent object in the branch with a sanitised copy.
        // Reference equality (`===`) is intentional: we only want to touch
        // this specific parent, not an unrelated object at a different depth
        // that might happen to have the same shape.
        branch: failure.branch.map((branchItem) => {
          if (
            branchItem !== parentObj ||
            typeof parentObj !== 'object' ||
            parentObj === null
          ) {
            return branchItem;
          }
          return redactKeys(
            parentObj as Record<string, unknown>,
            sensitiveKeys,
          );
        }),
      };
    }
  }

  // `as unknown as AnyStruct` is necessary because the Struct constructor
  // infers `Type = unknown` when the generics cannot be resolved from the
  // spread of an AnyStruct, producing Struct<unknown, ...> which is not
  // directly assignable to Struct<any, ...> (AnyStruct) without the cast.
  return new Struct({
    ...struct,
    validator(value, context): ReturnType<Struct['validator']> {
      return redactBranch(struct.validator(value, context));
    },
    refiner(value, context): ReturnType<Struct['refiner']> {
      return redactBranch(struct.refiner(value, context));
    },
    // Propagate branch redaction recursively so that failures originating from
    // any depth inside a sibling struct are also sanitised.
    *entries(value: unknown, context: Context): ReturnType<Struct['entries']> {
      for (const entry of struct.entries(value, context)) {
        const [fieldKey, fieldValue, fieldStruct] = entry;
        // Array structs appear only in tuple types and do not carry the same
        // branch structure as object entries — pass them through unchanged.
        if (Array.isArray(fieldStruct)) {
          yield entry;
        } else {
          yield [
            fieldKey,
            fieldValue,
            // `fieldStruct` is typed as Struct<any,unknown>|Struct<never,unknown>
            // by TypeScript's entries tuple inference, which does not match
            // AnyStruct (Struct<any,any>) exactly. The cast is safe because both
            // shapes represent untyped structs and behave identically at runtime.
            withRedactedBranch(
              fieldStruct as AnyStruct,
              parentObj,
              sensitiveKeys,
            ),
          ];
        }
      }
    },
  }) as unknown as AnyStruct;
}

/**
 * Wrap a struct so that any validation failure redacts the actual value from
 * the error message, `StructError.value`, and `StructError.branch`. Use this
 * for fields that hold secrets (private keys, mnemonics, passwords) to prevent
 * sensitive material from leaking into error logs or external services.
 *
 * When composed with the `object()` exported from this module, sibling-field
 * failures will also have the parent object's sensitive keys redacted from
 * their branch. This does **not** apply when using superstruct's own `object()`
 * directly, since that function is unaware of the sensitive marker.
 *
 * ```ts
 * const MyStruct = object({ privateKey: sensitive(string()) });
 * assert({ privateKey: 123 }, MyStruct);
 * // throws: At path: privateKey -- Expected a value of type `string`,
 * //         but received: `[REDACTED]`
 * ```
 *
 * @param struct - The struct to wrap.
 * @returns The wrapped struct with identical validation logic but redacted
 * failures.
 */
export function sensitive<Type, Schema>(
  struct: Struct<Type, Schema>,
): Struct<Type, Schema> {
  function* redact(failures: Iterable<Failure>): Iterable<Failure> {
    for (const failure of failures) {
      yield {
        ...failure,
        value: SENSITIVE_REDACTED,
        message: `Expected a value of type \`${struct.type}\`, but received: \`${SENSITIVE_REDACTED}\``,
        branch: failure.branch.map(() => SENSITIVE_REDACTED),
      };
    }
  }

  // `as unknown as Struct<Type, Schema>` is necessary because the Struct
  // constructor loses the generic Type parameter when the result is stored in
  // a variable (it infers Struct<unknown, Schema> from the spread), so we must
  // reassert the type we know is correct.
  const wrapped = new Struct({
    ...struct,
    validator(value, context): ReturnType<Struct['validator']> {
      return redact(struct.validator(value, context));
    },
    refiner(value, context): ReturnType<Struct['refiner']> {
      return redact(struct.refiner(value as Type, context));
    },
  }) as unknown as Struct<Type, Schema>;

  // Register the wrapped struct so that object() can detect which schema keys
  // are sensitive and patch sibling-field failures accordingly.
  sensitiveStructs.add(wrapped as AnyStruct);
  return wrapped;
}

/**
 * Change the return type of a superstruct's `object` function to support
 * exact optional properties. When the schema contains fields wrapped with
 * `sensitive()`, the returned struct also patches every sibling-field failure
 * so that the parent object in `failure.branch` has the sensitive keys
 * redacted, including failures from deeply nested fields inside siblings.
 *
 * @param schema - The object schema.
 * @returns A struct representing an object with a known set of properties.
 */
export function object<Schema extends ObjectSchema>(
  schema: Schema,
): Struct<ObjectType<Schema>, Schema> {
  // `as unknown as` is required because our ObjectType differs from
  // superstruct's own ObjectType (it supports ExactOptional), and the two
  // types are not directly comparable without an intermediate unknown cast.
  const base = stObject(schema) as unknown as Struct<
    ObjectType<Schema>,
    Schema
  >;

  // `schema[key]` can theoretically be undefined when the compiler has
  // noUncheckedIndexedAccess enabled, even though Object.keys only returns
  // keys that exist in the object. The explicit guard makes this safe.
  const sensitiveKeys = Object.keys(schema).filter((key) => {
    const fieldStruct = schema[key];
    return fieldStruct !== undefined && sensitiveStructs.has(fieldStruct);
  });

  // No sensitive fields — return the base struct directly to avoid the
  // overhead of wrapping every entry.
  if (sensitiveKeys.length === 0) {
    return base;
  }

  // Wrap each entry's struct so that failures from any field carry a sanitised
  // copy of the parent object in their branch rather than the raw one that
  // contains secret values.
  return new Struct({
    ...base,
    *entries(value: unknown, context: Context): ReturnType<Struct['entries']> {
      for (const entry of base.entries(value, context)) {
        const [fieldKey, fieldValue, fieldStruct] = entry;
        if (Array.isArray(fieldStruct)) {
          yield entry;
        } else {
          yield [
            fieldKey,
            fieldValue,
            // Same inference mismatch as in withRedactedBranch — see that
            // function's entries block for the explanation of this cast.
            withRedactedBranch(fieldStruct as AnyStruct, value, sensitiveKeys),
          ];
        }
      }
    },
  }) as unknown as Struct<ObjectType<Schema>, Schema>;
}

/**
 * Change the return type of a superstruct's `type` function to support
 * exact optional properties.
 *
 * @param schema - The object schema.
 * @returns A struct representing an object with a known set of properties
 * and ignore unknown properties.
 */
export function type<Schema extends ObjectSchema>(
  schema: Schema,
): Struct<ObjectType<Schema>, Schema> {
  // See comment in `object()` above for why this cast is necessary.
  return stType(schema) as unknown as Struct<ObjectType<Schema>, Schema>;
}

/**
 * Check if the current property is present in its parent object.
 *
 * @param ctx - The context to check.
 * @returns `true` if the property is present, `false` otherwise.
 */
function hasOptional(ctx: Context): boolean {
  const property: string = ctx.path[ctx.path.length - 1];
  const parent: Record<string, unknown> = ctx.branch[ctx.branch.length - 2];

  return property in parent;
}

/**
 * Augment a struct to allow exact-optional values. Exact-optional values can
 * be omitted but cannot be `undefined`.
 *
 * ```ts
 * const foo = object({ bar: exactOptional(string()) });
 * type Foo = Infer<typeof foo>;
 * // Foo = { bar?: string }
 * ```
 *
 * @param struct - The struct to augment.
 * @returns The augmented struct.
 */
export function exactOptional<Type, Schema>(
  struct: Struct<Type, Schema>,
): Struct<Type | ExactOptionalTag, Schema> {
  return new Struct({
    ...struct,

    validator: (value, ctx) =>
      !hasOptional(ctx) || struct.validator(value, ctx),

    refiner: (value, ctx) =>
      !hasOptional(ctx) || struct.refiner(value as Type, ctx),
  });
}

/**
 * Assert that a value is valid according to a struct.
 *
 * It is similar to superstruct's mask function, but it does not ignore extra
 * properties.
 *
 * @param value - Value to check.
 * @param struct - Struct to validate the value against.
 * @param message - Error message to throw if the value is not valid.
 * @returns The value if it is valid.
 */
export function strictMask<Type, Schema>(
  value: unknown,
  struct: Struct<Type, Schema>,
  message?: string,
): Type {
  assert(value, struct, message);
  return value;
}

/**
 * Extracts the type from a struct definition and asserts that it matches the
 * expected type. If the types do not match, the type `never` is returned.
 *
 * @param StructType - The struct type to infer.
 * @param ExpectedType - The expected type.
 */
export type InferEquals<StructType extends Struct<any, any>, ExpectedType> =
  Equals<Infer<StructType>, ExpectedType> extends true
    ? Infer<StructType>
    : never;

/**
 * Create a custom union struct that uses a `selector` function for choosing
 * the validation path.
 *
 * @param selector - The selector function choosing the struct to validate with.
 * @returns The `superstruct` struct, which validates that the value satisfies
 * one of the structs.
 */
export function selectiveUnion<Selector extends (value: any) => AnyStruct>(
  selector: Selector,
): Struct<Infer<ReturnType<Selector>>, null> {
  return new Struct({
    type: 'union',
    schema: null,

    *entries(value: any, context: any): ReturnType<Struct['entries']> {
      yield* selector(value).entries(value, context);
    },

    *refiner(value, context): ReturnType<Struct['refiner']> {
      yield* selector(value).refiner(value, context);
    },

    coercer(value, context): ReturnType<Struct['coercer']> {
      return selector(value).coercer(value, context);
    },

    validator(value, context): ReturnType<Struct['validator']> {
      // This only validates the root of the struct, entries does the rest of
      // the work.
      return selector(value).validator(value, context);
    },
  });
}
