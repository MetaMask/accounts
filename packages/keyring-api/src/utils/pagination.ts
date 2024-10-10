import type { Infer } from '@metamask/superstruct';
import { number, string } from '@metamask/superstruct';
import { exactOptional, object } from '@metamask/utils';

export const PaginationStruct = object({
  /**
   * Maximum number of items to return.
   */
  limit: number(),

  /**
   * Next cursor to iterate over the results.
   */
  next: exactOptional(string()),
});

export type Pagination = Infer<typeof PaginationStruct>;
