import { exactOptional, object } from '@metamask/keyring-utils';
import type { Infer } from '@metamask/superstruct';
import { nullable, number, string } from '@metamask/superstruct';

/**
 * Pagination struct. This struct is used to specify the limit of items to
 * return and the next cursor to iterate over the results.
 *
 * @example
 * ```ts
 * {
 *   limit: 10,
 *   next: 'c3y1Q6QtqtstbxKX+oqVdEW6',
 * }
 * ```
 */
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

/**
 * Pagination object.
 *
 * See {@link PaginationStruct}.
 */
export type Pagination = Infer<typeof PaginationStruct>;

/**
 * Page of results. It includes the data and the next cursor to iterate over
 * the results.
 *
 * @example
 * ```ts
 * {
 *   data: [
 *     {
 *       // Item object
 *     }
 *   ],
 *   next: 'c3y1Q6QtqtstbxKX+oqVdEW6',
 * }
 * ```
 */
export type Paginated<Type> = {
  /**
   * The list of items for this page.
   */
  data: Type[];

  /**
   * Next cursor to iterate over the results if any, will be `null` otherwise.
   */
  next: string | null;
};
