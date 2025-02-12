import type { Infer } from '@metamask/superstruct';
import { object } from '@metamask/superstruct';
import { CaipAccountIdStruct } from '@metamask/utils';

/**
 * An account's address that has been resolved from a signing request.
 */
export const ResolvedAccountAddressStruct = object({
  /**
   * Account main address (CAIP-10 account ID).
   */
  address: CaipAccountIdStruct,
});

/**
 * Resolve account's address object.
 *
 * See {@link ResolvedAccountAddressStruct}.
 */
export type ResolvedAccountAddress = Infer<typeof ResolvedAccountAddressStruct>;
