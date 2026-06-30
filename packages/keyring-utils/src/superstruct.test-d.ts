import type { Infer } from '@metamask/superstruct';
import { boolean, exactOptional, number, object, string } from '@metamask/superstruct';
import { expectAssignable, expectNotAssignable } from 'tsd';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const exactOptionalObject = object({
  a: number(),
  b: exactOptional(string()),
  c: exactOptional(boolean()),
});

type ExactOptionalObject = Infer<typeof exactOptionalObject>;

expectAssignable<ExactOptionalObject>({ a: 0 });
expectAssignable<ExactOptionalObject>({ a: 0, b: 'test' });
expectAssignable<ExactOptionalObject>({ a: 0, b: 'test', c: true });
expectNotAssignable<ExactOptionalObject>({ a: 0, b: undefined });
expectNotAssignable<ExactOptionalObject>({ a: 0, b: 'test', c: 0 });
expectNotAssignable<ExactOptionalObject>({ a: 0, b: 'test', c: undefined });
