import { Struct, assert } from '@metamask/superstruct';
import type { Infer, AnyStruct } from '@metamask/superstruct';

import type { Equals } from './types';

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
