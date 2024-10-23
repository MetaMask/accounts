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
 *   // Use asset.type and asset.unit
 * } else {
 *   // Use asset.id
 * }
 * ```
 *
 * @example
 * ```ts
 * asset: {
 *   fungible: true,
 *   type: 'eip155:1/slip44:60',
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
export const AssetStruct = union([
  object({
    /**
     * It is a fungible asset.
     */
    fungible: literal(true),

    /**
     * Asset type (CAIP-19).
     */
    type: CaipAssetTypeStruct,

    /**
     * Unit of the asset. This has to be one of the supported units for the
     * asset, as defined by MetaMask.
     */
    unit: string(),
  }),
  object({
    /**
     * It is a non-fungible asset.
     */
    fungible: literal(false),

    /**
     * Asset ID (CAIP-19).
     */
    id: CaipAssetIdStruct,
  }),
]);

/**
 * Asset type.
 *
 * See {@link AssetStruct}.
 */
export type Asset = Infer<typeof AssetStruct>;

/**
 * This struct represents an amount of an asset.
 *
 * @example
 * ```ts
 * fee: {
 *   amount: '0.01',
 *   asset: {
 *     fungible: true,
 *     type: 'eip155:1/slip44:60',
 *     unit: 'ETH',
 *   },
 * },
 * ```
 */
export const AssetAmountStruct = object({
  /**
   * Amount in decimal string format.
   */
  amount: StringNumberStruct,

  /**
   * Asset information.
   */
  asset: AssetStruct,
});
