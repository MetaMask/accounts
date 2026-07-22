import { StringNumberStruct } from '@metamask/keyring-utils';
import type { Infer } from '@metamask/superstruct';
import { exactOptional, object, record, string } from '@metamask/superstruct';
import { JsonStruct } from '@metamask/utils';

export const BalanceStruct = object({
  amount: StringNumberStruct,
  unit: string(),
  metadata: exactOptional(record(string(), JsonStruct)),
});

export type Balance = Infer<typeof BalanceStruct>;
