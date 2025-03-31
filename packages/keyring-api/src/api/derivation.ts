import type { Infer } from '@metamask/superstruct';
import { definePattern } from '@metamask/utils';

export const DerivationPathStruct = definePattern<`m/${string}`>(
  'DerivationPath',
  /^m(?:\/\d+'?)+$/u,
);

export type DerivationPath = Infer<typeof DerivationPathStruct>;
