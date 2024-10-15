import type { Infer } from '@metamask/superstruct';
import { nullable, number, string } from '@metamask/superstruct';

import { exactOptional, object } from '../superstruct';

export const PaginationStruct = object({
  /**
   * Maximum number of items to return.
   */
  limit: number(),

  /**
   * Next cursor to iterate over the results.
   */
  next: exactOptional(nullable(string())),
});

export type Pagination = Infer<typeof PaginationStruct>;
