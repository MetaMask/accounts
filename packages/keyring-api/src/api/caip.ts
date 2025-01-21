import { definePattern } from '@metamask/keyring-utils';
import { type Infer } from '@metamask/superstruct';
import type { CaipAssetId, CaipAssetType } from '@metamask/utils';
import {
  CAIP_ASSET_TYPE_REGEX,
  CAIP_ASSET_ID_REGEX,
  isCaipAssetType,
  isCaipAssetId,
} from '@metamask/utils';

const CAIP_ASSET_TYPE_OR_ID_REGEX =
  /^(?<chainId>(?<namespace>[-a-z0-9]{3,8}):(?<reference>[-_a-zA-Z0-9]{1,32}))\/(?<assetNamespace>[-a-z0-9]{3,8}):(?<assetReference>[-.%a-zA-Z0-9]{1,128})(\/(?<tokenId>[-.%a-zA-Z0-9]{1,78}))?$/u;

/**
 * A CAIP-19 asset type identifier, i.e., a human-readable type of asset identifier.
 */
export const CaipAssetTypeStruct = definePattern<CaipAssetType>(
  'CaipAssetType',
  CAIP_ASSET_TYPE_REGEX,
);
export type { CaipAssetType };
export { isCaipAssetType };

/**
 * A CAIP-19 asset ID identifier, i.e., a human-readable type of asset ID.
 */
export const CaipAssetIdStruct = definePattern<CaipAssetId>(
  'CaipAssetId',
  CAIP_ASSET_ID_REGEX,
);
export type { CaipAssetId };
export { isCaipAssetId };

/**
 * A CAIP-19 asset type or asset ID identifier, i.e., a human-readable type of asset identifier.
 */
export const CaipAssetTypeOrIdStruct = definePattern<
  CaipAssetType | CaipAssetId
>('CaipAssetTypeOrId', CAIP_ASSET_TYPE_OR_ID_REGEX);
export type CaipAssetTypeOrId = Infer<typeof CaipAssetTypeOrIdStruct>;
