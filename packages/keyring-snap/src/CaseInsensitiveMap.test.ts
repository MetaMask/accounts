import { CaseInsensitiveMap } from './CaseInsensitiveMap';

describe('CaseInsensitiveMap', () => {
  it('sets and gets values case-insensitively', () => {
    const map = new CaseInsensitiveMap<number>();
    map.set('foo', 1);
    map.set('BAR', 2);
    expect(map.get('foo')).toBe(1);
    expect(map.get('FOO')).toBe(1);
    expect(map.get('bar')).toBe(2);
    expect(map.get('BaR')).toBe(2);
  });

  it('checks for keys case-insensitively', () => {
    const map = new CaseInsensitiveMap<number>();
    map.set('foo', 1);
    expect(map.has('foo')).toBe(true);
    expect(map.has('FOO')).toBe(true);
    expect(map.has('bar')).toBe(false);
    expect(map.has('BaR')).toBe(false);
  });

  it('deletes keys case-insensitively', () => {
    const map = new CaseInsensitiveMap<number>();
    map.set('foo', 1);
    map.set('BAR', 2);
    expect(map.delete('foo')).toBe(true);
    expect(map.has('foo')).toBe(false);
    expect(map.has('FOO')).toBe(false);
    expect(map.has('bar')).toBe(true);
    expect(map.has('BaR')).toBe(true);
    expect(map.delete('BaR')).toBe(true);
    expect(map.has('bar')).toBe(false);
    expect(map.has('BaR')).toBe(false);
  });

  it('is able to construct from items', () => {
    const map = new CaseInsensitiveMap<number>([
      ['foo', 1],
      ['BAR', 2],
    ]);
    expect(map.get('foo')).toBe(1);
    expect(map.get('FOO')).toBe(1);
    expect(map.get('bar')).toBe(2);
    expect(map.get('BaR')).toBe(2);
  });

  it('converts the map to an object', () => {
    const map = new CaseInsensitiveMap<number>([
      ['foo', 1],
      ['BAR', 2],
    ]);
    const obj = map.toObject();
    expect(obj).toStrictEqual({ foo: 1, bar: 2 });
  });

  it('creates a map from an object', () => {
    const obj = { foo: 1, BAR: 2 };
    const map = CaseInsensitiveMap.fromObject(obj);
    expect(map.get('foo')).toBe(1);
    expect(map.get('FOO')).toBe(1);
    expect(map.get('bar')).toBe(2);
    expect(map.get('BaR')).toBe(2);
  });

  it('throws an error when trying to get a non-existent key', () => {
    const map = new CaseInsensitiveMap<number>();
    expect(() => map.getOrThrow('foo')).toThrow("Key 'foo' not found");
  });
});
