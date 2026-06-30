import type { Struct } from '@metamask/superstruct';
import {
  assert,
  coerce,
  create,
  exactOptional,
  is,
  literal,
  max,
  number,
  object,
  string,
  union,
} from '@metamask/superstruct';
import { isPlainObject } from '@metamask/utils';

import { strictMask, selectiveUnion, type } from '.';

describe('exactOptional', () => {
  const simpleStruct = object({
    foo: exactOptional(string()),
  });

  it.each([
    { struct: simpleStruct, obj: {}, expected: true },
    { struct: simpleStruct, obj: { foo: undefined }, expected: false },
    { struct: simpleStruct, obj: { foo: 'hi' }, expected: true },
    { struct: simpleStruct, obj: { bar: 'hi' }, expected: false },
    { struct: simpleStruct, obj: { foo: 1 }, expected: false },
  ])(
    'returns $expected for is($obj, <struct>)',
    ({ struct, obj, expected }) => {
      expect(is(obj, struct)).toBe(expected);
    },
  );

  const nestedStruct = object({
    foo: object({
      bar: exactOptional(string()),
    }),
  });

  it.each([
    { struct: nestedStruct, obj: { foo: {} }, expected: true },
    { struct: nestedStruct, obj: { foo: { bar: 'hi' } }, expected: true },
    {
      struct: nestedStruct,
      obj: { foo: { bar: undefined } },
      expected: false,
    },
  ])(
    'returns $expected for is($obj, <struct>)',
    ({ struct, obj, expected }) => {
      expect(is(obj, struct)).toBe(expected);
    },
  );

  const structWithUndef = object({
    foo: exactOptional(union([string(), literal(undefined)])),
  });

  it.each([
    { struct: structWithUndef, obj: {}, expected: true },
    { struct: structWithUndef, obj: { foo: undefined }, expected: true },
    { struct: structWithUndef, obj: { foo: 'hi' }, expected: true },
    { struct: structWithUndef, obj: { bar: 'hi' }, expected: false },
    { struct: structWithUndef, obj: { foo: 1 }, expected: false },
  ])(
    'returns $expected for is($obj, <struct>)',
    ({ struct, obj, expected }) => {
      expect(is(obj, struct)).toBe(expected);
    },
  );

  it('should support refinements', () => {
    const struct = object({
      foo: exactOptional(max(number(), 0)),
    });

    expect(is({ foo: 0 }, struct)).toBe(true);
    expect(is({ foo: -1 }, struct)).toBe(true);
    expect(is({ foo: 1 }, struct)).toBe(false);
  });
});

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

describe('type', () => {
  const struct = type({
    foo: string(),
  });

  it('is valid even with extra properties', () => {
    expect(is({ foo: 'foo', bar: 1 }, struct)).toBe(true);
  });

  it('throws an error if value is invalid', () => {
    expect(() => assert({ foo: 1, bar: 1 }, struct)).toThrow(
      'At path: foo -- Expected a string, but received: 1',
    );
  });

  it('throws an error if value is a non-object string', () => {
    expect(() => assert('not an object', struct)).toThrow(
      'Expected an object, but received: "not an object"',
    );
  });

  it('throws an error if value is a non-object non-string', () => {
    expect(() => assert(42, struct)).toThrow(
      'Expected an object, but received: 42',
    );
  });

  it('coerces an object value', () => {
    expect(create({ foo: 'foo', bar: 1 }, struct)).toStrictEqual({
      foo: 'foo',
      bar: 1,
    });
  });

  it('passes through non-object values during coercion', () => {
    expect(() => create(null, struct)).toThrow(
      'Expected an object, but received: null',
    );
  });

  it('supports exactOptional properties', () => {
    const exactStruct = type({
      foo: string(),
      bar: exactOptional(number()),
    });

    expect(is({ foo: 'foo' }, exactStruct)).toBe(true);
    expect(is({ foo: 'foo', bar: 1 }, exactStruct)).toBe(true);
    expect(is({ foo: 'foo', bar: undefined }, exactStruct)).toBe(false);
  });
});
