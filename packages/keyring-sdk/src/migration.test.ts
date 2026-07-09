import type { Json } from '@metamask/utils';

import { createMigrations, isVersionedState } from './migration';

describe('isVersionedState', () => {
  it('returns true for a valid versioned state', () => {
    expect(isVersionedState({ version: 1, data: { foo: 'bar' } })).toBe(true);
  });

  it('returns true when data is an array', () => {
    expect(isVersionedState({ version: 0, data: ['a', 'b'] })).toBe(true);
  });

  it('returns true when data is null', () => {
    expect(isVersionedState({ version: 0, data: null })).toBe(true);
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

  it('returns false when version is not a number', () => {
    expect(isVersionedState({ version: '1', data: {} })).toBe(false);
  });

  it('returns false when data is missing', () => {
    expect(isVersionedState({ version: 1 })).toBe(false);
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

  it('does not mutate the chain a step was added to', () => {
    const base = createMigrations().add({ migrate: () => ({ count: 1 }) });
    const extended = base.add({
      migrate: (data: { count: number }) => ({ ...data, label: 'x' }),
    });

    expect(base.version).toBe(1);
    expect(extended.version).toBe(2);
  });

  it('rejects a step whose migrate assumes the wrong input shape', () => {
    // This test verifies that TypeScript rejects chaining with incompatible types
    // via @ts-expect-error. The assertion below is for the linter only.
    createMigrations()
      .add({ migrate: (): { count: number } => ({ count: 1 }) })
      .add({
        // @ts-expect-error - `data` is `{ count: number }`, not `{ label: string }`
        migrate: (data: { label: string }) => data.label,
      });
    expect(true).toBe(true);
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
        data: {
          existing: true,
          newField: 'added',
          renamedField: 'value',
        } satisfies HdStateV2,
        migrated: true,
      });
    });

    it('applies all steps to an unversioned array', async () => {
      type PrivateKeysV1 = { keys: string[]; format: string };

      const migrations = createMigrations().add({
        migrate: (data: string[]): PrivateKeysV1 => ({
          keys: data,
          format: 'v1',
        }),
      });

      const result = await migrations.apply(
        ['key1', 'key2'] as unknown as Json,
      );

      expect(result).toStrictEqual({
        version: 1,
        data: { keys: ['key1', 'key2'], format: 'v1' } satisfies PrivateKeysV1,
        migrated: true,
      });
    });

    it('wraps in envelope at version 0 when the chain has no steps', async () => {
      const result = await createMigrations().apply({ foo: 'bar' });

      expect(result).toStrictEqual({
        version: 0,
        data: { foo: 'bar' },
        migrated: false,
      });
    });

    it('wraps array state in envelope at version 0 when the chain has no steps', async () => {
      const result = await createMigrations().apply(
        ['a', 'b'] as unknown as Json,
      );

      expect(result).toStrictEqual({
        version: 0,
        data: ['a', 'b'],
        migrated: false,
      });
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
        data: { existing: true },
      });

      expect(migrateFn).toHaveBeenCalledWith({ existing: true });
      expect(result).toStrictEqual({
        version: 2,
        data: { existing: true, v2: true } satisfies StateV2,
        migrated: true,
      });
    });

    it('returns state unchanged when already at the latest version', async () => {
      const migrateFn = jest.fn((data) => data);

      const migrations = createMigrations().add({ migrate: migrateFn });

      const result = await migrations.apply({
        version: 1,
        data: { foo: 'bar' },
      });

      expect(migrateFn).not.toHaveBeenCalled();
      expect(result).toStrictEqual({
        version: 1,
        data: { foo: 'bar' },
        migrated: false,
      });
    });

    it('applies multiple pending steps in order', async () => {
      type StateV3 = { original: boolean; migrated: boolean };

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
            return { ...data, migrated: true };
          },
        });

      const result = await migrations.apply({
        version: 1,
        data: { original: true },
      });

      expect(order).toStrictEqual([2, 3]);
      expect(result).toStrictEqual({
        version: 3,
        data: { original: true, migrated: true } satisfies StateV3,
        migrated: true,
      });
    });

    it('treats explicitly versioned state at version 0 as unversioned', async () => {
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
        data: { oldField: 'value', existing: true },
      });

      expect(result).toStrictEqual({
        version: 1,
        data: {
          oldField: 'value',
          existing: true,
          newField: 'added',
        } satisfies HdStateV1,
        migrated: true,
      });
    });

    it('throws when state version is newer than the chain', async () => {
      const migrations = createMigrations().add({ migrate: (data) => data });

      await expect(
        migrations.apply({ version: 5, data: {} }),
      ).rejects.toThrow(
        'State version 5 is newer than the latest migration version 1',
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
        data: { foo: 'bar', async: true } satisfies StateV1,
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
});
