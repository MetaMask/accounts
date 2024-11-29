import { object, StringNumberStruct } from '@metamask/keyring-utils';
import type { Infer } from '@metamask/superstruct';
import { string } from '@metamask/superstruct';

export const BalanceStruct = object({
  amount: StringNumberStruct,
  unit: string(),
});

export type Balance = Infer<typeof BalanceStruct>;
