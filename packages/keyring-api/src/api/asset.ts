import { literal } from '@metamask/superstruct';
import { CaipAssetIdStruct, CaipAssetTypeStruct } from '@metamask/utils';

import { object } from '../superstruct';

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
