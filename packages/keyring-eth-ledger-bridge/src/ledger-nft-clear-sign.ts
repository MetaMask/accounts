import { TransactionFactory } from '@ethereumjs/tx';
import { Buffer } from 'buffer';

/**
 * Function selectors that only appear on ERC-721 / ERC-1155 contracts for the
 * purposes of Ledger `@ledgerhq/evm-tools` resolution. Shared selectors such as
 * `approve` (`0x095ea7b3`) and `transferFrom` (`0x23b872dd`) are intentionally
 * excluded because ERC-20 uses the same selectors; forcing NFT resolution for
 * those causes incorrect Ledger prompts (e.g. "manage NFT allowance" on ERC-20
 * approves).
 *
 * @see https://github.com/MetaMask/metamask-extension/pull/39921
 */
const NFT_ONLY_SELECTORS = new Set([
  '0xa22cb465', // setApprovalForAll(address,bool)
  '0x42842e0e', // safeTransferFrom(from,to,tokenId) — ERC-721
  '0xb88d4fde', // safeTransferFrom(from,to,tokenId,data) — ERC-721
  '0xf242432a', // safeTransferFrom — ERC-1155
  '0x2eb2c2d6', // safeBatchTransferFrom — ERC-1155
]);

/**
 * Whether Ledger clear-signing should enable NFT plugin resolution for this raw
 * serialized transaction.
 *
 * @param rawTxHex - RLP-encoded transaction hex, with or without `0x` prefix.
 * @returns True when calldata's 4-byte selector is NFT-only.
 */
export function shouldUseNftLedgerClearSign(rawTxHex: string): boolean {
  const first4BytesHex =
    rawTxHex.startsWith('0x') || rawTxHex.startsWith('0X')
      ? rawTxHex.slice(2)
      : rawTxHex;
  if (first4BytesHex.length === 0) {
    return false;
  }
  try {
    const hexBuffer = Buffer.from(first4BytesHex, 'hex');
    if (hexBuffer.length === 0) {
      return false;
    }
    const tx = TransactionFactory.fromSerializedData(hexBuffer);
    const { data } = tx;
    if (data.length < 4) {
      return false;
    }
    const selector = `0x${Buffer.from(data.subarray(0, 4)).toString('hex')}`;
    return NFT_ONLY_SELECTORS.has(selector.toLowerCase());
  } catch {
    return false;
  }
}
