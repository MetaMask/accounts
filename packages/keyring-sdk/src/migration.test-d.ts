import { object, number, string } from '@metamask/superstruct';
import type { Json } from '@metamask/utils';
import { expectType } from 'tsd';

import { createMigrations } from './migration';
import type { MigrationChain, MigrationResult } from './migration';

// `createMigrations()` starts an empty chain typed to accept `Json`.
expectType<MigrationChain<Json>>(createMigrations());

// A step's `migrate` receives the previous step's output shape, with no cast needed.
createMigrations()
  .add({ migrate: (): { count: number } => ({ count: 1 }) })
  .add({
    migrate: (data) => {
      expectType<number>(data.count);
      return data;
    },
  });

// A step's `migrate` must accept the previous step's output shape.
createMigrations()
  .add({ migrate: (): { count: number } => ({ count: 1 }) })
  // @ts-expect-error [test] `data` is `{ count: number }`, not `{ label: string }`.
  .add({ migrate: (data: { label: string }) => data.label });

// A step's inferred `migrate` parameter is the previous step's output shape, not `Json`.
createMigrations()
  .add({ migrate: (): { count: number } => ({ count: 1 }) })
  .add({
    migrate: (data) => {
      expectType<{ count: number }>(data);
      return data;
    },
  });

// `inputSchema` narrows `migrate`'s input to the schema's inferred type, with no cast
// needed.
createMigrations().add({
  inputSchema: object({ oldCount: number() }),
  migrate: (data) => {
    expectType<number>(data.oldCount);
    return { count: data.oldCount };
  },
});

// `inputSchema` must be compatible with the chain's current data type, just like
// `migrate`.
createMigrations()
  .add({ migrate: (): { count: number } => ({ count: 1 }) })
  .add({
    // @ts-expect-error [test] `inputSchema`'s inferred type doesn't extend `{ count: number }`.
    inputSchema: object({ label: string() }),
    migrate: () => 'x',
  });

// `apply()` resolves to the final step's output type.
const migrationsForApply = createMigrations().add({
  migrate: (): { count: number } => ({ count: 1 }),
});
expectType<Promise<MigrationResult<{ count: number }>>>(
  migrationsForApply.apply({}),
);
