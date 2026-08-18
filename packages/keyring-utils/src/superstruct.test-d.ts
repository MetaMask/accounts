import type { Infer } from '@metamask/superstruct';
import {
  object,
  exactOptional,
  boolean,
  number,
  optional,
  string,
} from '@metamask/superstruct';
import { expectAssignable, expectNotAssignable } from 'tsd';

// NOTE: Kept this test as non-regression tests after the migration from ours `exactOptional`
// implementation to the one from `@metamask/superstruct` package. The tests are not
// exhaustive, but they cover the most common use cases.

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const exactOptionalObject = object({
  a: number(),
  b: optional(string()),
  c: exactOptional(boolean()),
});

type ExactOptionalObject = Infer<typeof exactOptionalObject>;

expectAssignable<ExactOptionalObject>({ a: 0 });
expectAssignable<ExactOptionalObject>({ a: 0, b: 'test' });
expectAssignable<ExactOptionalObject>({ a: 0, b: 'test', c: true });
expectAssignable<ExactOptionalObject>({ a: 0, b: undefined });
expectNotAssignable<ExactOptionalObject>({ a: 0, b: 'test', c: 0 });
expectNotAssignable<ExactOptionalObject>({ a: 0, b: 'test', c: undefined });
