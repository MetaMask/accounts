/**
 * Extract a human-readable message from an unknown error value.
 *
 * This is useful for handling `Promise.allSettled` rejections or other
 * `unknown` error values, where the value may or may not be an `Error`
 * instance.
 *
 * @param error - The error value to extract a message from.
 * @returns The error message string.
 */
export function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
