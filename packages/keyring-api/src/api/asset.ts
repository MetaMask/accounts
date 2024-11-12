import type { Infer } from '@metamask/superstruct';
import { literal, string, union } from '@metamask/superstruct';
import { CaipAssetIdStruct, CaipAssetTypeStruct } from '@metamask/utils';

import { object } from '../superstruct';
import { StringNumberStruct } from '../utils';

/**
 * This struct represents an asset. The `fungible` property is used to tag the
 * union type and allow the following pattern:
 *
 * ```ts
 * if (asset.fungible) {
 *   // Use asset.type
 * } else {
 *   // Use asset.id
 * }
 * ```
 * /**
 * Fungible asset struct.
 */
export const FunginleAssetStruct = object({
  /**
   * It is a fungible asset.
   */
  fungible: literal(true),

  /**
   * Asset type (CAIP-19).
   */
  type: CaipAssetTypeStruct,
});

/**
 * Non-fungible asset struct.
 */
export const NonFunginleAssetStruct = object({
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
 * This struct represents an asset, including the amount and unit if the asset
 * is fungible.
 *
 * The `fungible` property of the `asset` field is used to tag the union type
 * and allow the following pattern:
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
 * fee: {
 *   asset: {
 *     fungible: true,
 *     type: 'eip155:1/slip44:60',
 *   },
 *   amount: '0.01',
 *   unit: 'ETH',
 * },
 * ```
 *
 * @example
 * ```ts
 * asset: {
 *   fungible: false,
 *   id: 'hedera:mainnet/nft:0.0.55492/12',
 * },
 * ```
 */
export const AssetAmountStruct = union([
  object({
    asset: FunginleAssetStruct,

    /**
     * Amount of the asset.
     */
    amount: StringNumberStruct,

    /**
     * Asset unit.
     */
    unit: string(),
  }),
  object({
    asset: NonFunginleAssetStruct,
  }),
]);
