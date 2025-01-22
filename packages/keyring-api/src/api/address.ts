import type { Infer } from '@metamask/superstruct';
import { object, string } from '@metamask/superstruct';

/**
 * The resolved address of an account.
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
