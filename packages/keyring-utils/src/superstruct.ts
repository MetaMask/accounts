import {
  Struct,
  ExactOptionalStruct,
  assert,
} from '@metamask/superstruct';
import type {
  Infer,
  AnyStruct,
  ObjectSchema,
  ObjectType,
} from '@metamask/superstruct';

import type { Equals } from './types';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function printValue(value: unknown): string {
  return typeof value === 'string' ? JSON.stringify(value) : String(value);
}

/**
 * A variant of superstruct's `type()` that properly supports `exactOptional()`
 * fields. Unlike the upstream `type()`, this wrapper skips validation for
 * `exactOptional` properties that are absent from the value, matching the same
 * behaviour as `object()`.
 *
 * Use this instead of importing `type` from `@metamask/superstruct` when the
 * schema contains `exactOptional()` fields.
 *
 * @param schema - The object schema.
 * @returns A struct representing an object with a known set of properties,
 * ignoring unknown properties.
 */
export function type<Schema extends ObjectSchema>(
  schema: Schema,
): Struct<ObjectType<Schema>, Schema> {
  const keys = Object.keys(schema);
  return new Struct({
    type: 'type',
    schema,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    *entries(value: unknown): any {
      if (isPlainObject(value)) {
        for (const k of keys) {
          const propertySchema = schema[k];
          if (
            ExactOptionalStruct.isExactOptional(propertySchema) &&
            !Object.prototype.hasOwnProperty.call(value, k)
          ) {
            continue;
          }
          yield [k, value[k], schema[k]];
        }
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validator(value: unknown): any {
      return (
        isPlainObject(value) ||
        `Expected an object, but received: ${printValue(value)}`
      );
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    coercer(value: unknown): any {
      return isPlainObject(value) ? Object.assign({}, value) : value;
    },
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
