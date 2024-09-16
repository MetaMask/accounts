import type { Extends } from './typing';
import { expectTrue } from './typing';

expectTrue<true>();

// @ts-expect-error [test] Type `false` doesn't extend `true`.
expectTrue<false>();

expectTrue<Extends<{ a: string; b: string }, { a: string }>>();

// @ts-expect-error [test] The first type doesn't extend the second type.
expectTrue<Extends<{ a: string }, { a: string; b: string }>>();
