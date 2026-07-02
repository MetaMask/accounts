import type { Struct } from '@metamask/superstruct';
import {
  assert,
  coerce,
  create,
  is,
  literal,
  number,
  object,
  string,
} from '@metamask/superstruct';
import { isPlainObject } from '@metamask/utils';

import { strictMask, selectiveUnion } from '.';

describe('selectiveUnion', () => {
  const structA = object({
    tag: literal('a'),
    a: string(),
  });

  const structB = object({
    tag: literal('b'),
    b: coerce(number(), string(), (value) => parseFloat(value)),
  });

  const selector = (value: any): Struct<any, any> => {
    return isPlainObject(value) && value.tag === 'a' ? structA : structB;
  };

  const struct = selectiveUnion(selector);

  it('throws an error if the value does have the `tag` property', () => {
    expect(() => assert({ other: 'c' }, struct)).toThrow(
      'At path: tag -- Expected the literal `"b"`, but received: undefined',
    );
  });

  it('throws an error if the value has an invalid `tag`', () => {
    expect(() => assert({ tag: 'c' }, struct)).toThrow(
      'At path: tag -- Expected the literal `"b"`, but received: "c"',
    );
  });

  it.each([
    { obj: {}, expected: false },
    { obj: { tag: 'c' }, expected: false },
    { obj: { tag: 'a' }, expected: false },
    { obj: { tag: 'a', a: 'hi' }, expected: true },
    { obj: { tag: 'a', a: 1 }, expected: false },
    { obj: { tag: 'a', b: 1 }, expected: false },
    { obj: { tag: 'b', a: 'hi' }, expected: false },
    { obj: { tag: 'b', a: 1 }, expected: false },
    { obj: { tag: 'b', b: 1 }, expected: true },
  ])('returns $expected for is($obj, <struct>)', ({ obj, expected }) => {
    expect(is({ ...obj }, struct)).toBe(expected);
  });

  it.each([
    { obj: { tag: 'a', a: 'hi' }, want: { tag: 'a', a: 'hi' } },
    { obj: { tag: 'b', b: '1' }, want: { tag: 'b', b: 1 } },
  ])('coerces $obj to $want', ({ obj, want }) => {
    expect(create(obj, struct)).toStrictEqual(want);
  });
});

describe('strictMask', () => {
  const struct = object({
    foo: string(),
    bar: number(),
  });

  it('is valid', () => {
    expect(() => strictMask({ foo: 'foo', bar: 1 }, struct)).not.toThrow();
  });

  it('fails if the object is not strictly matching', () => {
    expect(() => strictMask({ foo: 'foo', bar: 1, zzz: [] }, struct)).toThrow(
      'At path: zzz -- Expected a value of type `never`, but received: ``',
    );
    expect(() => strictMask({ foo: 'foo' }, struct)).toThrow(
      'At path: bar -- Expected a number, but received: undefined',
    );
    expect(() => strictMask({ bar: 1 }, struct)).toThrow(
      'At path: foo -- Expected a string, but received: undefined',
    );
  });
});
