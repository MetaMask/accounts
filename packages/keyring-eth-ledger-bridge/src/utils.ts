import { TransactionFactory } from '@ethereumjs/tx';
import { bytesToHex, hexToBytes } from '@ethereumjs/util';
import { add0x } from '@metamask/utils';

/**
 * Returns the 4-byte selector from raw serialized transaction hex or undefined if not present.
 * Supports legacy RLP and EIP-2718 typed transactions (via `@ethereumjs/tx`).
 *
 * @param rawTxHex - Raw serialized transaction hex (with or without `0x` prefix).
 * @returns The selector (`0x` + 8 hex digits, lowercased) or undefined if parsing fails or no calldata.
 */
export function getTransactionSelector(rawTxHex: string): string | undefined {
  try {
    const prefixedHex = rawTxHex.startsWith('0x') ? rawTxHex : add0x(rawTxHex);
    const tx = TransactionFactory.fromSerializedData(hexToBytes(prefixedHex));
    const dataHex = bytesToHex(tx.data);
    if (dataHex.length >= 10) {
      return dataHex.slice(0, 10).toLowerCase();
    }
  } catch {
    // ignore parse errors
  }
  return undefined;
}
