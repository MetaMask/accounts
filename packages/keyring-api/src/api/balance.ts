import type { Infer } from '@metamask/superstruct';
import { string } from '@metamask/superstruct';

import { object, StringNumberStruct } from '@metamask/keyring-utils';

export const BalanceStruct = object({
  amount: StringNumberStruct,
  unit: string(),
});

export type Balance = Infer<typeof BalanceStruct>;
