import type { Infer } from '@metamask/superstruct';
import { object, number, string, array } from '@metamask/superstruct';
import type { Json } from '@metamask/utils';

import type { KeyringMigration } from './migrations';
import {
  applyMigrations,
  defineMigration,
  defineMigrations,
  getLatestVersion,
  isVersionedState,
} from './migrations';

// -- State types used across tests -----------------------------------------------

type UnversionedHdState = {
  oldField: string;
  existing: boolean;
};

type HdStateV1 = {
  oldField: string;
  existing: boolean;
  newField: string;
};

type HdStateV2 = {
  existing: boolean;
  newField: string;
  renamedField: string;
};

type PrivateKeysV1 = {
  keys: string[];
  format: string;
};

// --------------------------------------------------------------------------------

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

describe('getLatestVersion', () => {
  it('returns 0 for empty migrations', () => {
    expect(getLatestVersion([])).toBe(0);
  });

  it('returns the last migration version', () => {
    const migrations: KeyringMigration[] = [
      { version: 1, migrate: (state) => state },
      { version: 2, migrate: (state) => state },
      { version: 3, migrate: (state) => state },
    ];
    expect(getLatestVersion(migrations)).toBe(3);
  });

  it('returns the version for a single migration', () => {
    const migrations: KeyringMigration[] = [
      { version: 1, migrate: (state) => state },
    ];
    expect(getLatestVersion(migrations)).toBe(1);
  });
});

describe('defineMigration', () => {
  it('binds migrate and schema to the same output type', () => {
    const V1Schema = object({ count: number() });
    type StateV1 = Infer<typeof V1Schema>;

    const migration = defineMigration<StateV1>({
      version: 1,
      schema: V1Schema,
      migrate: (): StateV1 => ({ count: 42 }),
    });

    expect(migration.version).toBe(1);
    expect(migration.validate).toBeDefined();
  });

  it('works without schema', () => {
    const migration = defineMigration({
      version: 1,
      migrate: () => ({ count: 42 }),
    });

    expect(migration.version).toBe(1);
    expect(migration.validate).toBeUndefined();
  });

  describe('inputSchema', () => {
    it('passes when input matches inputSchema', async () => {
      const V0Schema = object({ oldCount: number() });
      type StateV0 = Infer<typeof V0Schema>;
      type StateV1 = { count: number };

      const migration = defineMigration<StateV1, StateV0>({
        version: 1,
        inputSchema: V0Schema,
        migrate: (state) => ({ count: state.oldCount }),
      });

      const result = await applyMigrations({ oldCount: 7 }, [migration]);

      expect(result).toStrictEqual({
        version: 1,
        data: { count: 7 },
        migrated: true,
      });
    });

    it('throws before calling migrate when input does not match inputSchema', async () => {
      const V0Schema = object({ oldCount: number() });
      type StateV0 = Infer<typeof V0Schema>;
      type StateV1 = { count: number };

      const migrateFn = jest.fn();
      const migration = defineMigration<StateV1, StateV0>({
        version: 1,
        inputSchema: V0Schema,
        migrate: migrateFn,
      });

      await expect(
        applyMigrations({ wrongField: 'oops' }, [migration]),
      ).rejects.toThrow('Expected a number');

      expect(migrateFn).not.toHaveBeenCalled();
    });
  });
});

