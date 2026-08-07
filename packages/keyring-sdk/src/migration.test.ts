import { object, number, string, array } from '@metamask/superstruct';
import type { Infer } from '@metamask/superstruct';
import type { Json } from '@metamask/utils';

import { createMigrations, isVersionedState } from './migration';

describe('isVersionedState', () => {
  it('returns true for a flat state with only a version field', () => {
    expect(isVersionedState({ version: 1 })).toBe(true);
  });

  it('returns true for a flat state with version and extra fields', () => {
    expect(isVersionedState({ version: 1, foo: 'bar' })).toBe(true);
  });

  it('returns true when version is 0', () => {
    expect(isVersionedState({ version: 0, accounts: [] })).toBe(true);
  });

  it('returns false for a plain object without version', () => {
    expect(isVersionedState({ foo: 'bar' })).toBe(false);
  });

  it('returns false for an array', () => {
    expect(isVersionedState(['a', 'b'] as unknown as Json)).toBe(false);
  });

  it('returns false for null', () => {
    expect(isVersionedState(null)).toBe(false);
  });

  it('returns false when version is not an integer', () => {
    expect(isVersionedState({ version: '1', foo: {} })).toBe(false);
  });

  it('returns false when version is a float', () => {
    expect(isVersionedState({ version: 1.5, foo: {} })).toBe(false);
  });
});

describe('createMigrations', () => {
  it('starts at version 0 with no steps', () => {
    expect(createMigrations().version).toBe(0);
  });

  it('increments version by 1 for each added step', () => {
    const chain = createMigrations()
      .add({ migrate: (data) => data })
      .add({ migrate: (data) => data })
      .add({ migrate: (data) => data });

    expect(chain.version).toBe(3);
  });

  it('does not mutate the base chain when a step is added', () => {
    const base = createMigrations().add({ migrate: () => ({ count: 1 }) });
    const extended = base.add({
      migrate: (data: { count: number }) => ({ ...data, label: 'x' }),
    });

    expect(base.version).toBe(1);
    expect(extended.version).toBe(2);
  });
});

