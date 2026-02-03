import {
  literal,
  number,
  object,
  string,
  type Infer,
} from '@metamask/superstruct';

import { DerivationPathStruct } from '../../derivation';

/**
 * Struct for {@link CreateAccountBip44DerivePathOptions}.
 */
export const CreateAccountBip44DerivePathOptionsStruct = object({
  /**
   * Type of the options.
   */
  type: literal('bip44:derive-path'),
  /**
   * ID of the entropy source to be used to derive the account.
   */
  entropySource: string(),
  /**
   * BIP-44 derivation path to be used to derive the account.
   */
  derivationPath: DerivationPathStruct,
});

/**
 * Options for creating an account using the given BIP-44 derivation path.
 */
export type CreateAccountBip44DerivePathOptions = Infer<
  typeof CreateAccountBip44DerivePathOptionsStruct
>;

/**
 * Struct for {@link CreateAccountBip44DeriveIndexOptions}.
 */
export const CreateAccountBip44DeriveIndexOptionsStruct = object({
  /**
   * The type of the options.
   */
  type: literal('bip44:derive-index'),
  /**
   * ID of the entropy source to be used to derive the account.
   */
  entropySource: string(),
  /**
   * The index of the account group to be derived.
   */
  groupIndex: number(),
});

/**
 * Options for creating an account using the given BIP-44 account group index.
 *
 * Note that the keyring can support non-standard BIP-44 paths for
 * compatibility with other wallets.
 */
export type CreateAccountBip44DeriveIndexOptions = Infer<
  typeof CreateAccountBip44DeriveIndexOptionsStruct
>;

/**
 * Struct for {@link CreateAccountBip44DiscoverOptions}.
 */
export const CreateAccountBip44DiscoverOptionsStruct = object({
  /**
   * The type of the options.
   */
  type: literal('bip44:discover'),
  /**
   * ID of the entropy source to be used to derive the account.
   */
  entropySource: string(),
  /**
   * The index of the account group to be derived.
   */
  groupIndex: number(),
});

/**
 * Options for creating accounts by performing a BIP-44 account discovery.
 *
 * Note that the keyring can support non-standard BIP-44 paths for
 * compatibility with other wallets.
 */
export type CreateAccountBip44DiscoverOptions = Infer<
  typeof CreateAccountBip44DiscoverOptionsStruct
>;

/**
 * Struct for {@link CreateAccountBip44DeriveIndexRangeOptions}.
 */
export const CreateAccountBip44DeriveIndexRangeOptionsStruct = object({
  /**
   * The type of the options.
   */
  type: literal('bip44:derive-index-range'),
  /**
   * ID of the entropy source to be used to derive the accounts.
   */
  entropySource: string(),
  /**
   * The range of account group indices to derive (inclusive on both ends).
   */
  range: object({
    /**
     * The starting index of the account group range (inclusive).
     */
    from: number(),
    /**
     * The ending index of the account group range (inclusive).
     */
    to: number(),
  }),
});

/**
 * Options for creating accounts by deriving a range of BIP-44 account indices.
 *
 * The range is inclusive on both ends, meaning range.from=0 and range.to=5
 * will create accounts for group indices 0, 1, 2, 3, 4, and 5.
 *
 * Note that the keyring can support non-standard BIP-44 paths for
 * compatibility with other wallets.
 */
export type CreateAccountBip44DeriveIndexRangeOptions = Infer<
  typeof CreateAccountBip44DeriveIndexRangeOptionsStruct
>;
