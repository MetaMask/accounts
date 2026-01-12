import { object, StringNumberStruct } from '@metamask/keyring-utils';
import type { Infer } from '@metamask/superstruct';
import { string } from '@metamask/superstruct';

export const BalanceStruct = object({
  /**
   * The human-readable balance amount with decimals applied (e.g., "1.5" for 1.5 SOL).
   * This is kept for backward compatibility with existing consumers.
   */
  amount: StringNumberStruct,
  /**
   * The token/asset symbol or unit (e.g., "SOL", "TRX").
   */
  unit: string(),
  /**
   * The raw blockchain balance without decimals applied (e.g., "1500000000" for 1.5 SOL).
   * This provides precision for calculations using BigInt/BigNumber.
   */
  rawAmount: string(),
});

export type Balance = Infer<typeof BalanceStruct>;
