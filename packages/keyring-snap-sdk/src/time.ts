/**
 * Convert a date to its UNIX timestamp equivalent.
 *
 * @param date - The date object to convert.
 * @returns A UNIX timestamp.
 */
export function toUnixTimestamp(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

/**
 * Get the current UNIX timestamp.
 *
 * @returns The current UNIX timestamp.
 */
export function getCurrentUnixTimestamp(): number {
  return toUnixTimestamp(new Date());
}
