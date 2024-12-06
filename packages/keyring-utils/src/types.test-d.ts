import { expectAssignable } from 'tsd';

import type { Equals } from './types';

expectAssignable<Equals<true, true>>(true);
expectAssignable<Equals<true, false>>(false);
expectAssignable<Equals<null, null>>(true);
expectAssignable<Equals<undefined, undefined>>(true);
expectAssignable<Equals<undefined, null>>(false);
expectAssignable<Equals<{ a: string }, { a: string }>>(true);
expectAssignable<Equals<{ a: string }, { a: number }>>(false);
expectAssignable<Equals<{ a: string }, { b: string }>>(false);
expectAssignable<Equals<{ a: string }, { a: string; b: string }>>(false);

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
expectAssignable<Equals<{}, { a: string }>>(false);

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
expectAssignable<Equals<{}, {}>>(true);
