import {
  Struct,
  assert,
  define,
  object as stObject,
} from '@metamask/superstruct';
import type {
  Infer,
  Context,
  ObjectSchema,
  OmitBy,
  Optionalize,
  PickBy,
  Simplify,
  AnyStruct,
} from '@metamask/superstruct';

import type { Equals } from './utils';

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

/**
 * Change the return type of a superstruct object struct to support exact
 * optional properties.
 *
 * @param schema - The object schema.
 * @returns A struct representing an object with a known set of properties.
 */
export function object<Schema extends ObjectSchema>(
  schema: Schema,
): Struct<ObjectType<Schema>, Schema> {
  return stObject(schema) as any;
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
 * Defines a new string-struct matching a regular expression.
 *
 * Example:
 *
 * ```ts
 * const EthAddressStruct = definePattern('EthAddress', /^0x[0-9a-f]{40}$/iu);
 * ```
 *
 * @param name - Type name.
 * @param pattern - Regular expression to match.
 * @returns A new string-struct that matches the given pattern.
 */
export function definePattern(
  name: string,
  pattern: RegExp,
): Struct<string, null> {
  return define<string>(
    name,
    (value: unknown): boolean =>
      typeof value === 'string' && pattern.test(value),
  );
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
export type InferEquals<
  StructType extends Struct<any, any>,
  ExpectedType,
> = Equals<Infer<StructType>, ExpectedType> extends true
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
