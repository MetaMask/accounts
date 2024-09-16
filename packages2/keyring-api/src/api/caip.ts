import { is, type Infer } from '@metamask/superstruct';

import { definePattern } from '../superstruct';

const CAIP_ASSET_TYPE_REGEX =
  /^(?<chainId>(?<namespace>[-a-z0-9]{3,8}):(?<reference>[-_a-zA-Z0-9]{1,32}))\/(?<assetNamespace>[-a-z0-9]{3,8}):(?<assetReference>[-.%a-zA-Z0-9]{1,128})$/u;

const CAIP_ASSET_ID_REGEX =
  /^(?<chainId>(?<namespace>[-a-z0-9]{3,8}):(?<reference>[-_a-zA-Z0-9]{1,32}))\/(?<assetNamespace>[-a-z0-9]{3,8}):(?<assetReference>[-.%a-zA-Z0-9]{1,128})\/(?<tokenId>[-.%a-zA-Z0-9]{1,78})$/u;

/**
 * A CAIP-19 asset type identifier, i.e., a human-readable type of asset identifier.
 */
export const CaipAssetTypeStruct = definePattern(
  'CaipAssetType',
  CAIP_ASSET_TYPE_REGEX,
);
export type CaipAssetType = Infer<typeof CaipAssetTypeStruct>;

/**
 * A CAIP-19 asset ID identifier, i.e., a human-readable type of asset ID.
 */
export const CaipAssetIdStruct = definePattern(
  'CaipAssetId',
  CAIP_ASSET_ID_REGEX,
);
export type CaipAssetId = Infer<typeof CaipAssetIdStruct>;

/**
 * Check if the given value is a {@link CaipAssetType}.
 *
 * @param value - The value to check.
 * @returns Whether the value is a {@link CaipAssetType}.
 * @example
 * ```ts
 * isCaipAssetType('eip155:1/slip44:60'); // true
 * isCaipAssetType('cosmos:cosmoshub-3/slip44:118'); // true
 * isCaipAssetType('hedera:mainnet/nft:0.0.55492/12'); // false
 * ```
 */
export function isCaipAssetType(value: unknown): value is CaipAssetType {
  return is(value, CaipAssetTypeStruct);
}

/**
 * Check if the given value is a {@link CaipAssetId}.
 *
 * @param value - The value to check.
 * @returns Whether the value is a {@link CaipAssetId}.
 * @example
 * ```ts
 * isCaipAssetType('eip155:1/slip44:60'); // false
 * isCaipAssetType('cosmos:cosmoshub-3/slip44:118'); // false
 * isCaipAssetType('hedera:mainnet/nft:0.0.55492/12'); // true
 * ```
 */
export function isCaipAssetId(value: unknown): value is CaipAssetId {
  return is(value, CaipAssetIdStruct);
}
