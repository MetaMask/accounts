import type { Infer } from '@metamask/superstruct';
import {
  array,
  exactOptional,
  literal,
  nonempty,
  object,
  string,
} from '@metamask/superstruct';

import { KeyringAccountTypeStruct } from '../../../api/account';
import { CaipChainIdStruct } from '../../../api/caip';

/**
 * Struct for {@link CreateAccountAddressImportOptions}.
 */
export const CreateAccountAddressImportOptionsStruct = object({
  /**
   * The type of the options.
   */
  type: literal('address:import'),
  /**
   * The address to be imported.
   */
  address: string(),
  /**
   * The account type of the imported account.
   *
   * This is needed because the account type cannot always be detected from
   * the address alone (e.g., an EVM address may be an EOA or an ERC-4337
   * account). When omitted, the keyring decides the account type, typically
   * defaulting to the chain's standard account type.
   */
  accountType: exactOptional(KeyringAccountTypeStruct),
  /**
   * The scopes (CAIP-2 chain IDs) of the imported account.
   *
   * This is needed because the scope cannot always be detected from the
   * address alone (e.g., an EVM address is valid on every EVM chain, and
   * Solana or TRON addresses do not encode a network). When omitted, the
   * keyring decides the scopes: it infers them from the address where
   * possible, and falls back to its own default policy otherwise.
   */
  scopes: exactOptional(nonempty(array(CaipChainIdStruct))),
});

/**
 * Options for importing a watch-only account from an address.
 */
export type CreateAccountAddressImportOptions = Infer<
  typeof CreateAccountAddressImportOptionsStruct
>;
