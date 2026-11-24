import type { Infer, Struct } from '@metamask/superstruct';
import { definePattern } from '@metamask/utils';

export const DerivationPathStruct: Struct<`m/${string}`, null> =
  definePattern<`m/${string}`>('DerivationPath', /^m(?:\/\d+'?)+$/u);

export type DerivationPath = Infer<typeof DerivationPathStruct>;
