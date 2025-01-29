import type { Infer } from '@metamask/superstruct';
import { object, string } from '@metamask/superstruct';

/**
 * An account's address that has been resolved from a signing request.
 */
export const ResolvedAccountAddressStruct = object({
  /**
   * Account main address.
   */
  address: string(),
});

/**
 * Resolve account's address object.
 *
 * See {@link ResolvedAccountAddressStruct}.
 */
export type ResolvedAccountAddress = Infer<typeof ResolvedAccountAddressStruct>;
