import type { Infer } from '@metamask/superstruct';
import { array, literal, object } from '@metamask/superstruct';

import { CaipChainIdStruct } from './caip';
import { DerivationPathStruct } from './derivation';

/**
 * Account type tag.
 *
 * The main use of this enum is to tag the {@link DiscoveredAccount} type for
 * future use.
 */
export enum DiscoveredAccountType {
  // BIP-44 compatible accounts.
  Bip44 = 'bip44',
}

/**
 * This struct represents a discovered BIP-44 compatible account.
 *
 * It supports BIP-44 in a non-strict way. The derivation path MUST HAVE at
 * least 1 segment.
 */
export const DiscoveredBip44AccountStruct = object({
  /**
   * Account type.
   */
  type: literal(`${DiscoveredAccountType.Bip44}`),

  /**
   * Account supported scopes (CAIP-2 chain IDs).
   */
  scopes: array(CaipChainIdStruct),

  /**
   * The derivation path for this account. It MUST HAVE at least 1 segment.
   */
  derivationPath: DerivationPathStruct,
});

/**
 * Discovered BIP-44 account object.
 *
 * See {@link TransactionStruct}.
 */
export type DiscoveredBip44Account = Infer<typeof DiscoveredBip44AccountStruct>;

// Could become a union if we have new discovered account type.
export const DiscoveredAccountStruct = DiscoveredBip44AccountStruct;

/**
 * Discovered account object.
 *
 * See {@link DiscoveredAccountStruct}.
 */
export type DiscoveredAccount = Infer<typeof DiscoveredAccountStruct>;
