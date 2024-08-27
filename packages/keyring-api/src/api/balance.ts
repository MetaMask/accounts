import type { Infer } from '@metamask/superstruct';
import { string } from '@metamask/superstruct';

import { object } from '../superstruct';
import { StringNumberStruct } from '../utils';

export const BalanceStruct = object({
  amount: StringNumberStruct,
  unit: string(),
});

export type Balance = Infer<typeof BalanceStruct>;
