import { definePattern } from '@metamask/keyring-utils';
import type { CaipAssetId, CaipAssetType } from '@metamask/utils';
import {
  isCaipAssetType,
  isCaipAssetId,
  CAIP_ASSET_ID_REGEX,
  CAIP_ASSET_TYPE_REGEX,
} from '@metamask/utils';

/**
 * A CAIP-19 asset type identifier, i.e., a human-readable type of asset identifier.
 */
export const CaipAssetTypeStruct = definePattern<CaipAssetType>(
  'CaipAssetType',
  CAIP_ASSET_TYPE_REGEX,
);

/**
 * A CAIP-19 asset ID identifier, i.e., a human-readable type of asset ID.
 */
export const CaipAssetIdStruct = definePattern<CaipAssetId>(
  'CaipAssetId',
  CAIP_ASSET_ID_REGEX,
);

export type { CaipAssetId, CaipAssetType };
export { isCaipAssetId, isCaipAssetType };
