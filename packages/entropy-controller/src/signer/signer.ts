import type { CaipChainId } from '@metamask/keyring-api';

/**
 * A single node in a BIP-32 derivation path, either normal or hardened (with `'`).
 */
export type Bip32PathNode = `${number}` | `${number}'`;

/**
 * Base type for all signers.
 */
export type Signer = {
  /**
   * The scope of the signer, expressed as a CAIP-2 chain ID (e.g. `"eip155:1"` for
   * Ethereum mainnet).
   *
   * @see https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-2.md
   */
  scope: CaipChainId;
};
