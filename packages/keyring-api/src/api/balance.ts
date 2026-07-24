import { StringNumberStruct } from '@metamask/keyring-utils';
import type { Infer } from '@metamask/superstruct';
import { exactOptional, object, record, string } from '@metamask/superstruct';
import { JsonStruct } from '@metamask/utils';

export const BalanceStruct = object({
  /**
   * Asset amount.
   */
  amount: StringNumberStruct,

  /**
   * Asset unit.
   */
  unit: string(),

  /**
   * Optional arbitrary metadata associated with this balance.
   */
  metadata: exactOptional(record(string(), JsonStruct)),
});

export type Balance = Infer<typeof BalanceStruct>;