describe('applyMigrations', () => {
  describe('with unversioned state', () => {
    it('applies all migrations to an unversioned object', async () => {
      const migrations = [
        defineMigration<HdStateV1>({
          version: 1,
          migrate: (state) => {
            const prev = state as UnversionedHdState;
            return { ...prev, newField: 'added' };
          },
        }),
        defineMigration<HdStateV2>({
          version: 2,
          migrate: (state) => {
            const prev = state as HdStateV1;
            return {
              existing: prev.existing,
              newField: prev.newField,
              renamedField: prev.oldField,
            };
          },
        }),
      ];

      const result = await applyMigrations(
        { oldField: 'value', existing: true } satisfies UnversionedHdState,
        migrations,
      );

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

    it('applies all migrations to an unversioned array', async () => {
      const migrations = [
        defineMigration<PrivateKeysV1>({
          version: 1,
          migrate: (state) => {
            const keys = state as string[];
            return { keys, format: 'v1' };
          },
        }),
      ];

      const result = await applyMigrations(
        ['key1', 'key2'] as unknown as Json,
        migrations,
      );

      expect(result).toStrictEqual({
        version: 1,
        data: {
          keys: ['key1', 'key2'],
          format: 'v1',
        } satisfies PrivateKeysV1,
        migrated: true,
      });
    });

    it('wraps in envelope at version 0 when no migrations exist', async () => {
      const result = await applyMigrations({ foo: 'bar' }, []);

      expect(result).toStrictEqual({
        version: 0,
        data: { foo: 'bar' },
        migrated: false,
      });
    });

    it('wraps array state in envelope at version 0 when no migrations exist', async () => {
      const result = await applyMigrations(['a', 'b'] as unknown as Json, []);

      expect(result).toStrictEqual({
        version: 0,
        data: ['a', 'b'],
        migrated: false,
      });
    });
  });

  describe('with versioned state', () => {
    it('skips already-applied migrations', async () => {
      type StateV2 = { existing: boolean; v2: boolean };

      const migrateFn = jest.fn((state) => {
        const prev = state as { existing: boolean };
        return { ...prev, v2: true };
      });

      const migrations: KeyringMigration[] = [
        { version: 1, migrate: (state) => state },
        { version: 2, migrate: migrateFn },
      ];

      const result = await applyMigrations(
        { version: 1, data: { existing: true } },
        migrations,
      );

      expect(migrateFn).toHaveBeenCalledWith({ existing: true });
      expect(result).toStrictEqual({
        version: 2,
        data: { existing: true, v2: true } satisfies StateV2,
        migrated: true,
      });
    });

    it('returns state unchanged when already at latest version', async () => {
      const migrateFn = jest.fn((state) => state);

      const migrations: KeyringMigration[] = [
        { version: 1, migrate: migrateFn },
      ];

      const result = await applyMigrations(
        { version: 1, data: { foo: 'bar' } },
        migrations,
      );

      expect(migrateFn).not.toHaveBeenCalled();
      expect(result).toStrictEqual({
        version: 1,
        data: { foo: 'bar' },
        migrated: false,
      });
    });

    it('applies multiple pending migrations in order', async () => {
      type StateV3 = { original: boolean; migrated: boolean };

      const order: number[] = [];

      const migrations = [
        defineMigration({
          version: 1,
          migrate: (state) => {
            order.push(1);
            return state;
          },
        }),
        defineMigration({
          version: 2,
          migrate: (state) => {
            order.push(2);
            return state;
          },
        }),
        defineMigration<StateV3>({
          version: 3,
          migrate: (state) => {
            order.push(3);
            const prev = state as { original: boolean };
            return { ...prev, migrated: true };
          },
        }),
      ] as const;

      const result = await applyMigrations(
        { version: 1, data: { original: true } },
        migrations,
      );

      expect(order).toStrictEqual([2, 3]);
      expect(result).toStrictEqual({
        version: 3,
        data: { original: true, migrated: true } satisfies StateV3,
        migrated: true,
      });
    });
  });

  describe('async migrations', () => {
    it('supports async migrate functions', async () => {
      type StateV1 = { foo: string; async: boolean };

      const migrations = [
        defineMigration<StateV1>({
          version: 1,
          migrate: async (state) => {
            await new Promise((resolve) => setTimeout(resolve, 1));
            const prev = state as { foo: string };
            return { ...prev, async: true };
          },
        }),
      ];

      const result = await applyMigrations({ foo: 'bar' }, migrations);

      expect(result).toStrictEqual({
        version: 1,
        data: { foo: 'bar', async: true } satisfies StateV1,
        migrated: true,
      });
    });
  });

  describe('typed result', () => {
    it('infers data type from the last migration when using defineMigrations', async () => {
      type StateV1 = { count: number };
      type StateV2 = { count: number; label: string };

      const migrations = defineMigrations(
        defineMigration<StateV1>({
          version: 1,
          migrate: () => ({ count: 1 }),
        }),
        defineMigration<StateV2, StateV1>({
          version: 2,
          migrate: (state) => ({ ...state, label: 'hello' }),
        }),
      );

      const { data } = await applyMigrations({}, migrations);

      // data is inferred as StateV2 — typed fields accessible without a cast
      expect(data.count).toBe(1);
      expect(data.label).toBe('hello');
    });

    it('falls back to Json when array is typed as KeyringMigration[]', async () => {
      type StateV1 = { count: number };

      const migrations: KeyringMigration[] = [
        defineMigration<StateV1>({
          version: 1,
          migrate: () => ({ count: 1 }),
        }),
      ];

      const { data } = await applyMigrations({}, migrations);

      // data is Json — explicit cast required
      expect((data as StateV1).count).toBe(1);
    });
  });

  describe('schema validation', () => {
    it('passes when output matches schema', async () => {
      const OutputSchema = object({
        name: string(),
        count: number(),
      });
      type OutputState = Infer<typeof OutputSchema>;

      const migration = defineMigration<OutputState>({
        version: 1,
        schema: OutputSchema,
        migrate: (): OutputState => ({ name: 'test', count: 42 }),
      });

      const result = await applyMigrations({}, [migration]);

      expect(result).toStrictEqual({
        version: 1,
        data: { name: 'test', count: 42 },
        migrated: true,
      });
    });

    it('throws when output does not match schema', async () => {
      const OutputSchema = object({
        name: string(),
        count: number(),
      });
      type OutputState = Infer<typeof OutputSchema>;

      const migration = defineMigration<OutputState>({
        version: 1,
        schema: OutputSchema,
        // @ts-expect-error - intentionally invalid return for test
        migrate: (): OutputState => ({ name: 'test', count: 'not a number' }),
      });

      await expect(applyMigrations({}, [migration])).rejects.toThrow(
        'Expected a number',
      );
    });

    it('validates each migration step independently', async () => {
      const V1Schema = object({ items: array(string()) });
      type StateV1 = Infer<typeof V1Schema>;

      const V2Schema = object({ items: array(string()), total: number() });
      type StateV2 = Infer<typeof V2Schema>;

      const migration1 = defineMigration<StateV1>({
        version: 1,
        schema: V1Schema,
        migrate: (): StateV1 => ({ items: ['a', 'b'] }),
      });

      const migration2 = defineMigration<StateV2>({
        version: 2,
        schema: V2Schema,
        migrate: (state): StateV2 => {
          const prev = state as StateV1;
          return { ...prev, total: prev.items.length };
        },
      });

      const result = await applyMigrations({}, [migration1, migration2]);

      expect(result).toStrictEqual({
        version: 2,
        data: { items: ['a', 'b'], total: 2 } satisfies StateV2,
        migrated: true,
      });
    });
  });

  describe('validation errors', () => {
    it('throws for non-sequential versions', async () => {
      const migrations: KeyringMigration[] = [
        { version: 1, migrate: (state) => state },
        { version: 3, migrate: (state) => state },
      ];

      await expect(applyMigrations({}, migrations)).rejects.toThrow(
        'Invalid migration: expected version 2 at index 1, got 3',
      );
    });

    it('throws for duplicate versions', async () => {
      const migrations: KeyringMigration[] = [
        { version: 1, migrate: (state) => state },
        { version: 1, migrate: (state) => state },
      ];

      await expect(applyMigrations({}, migrations)).rejects.toThrow(
        'Invalid migration: expected version 2 at index 1, got 1',
      );
    });

    it('throws for versions not starting at 1', async () => {
      const migrations: KeyringMigration[] = [
        { version: 2, migrate: (state) => state },
      ];

      await expect(applyMigrations({}, migrations)).rejects.toThrow(
        'Invalid migration: expected version 1 at index 0, got 2',
      );
    });

    it('throws when state version is newer than latest migration', async () => {
      const migrations: KeyringMigration[] = [
        { version: 1, migrate: (state) => state },
      ];

      await expect(
        applyMigrations({ version: 5, data: {} }, migrations),
      ).rejects.toThrow(
        'State version 5 is newer than the latest migration version 1',
      );
    });

    it('propagates errors from migrate functions', async () => {
      const migrations: KeyringMigration[] = [
        {
          version: 1,
          migrate: (): never => {
            throw new Error('Migration failed');
          },
        },
      ];

      await expect(applyMigrations({}, migrations)).rejects.toThrow(
        'Migration failed',
      );
    });
  });
});
