/**
 * Omit keys from a union type.
 *
 * The normal `Omit` type does not distribute over unions. So we use this
 * workaround that applies `Omit` to each member of the union.
 *
 * See: <https://github.com/microsoft/TypeScript/issues/31501#issuecomment-1280579305>
 */
export type OmitUnion<Type, Key extends keyof any> = Type extends any
  ? Omit<Type, Key>
  : never;

/**
 * Type that resolves to `true` if `Child` extends `Base`, otherwise `false`.
 *
 * @example
 * ```ts
 * type A = Extends<{a: string, b: string}, {a: string}>; // true
 * type B = Extends<{a: string}, {a: string, b: string}>; // false
 * ```
 */
export type Extends<Child, Base> = Child extends Base ? true : false;

/**
 * Assert that a type extends `true`. It can be used, for example, to assert
 * that a given type extends another type.
 *
 * @example
 * ```ts
 * expectTrue<Extends<{a: string, b: string}, {a: string}>>(); // Ok
 * expectTrue<Extends<{a: string}, {a: string, b: string}>>(); // Error
 * ```
 *
 * This function follows the naming pattern used on `tsd`.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function expectTrue<Type extends true>(): void {
  // Intentionally empty
}
