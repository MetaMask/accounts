import { define, type Infer } from '@metamask/superstruct';
import { definePattern } from '@metamask/utils';

/**
 * UUIDv4 struct.
 */
export const UuidStruct =
  definePattern<`${string}-${string}-${string}-${string}-${string}`>(
    'UuidV4',
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu,
  );
/**
 * Account ID (UUIDv4).
 */
export const AccountIdStruct = UuidStruct; // Alias for better naming purposes.

/**
 * Validates if a given value is a valid URL.
 *
 * @param value - The value to be validated.
 * @returns A boolean indicating if the value is a valid URL.
 */
export const UrlStruct = define<string>('Url', (value: unknown) => {
  try {
    const url = new URL(value as string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
});

/**
 * A string which contains a positive float number.
 */
export const StringNumberStruct = definePattern(
  'StringNumber',
  /^\d+(\.\d+)?$/u,
);
export type StringNumber = Infer<typeof StringNumberStruct>;

/**
 * This is a helper type used by the {@link Equals} type.
 */
type EqualsHelper<Type> = <Dummy>() => Dummy extends Type ? 1 : 2;

/**
 * A utility type that checks whether two types are exactly the same.
 *
 * This type evaluates to `true` if `TypeA` and `TypeB` are identical,
 * otherwise it evaluates to `false`.
 *
 * @template TypeA - The first type to compare.
 * @template TypeB - The second type to compare.
 *
 * @example
 * ```ts
 * // Example usage:
 * type Test1 = Equals<number, number>; // true
 * type Test2 = Equals<number, string>; // false
 * type Test3 = Equals<{ a: string }, { a: string }>; // true
 * type Test4 = Equals<{ a: string }, { a: number }>; // false
 * ```
 */
export type Equals<TypeA, TypeB> =
  EqualsHelper<TypeA> extends EqualsHelper<TypeB> ? true : false;
