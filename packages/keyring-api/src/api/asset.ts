import {
  object,
  selectiveUnion,
  StringNumberStruct,
} from '@metamask/keyring-utils';
import type { Infer } from '@metamask/superstruct';
import { literal, string } from '@metamask/superstruct';
import {
  CaipAssetIdStruct,
  CaipAssetTypeStruct,
  isPlainObject,
} from '@metamask/utils';

/**
 * Fungible asset amount struct.
 */
export const FungibleAssetAmountStruct = object({
  /**
   * Asset unit.
   */
  unit: string(),

  /**
   * Asset amount.
   */
  amount: StringNumberStruct,
});

/**
 * Fungible asset struct.
 */
export const FungibleAssetStruct = object({
  /**
   * It is a fungible asset.
   */
  fungible: literal(true),

  /**
   * Asset type (CAIP-19).
   */
  type: CaipAssetTypeStruct,

  ...FungibleAssetAmountStruct.schema,
});

/**
 * Non-fungible asset struct.
 */
export const NonFungibleAssetStruct = object({
  /**
   * It is a non-fungible asset.
   */
  fungible: literal(false),

  /**
   * Asset ID (CAIP-19).
   */
  id: CaipAssetIdStruct,
});

/**
 * Asset struct. This represents a fungible or non-fungible asset. Fungible
 * assets include an amount and a unit in addition to the asset type. While
 * non-fungible assets include only an asset ID.
 *
 * See {@link NonFungibleAssetStruct} and {@link FungibleAssetStruct}.
 *
 * All assets have a `fungible` property that is used to tag the union and
 * allow the following pattern:
 *
 * ```ts
 * if (asset.fungible) {
 *   // Use asset.type
 * } else {
 *   // Use asset.id
 * }
 * ```
 *
 * @example
 * ```ts
 * {
 *   fungible: true,
 *   type: 'eip155:1/slip44:60',
 *   unit: 'ETH',
 *   amount: '0.01',
 * }
 * ```
 *
 * @example
 * ```ts
 * {
 *   fungible: false,
 *   id: 'eip155:1/erc721:0x06012c8cf97BEaD5deAe237070F9587f8E7A266d/771769',
 * }
 * ```
 */
export const AssetStruct = selectiveUnion((value: any) => {
  return isPlainObject(value) && !value.fungible
    ? NonFungibleAssetStruct
    : FungibleAssetStruct;
});

/**
 * Asset type {@see AssetStruct}.
 */
export type Asset = Infer<typeof AssetStruct>;
