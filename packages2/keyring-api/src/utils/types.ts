import { define, type Infer } from '@metamask/superstruct';

import { definePattern } from '../superstruct';

/**
 * UUIDv4 struct.
 */
export const UuidStruct = definePattern(
  'UuidV4',
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu,
);

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
  } catch (_) {
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
