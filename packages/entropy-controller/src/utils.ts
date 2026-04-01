import type { BIP32Node } from '@metamask/key-tree';

import type { Bip32PathNode } from './signer/signer';

/**
 * Converts a derivation path from {@link Bip32PathNode} format (e.g. `"44'"`, `"0"`) to
 * the `@metamask/key-tree` format (e.g. `"bip32:44'"`, `"bip32:0"`).
 *
 * @param path - The derivation path segments to convert.
 * @returns The path segments in key-tree format.
 */
export function toBip32KeyTreePath(
  path: Bip32PathNode[],
): readonly BIP32Node[] {
  return path.map((segment) => `bip32:${segment}` as BIP32Node);
}
