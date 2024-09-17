import type { Struct } from '@metamask/superstruct';
import { assert } from '@metamask/superstruct';
import type { Json } from '@metamask/utils';

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
 * Remove duplicate entries from an array.
 *
 * @param array - Array to remove duplicates from.
 * @returns Array with duplicates removed.
 */
export function unique<Type>(array: Type[] | Iterable<Type>): Type[] {
  return [...new Set(array)];
}

/**
 * Convert a value to a valid JSON object.
 *
 * The function chains JSON.stringify and JSON.parse to ensure that the result
 * is a valid JSON object. In objects, undefined values are removed, and in
 * arrays, they are replaced with null.
 *
 * @param value - Value to convert to JSON.
 * @returns JSON representation of the value.
 */
export function toJson<Type extends Json = Json>(value: any): Type {
  return JSON.parse(JSON.stringify(value)) as Type;
}

/**
 * Asserts that the given value is defined.
 *
 * @param value - Value to check.
 */
export function ensureDefined<Type>(
  value: Type | undefined,
): asserts value is Type {
  if (value === undefined) {
    throw new Error('Argument is undefined');
  }
}

/**
 * Helper function that throws an error.
 *
 * @param message - Error message to throw.
 */
export function throwError(message: string): never {
  throw new Error(message);
}

/**
 * Compares two strings for equality, ignoring case.
 *
 * @param a - The first string to compare.
 * @param b - The second string to compare.
 * @returns `true` if the strings are equal, ignoring case. `false` otherwise.
 */
export function equalsIgnoreCase(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}
