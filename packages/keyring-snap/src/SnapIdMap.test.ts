import type { SnapId } from '@metamask/snaps-sdk';

import { InvalidSnapIdError, SnapIdMap } from './SnapIdMap';

const SNAP_1_ID = 'snap-1' as SnapId;
const SNAP_2_ID = 'snap-2' as SnapId;

describe('SnapIdMap', () => {
  describe('toObject', () => {
    it('returns an empty object when the map is empty', () => {
      const map = new SnapIdMap<{ snapId: SnapId; value: number }>();
      const obj = map.toObject();
      expect(obj).toStrictEqual({});
    });

    it('returns an object with the same keys and values as the map', () => {
      const map = new SnapIdMap<{ snapId: SnapId; value: number }>();
      map.set('foo', { snapId: SNAP_1_ID, value: 1 });
      map.set('bar', { snapId: SNAP_2_ID, value: 2 });
      const obj = map.toObject();
      expect(obj).toStrictEqual({
        foo: { snapId: SNAP_1_ID, value: 1 },
        bar: { snapId: SNAP_2_ID, value: 2 },
      });
    });

    it('returns an object with lowercase keys', () => {
      const map = new SnapIdMap<{ snapId: SnapId; value: number }>();
      map.set('foo', { snapId: SNAP_1_ID, value: 1 });
      map.set('BAR', { snapId: SNAP_2_ID, value: 2 });
      const obj = map.toObject();
      expect(obj).toStrictEqual({
        foo: { snapId: SNAP_1_ID, value: 1 },
        bar: { snapId: SNAP_2_ID, value: 2 },
      });
    });
  });

  describe('fromObject', () => {
    it('returns an empty map when the object is empty', () => {
      const map = SnapIdMap.fromObject({});
      expect(map.size).toBe(0);
    });

    it('returns a map with the same keys and values as the object', () => {
      const map = SnapIdMap.fromObject({
        foo: { snapId: SNAP_1_ID, value: 1 },
        bar: { snapId: SNAP_2_ID, value: 2 },
      });
      expect(map.size).toBe(2);
      expect(map.get(SNAP_1_ID, 'foo')).toStrictEqual({
        snapId: SNAP_1_ID,
        value: 1,
      });
      expect(map.get(SNAP_2_ID, 'bar')).toStrictEqual({
        snapId: SNAP_2_ID,
        value: 2,
      });
    });

    it('converts keys to lowercase', () => {
      const map = SnapIdMap.fromObject({
        FOO: { snapId: SNAP_1_ID, value: 1 },
        BAR: { snapId: SNAP_2_ID, value: 2 },
      });
      expect(map.size).toBe(2);
      expect(map.get(SNAP_1_ID, 'foo')).toStrictEqual({
        snapId: SNAP_1_ID,
        value: 1,
      });
      expect(map.get(SNAP_2_ID, 'bar')).toStrictEqual({
        snapId: SNAP_2_ID,
        value: 2,
      });
    });
  });

  describe('get', () => {
    it('returns undefined when the key is not in the map', () => {
      const map = new SnapIdMap<{ snapId: SnapId; value: number }>();
      const value = map.get(SNAP_1_ID, 'foo');
      expect(value).toBeUndefined();
    });

    it('returns undefined when the snapId does not match', () => {
      const map = new SnapIdMap<{ snapId: SnapId; value: number }>();
      map.set('foo', { snapId: SNAP_1_ID, value: 1 });
      const value = map.get(SNAP_2_ID, 'foo');
      expect(value).toBeUndefined();
    });

    it('returns the value when the snapId matches', () => {
      const map = new SnapIdMap<{ snapId: SnapId; value: number }>();
      map.set('foo', { snapId: SNAP_1_ID, value: 1 });
      const value = map.get(SNAP_1_ID, 'foo');
      expect(value).toStrictEqual({ snapId: SNAP_1_ID, value: 1 });
    });
  });

  describe('has', () => {
    it('returns false when the key is not in the map', () => {
      const map = new SnapIdMap<{ snapId: SnapId; value: number }>();
      const hasKey = map.has(SNAP_1_ID, 'foo');
      expect(hasKey).toBe(false);
    });

    it('returns false when the snapId does not match', () => {
      const map = new SnapIdMap<{ snapId: SnapId; value: number }>();
      map.set('foo', { snapId: SNAP_1_ID, value: 1 });
      const hasKey = map.has(SNAP_2_ID, 'foo');
      expect(hasKey).toBe(false);
    });

    it('returns true when the snapId matches', () => {
      const map = new SnapIdMap<{ snapId: SnapId; value: number }>();
      map.set('foo', { snapId: SNAP_1_ID, value: 1 });
      const hasKey = map.has(SNAP_1_ID, 'foo');
      expect(hasKey).toBe(true);
    });
  });

  describe('delete', () => {
    it('returns false when the key is not in the map', () => {
      const map = new SnapIdMap<{ snapId: SnapId; value: number }>();
      const deleted = map.delete(SNAP_1_ID, 'foo');
      expect(deleted).toBe(false);
    });

    it('returns false when the snapId does not match', () => {
      const map = new SnapIdMap<{ snapId: SnapId; value: number }>();
      map.set('foo', { snapId: SNAP_1_ID, value: 1 });
      const deleted = map.delete(SNAP_2_ID, 'foo');
      expect(deleted).toBe(false);
    });

    it('deletes the key when the snapId matches', () => {
      const map = new SnapIdMap<{ snapId: SnapId; value: number }>();
      map.set('foo', { snapId: SNAP_1_ID, value: 1 });
      const deleted = map.delete(SNAP_1_ID, 'foo');
      expect(deleted).toBe(true);
      expect(map.has(SNAP_1_ID, 'foo')).toBe(false);
    });
  });

  describe('set', () => {
    it('adds a new key-value pair to the map', () => {
      const map = new SnapIdMap<{ snapId: SnapId; value: number }>();
      map.set('foo', { snapId: SNAP_1_ID, value: 1 });
      expect(map.size).toBe(1);
      expect(map.get(SNAP_1_ID, 'foo')).toStrictEqual({
        snapId: SNAP_1_ID,
        value: 1,
      });
    });

    it('updates the value of an existing key', () => {
      const map = new SnapIdMap<{ snapId: SnapId; value: number }>();
      map.set('foo', { snapId: SNAP_1_ID, value: 1 });
      map.set('foo', { snapId: SNAP_1_ID, value: 2 }); // NOSONAR
      expect(map.size).toBe(1);
      expect(map.get(SNAP_1_ID, 'foo')).toStrictEqual({
        snapId: SNAP_1_ID,
        value: 2,
      });
    });

    it('throws an error if the key is already in the map with a different snapId', () => {
      const map = new SnapIdMap<{ snapId: SnapId; value: number }>();
      map.set('foo', { snapId: SNAP_1_ID, value: 1 });
      expect(() => {
        map.set('foo', { snapId: SNAP_2_ID, value: 2 });
      }).toThrow(InvalidSnapIdError);
    });
  });

  describe('values', () => {
    it('returns an empty iterator when the map is empty', () => {
      const map = new SnapIdMap<{ snapId: SnapId; value: number }>();
      const iterator = map.values();
      expect(iterator.next().done).toBe(true);
    });

    it('returns an iterator with all the values in the map', () => {
      const map = new SnapIdMap<{ snapId: SnapId; value: number }>();
      map.set('foo', { snapId: SNAP_1_ID, value: 1 });
      map.set('bar', { snapId: SNAP_2_ID, value: 2 });
      const iterator = map.values();
      expect(iterator.next().value).toStrictEqual({
        snapId: SNAP_1_ID,
        value: 1,
      });
      expect(iterator.next().value).toStrictEqual({
        snapId: SNAP_2_ID,
        value: 2,
      });
      expect(iterator.next().done).toBe(true);
    });

    it('returns an iterator that reflects changes to the map', () => {
      const map = new SnapIdMap<{ snapId: SnapId; value: number }>();
      map.set('foo', { snapId: SNAP_1_ID, value: 1 });
      const iterator = map.values();
      expect(iterator.next().value).toStrictEqual({
        snapId: SNAP_1_ID,
        value: 1,
      });
      map.set('bar', { snapId: SNAP_2_ID, value: 2 });
      expect(iterator.next().value).toStrictEqual({
        snapId: SNAP_2_ID,
        value: 2,
      });
      expect(iterator.next().done).toBe(true);
    });
  });

  describe('size', () => {
    it('returns 0 when the map is empty', () => {
      const map = new SnapIdMap<{ snapId: SnapId; value: number }>();
      expect(map.size).toBe(0);
    });

    it('returns the number of key-value pairs in the map', () => {
      const map = new SnapIdMap<{ snapId: SnapId; value: number }>();
      map.set('foo', { snapId: SNAP_1_ID, value: 1 });
      map.set('bar', { snapId: SNAP_2_ID, value: 2 });
      expect(map.size).toBe(2);
    });
  });
});

describe('InvalidSnapIdError', () => {
  it('has the correct name', () => {
    const error = new InvalidSnapIdError(SNAP_1_ID, 'foo');
    expect(error.name).toBe('InvalidSnapIdError');
  });

  it('has the correct message', () => {
    const error = new InvalidSnapIdError(SNAP_1_ID, 'foo');
    expect(error.message).toBe('Snap "snap-1" is not allowed to set "foo"');
  });

  it('has the correct snapId property', () => {
    const error = new InvalidSnapIdError(SNAP_1_ID, 'foo');
    expect(error.snapId).toBe(SNAP_1_ID);
  });

  it('has the correct key property', () => {
    const error = new InvalidSnapIdError(SNAP_1_ID, 'foo');
    expect(error.key).toBe('foo');
  });
});
