import { TypedObject } from './object';

type Key = `${string}:${string}`;

describe('TypedObject', () => {
  const obj: Record<Key, boolean | string> = {
    'foo:bar': true,
    'bar:foo': 'barfoo',
  } as const;

  describe('keys', () => {
    it('uses type key', () => {
      expect(TypedObject.keys(obj)).toStrictEqual(['foo:bar', 'bar:foo']);
    });
  });

  describe('entries', () => {
    it('uses type key', () => {
      expect(TypedObject.entries(obj)).toStrictEqual([
        ['foo:bar', obj['foo:bar']],
        ['bar:foo', obj['bar:foo']],
      ]);
    });
  });

  describe('values', () => {
    it('gives the same values than Object.values', () => {
      expect(TypedObject.values(obj)).toStrictEqual(Object.values(obj));
    });
  });
});
