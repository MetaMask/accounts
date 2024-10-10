import type { Infer } from '@metamask/superstruct';
import { number, string, union, object } from '@metamask/superstruct';

export const PaginationStruct = union([
  object({
    /**
     * Maximum number of items to return.
     */
    limit: number(),
  }),
  object({
    /**
     * Next cursor to iterate over the results.
     */
    next: string(),
  }),
]);

export type Pagination = Infer<typeof PaginationStruct>;
