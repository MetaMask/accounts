/**
 * Base type for all signers.
 */
export type Signer = {
  /**
   * The scope of the signer, expressed as a CAIP-2 chain ID (e.g.
   * `"bip122:000000000019d6689c085ae165831e93"` for Bitcoin mainnet) or a CAIP-2
   * namespace (e.g. `"bip122"` for all Bitcoin-like chains).
   *
   * @see https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-2.md
   */
  scope: string;
};