describe('apply', () => {
  describe('when given unversioned state', () => {
    it('applies all steps to an unversioned object', async () => {
      type UnversionedHdState = { oldField: string; existing: boolean };
      type HdStateV2 = {
        existing: boolean;
        newField: string;
        renamedField: string;
      };

      const migrations = createMigrations()
        .add({
          migrate: (data: UnversionedHdState) => ({
            ...data,
            newField: 'added',
          }),
        })
        .add({
          migrate: (data): HdStateV2 => ({
            existing: data.existing,
            newField: data.newField,
            renamedField: data.oldField,
          }),
        });

      const result = await migrations.apply({
        oldField: 'value',
        existing: true,
      } satisfies UnversionedHdState);

      expect(result).toStrictEqual({
        version: 2,
        state: {
          version: 2,
          existing: true,
          newField: 'added',
          renamedField: 'value',
        } satisfies { version: number } & HdStateV2,
        migrated: true,
      });
    });

    it('wraps in flat versioned state at version 0 when the chain has no steps', async () => {
      const result = await createMigrations().apply({ foo: 'bar' });

      expect(result).toStrictEqual({
        version: 0,
        state: { version: 0, foo: 'bar' },
        migrated: false,
      });
    });

    it('throws when given an array as unversioned state', async () => {
      await expect(
        createMigrations().apply(['a', 'b'] as unknown as Json),
      ).rejects.toThrow('Unversioned state must be a plain object');
    });

    it('throws when given null as unversioned state', async () => {
      await expect(createMigrations().apply(null)).rejects.toThrow(
        'Unversioned state must be a plain object',
      );
    });
  });

  describe('when given versioned state', () => {
    it('skips already-applied steps', async () => {
      type StateV2 = { existing: boolean; v2: boolean };

      const migrateFn = jest.fn((data: { existing: boolean }) => ({
        ...data,
        v2: true,
      }));

      const migrations = createMigrations()
        .add({ migrate: (data: { existing: boolean }) => data })
        .add({ migrate: migrateFn });

      const result = await migrations.apply({
        version: 1,
        existing: true,
      });

      expect(migrateFn).toHaveBeenCalledWith({ existing: true });
      expect(result).toStrictEqual({
        version: 2,
        state: {
          version: 2,
          existing: true,
          v2: true,
        } satisfies { version: number } & StateV2,
        migrated: true,
      });
    });

    it('returns state unchanged when already at the latest version', async () => {
      const migrateFn = jest.fn((data) => data);

      const migrations = createMigrations().add({ migrate: migrateFn });

      const result = await migrations.apply({
        version: 1,
        foo: 'bar',
      });

      expect(migrateFn).not.toHaveBeenCalled();
      expect(result).toStrictEqual({
        version: 1,
        state: { version: 1, foo: 'bar' },
        migrated: false,
      });
    });

    it('applies multiple pending steps in order', async () => {
      type StateV3 = { original: boolean; extra: boolean };

      const order: number[] = [];

      const migrations = createMigrations()
        .add({
          migrate: (data) => {
            order.push(1);
            return data;
          },
        })
        .add({
          migrate: (data) => {
            order.push(2);
            return data;
          },
        })
        .add({
          migrate: (data: { original: boolean }): StateV3 => {
            order.push(3);
            return { ...data, extra: true };
          },
        });

      const result = await migrations.apply({
        version: 1,
        original: true,
      });

      expect(order).toStrictEqual([2, 3]);
      expect(result).toStrictEqual({
        version: 3,
        state: {
          version: 3,
          original: true,
          extra: true,
        } satisfies { version: number } & StateV3,
        migrated: true,
      });
    });

    it('treats explicitly versioned state at version 0 as the start of the chain', async () => {
      type UnversionedHdState = { oldField: string; existing: boolean };
      type HdStateV1 = {
        oldField: string;
        existing: boolean;
        newField: string;
      };

      const migrations = createMigrations().add({
        migrate: (data: UnversionedHdState): HdStateV1 => ({
          ...data,
          newField: 'added',
        }),
      });

      const result = await migrations.apply({
        version: 0,
        oldField: 'value',
        existing: true,
      });

      expect(result).toStrictEqual({
        version: 1,
        state: {
          version: 1,
          oldField: 'value',
          existing: true,
          newField: 'added',
        } satisfies { version: number } & HdStateV1,
        migrated: true,
      });
    });

    it('throws when state version is newer than the chain', async () => {
      const migrations = createMigrations().add({ migrate: (data) => data });

      await expect(migrations.apply({ version: 5 })).rejects.toThrow(
        'State version 5 is newer than the latest migration version 1',
      );
    });

    it('throws when state version is negative', async () => {
      const migrations = createMigrations().add({ migrate: (data) => data });

      await expect(migrations.apply({ version: -1 })).rejects.toThrow(
        'State version -1 is invalid; it cannot be negative',
      );
    });
  });

  describe('when migrate is async', () => {
    it('applies the step successfully', async () => {
      type StateV1 = { foo: string; async: boolean };

      const migrations = createMigrations().add({
        migrate: async (data: { foo: string }): Promise<StateV1> => {
          await new Promise((resolve) => setTimeout(resolve, 1));
          return { ...data, async: true };
        },
      });

      const result = await migrations.apply({ foo: 'bar' });

      expect(result).toStrictEqual({
        version: 1,
        state: { version: 1, foo: 'bar', async: true },
        migrated: true,
      });
    });
  });

  describe('when migrate throws', () => {
    it('propagates the error', async () => {
      const migrations = createMigrations().add({
        migrate: (): never => {
          throw new Error('Migration failed');
        },
      });

      await expect(migrations.apply({})).rejects.toThrow('Migration failed');
    });
  });

  describe('when a step declares an outputSchema', () => {
    it('applies the step when the output matches the outputSchema', async () => {
      const OutputSchema = object({ name: string(), count: number() });

      const migrations = createMigrations().add({
        outputSchema: OutputSchema,
        migrate: () => ({ name: 'test', count: 42 }),
      });

      const result = await migrations.apply({});

      expect(result).toStrictEqual({
        version: 1,
        state: { version: 1, name: 'test', count: 42 },
        migrated: true,
      });
    });

    it('throws when the output does not match the outputSchema', async () => {
      const OutputSchema = object({ name: string(), count: number() });
      type OutputState = Infer<typeof OutputSchema>;

      const migrations = createMigrations().add({
        outputSchema: OutputSchema,
        // @ts-expect-error - intentionally invalid return for test
        migrate: (): OutputState => ({ name: 'test', count: 'not a number' }),
      });

      await expect(migrations.apply({})).rejects.toThrow('Expected a number');
    });

    it('validates each step independently', async () => {
      const V1Schema = object({ items: array(string()) });
      type StateV1 = Infer<typeof V1Schema>;

      const V2Schema = object({ items: array(string()), total: number() });
      type StateV2 = Infer<typeof V2Schema>;

      const migrations = createMigrations()
        .add({
          outputSchema: V1Schema,
          migrate: (): StateV1 => ({ items: ['a', 'b'] }),
        })
        .add({
          outputSchema: V2Schema,
          migrate: (data): StateV2 => ({ ...data, total: data.items.length }),
        });

      const result = await migrations.apply({});

      expect(result).toStrictEqual({
        version: 2,
        state: {
          version: 2,
          items: ['a', 'b'],
          total: 2,
        } satisfies { version: number } & StateV2,
        migrated: true,
      });
    });
  });

  describe('when a step declares an inputSchema', () => {
    it('applies the step when input matches the inputSchema', async () => {
      const V0Schema = object({ oldCount: number() });

      const migrations = createMigrations().add({
        inputSchema: V0Schema,
        migrate: (data) => ({ count: data.oldCount }),
      });

      const result = await migrations.apply({ oldCount: 7 });

      expect(result).toStrictEqual({
        version: 1,
        state: { version: 1, count: 7 },
        migrated: true,
      });
    });

    it('throws before calling migrate when input does not match the inputSchema', async () => {
      const V0Schema = object({ oldCount: number() });
      const migrateFn = jest.fn();

      const migrations = createMigrations().add({
        inputSchema: V0Schema,
        migrate: migrateFn,
      });

      await expect(migrations.apply({ wrongField: 'oops' })).rejects.toThrow(
        'Expected a number',
      );
      expect(migrateFn).not.toHaveBeenCalled();
    });

    it('throws when migrate returns undefined (caught by outputSchema fallback)', async () => {
      const migrateFn = jest.fn(() => undefined);
      const migrations = createMigrations().add({
        migrate: migrateFn as unknown as () => Record<string, never>,
      });

      await expect(migrations.apply({})).rejects.toThrow(
        'Expected an object, but received: undefined',
      );
    });
  });
});
