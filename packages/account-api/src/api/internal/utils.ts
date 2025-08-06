/**
 * Checks that both arrays are empty, and thus, identical.
 *
 * @param a - First array.
 * @param b - Second array.
 * @returns True if both arrays are empty, false otherwise.
 */
export function areBothEmpty<Value>(a: Value[], b: Value[]): boolean {
  return a.length === 0 && b.length === 0;
}
