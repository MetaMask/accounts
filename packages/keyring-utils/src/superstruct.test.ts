import type { Struct, StructError } from '@metamask/superstruct';
import {
  assert,
  coerce,
  create,
  is,
  literal,
  max,
  number,
  refine,
  string,
  union,
} from '@metamask/superstruct';
import { isPlainObject } from '@metamask/utils';

import {
  exactOptional,
  object,
  sensitive,
  SENSITIVE_REDACTED,
  strictMask,
  selectiveUnion,
  type,
} from '.';

describe('sensitive', () => {
  const RAW_SECRET = '0xdeadbeef1234567890abcdef';

  it('accepts a valid value', () => {
    expect(is(RAW_SECRET, sensitive(string()))).toBe(true);
  });

  it('rejects an invalid value', () => {
    expect(is(123, sensitive(string()))).toBe(false);
  });

  it('redacts the value in the error message', () => {
    expect(() => assert(123, sensitive(string()))).toThrow(SENSITIVE_REDACTED);
  });

  it('does not expose the raw value in the error message', () => {
    let error: StructError | undefined;
    try {
      assert(RAW_SECRET, sensitive(refine(string(), 'hex', () => false)));
    } catch (caughtError) {
      error = caughtError as StructError;
    }
    expect(error?.message).toContain(SENSITIVE_REDACTED);
    expect(error?.message).not.toContain(RAW_SECRET);
  });

  it('redacts error.value', () => {
    let error: StructError | undefined;
    try {
      assert(123, sensitive(string()));
    } catch (caughtError) {
      error = caughtError as StructError;
    }
    expect(error?.value).toBe(SENSITIVE_REDACTED);
  });

  it('does not expose the raw value in error.branch', () => {
    let error: StructError | undefined;
    try {
      assert(123, sensitive(string()));
    } catch (caughtError) {
      error = caughtError as StructError;
    }
    expect(error?.branch).not.toContain(123);
  });

  it('redacts the value when used inside an object struct', () => {
    const struct = object({ privateKey: sensitive(string()) });
    let error: StructError | undefined;
    try {
      assert({ privateKey: 123 }, struct);
    } catch (caughtError) {
      error = caughtError as StructError;
    }
    expect(error?.message).toContain(SENSITIVE_REDACTED);
    expect(error?.message).not.toContain('123');
  });

  it('redacts refinement failures', () => {
    const hexString = sensitive(
      refine(string(), 'hex', (str) => str.startsWith('0x') || 'not hex'),
    );
    let error: StructError | undefined;
    try {
      assert('not-a-hex-string', hexString);
    } catch (caughtError) {
      error = caughtError as StructError;
    }
    expect(error?.message).toContain(SENSITIVE_REDACTED);
    expect(error?.message).not.toContain('not-a-hex-string');
    expect(error?.value).toBe(SENSITIVE_REDACTED);
  });

  it('does not alter coercion behaviour', () => {
    const struct = sensitive(string());
    expect(is(RAW_SECRET, struct)).toBe(true);
  });

  describe('branch redaction for sibling fields via object()', () => {
    const struct = object({
      privateKey: sensitive(string()),
      encoding: literal('hex'),
    });

    it('redacts the sensitive key from branch[0] when a sibling field fails', () => {
      let error: StructError | undefined;
      try {
        assert({ privateKey: RAW_SECRET, encoding: 'invalid' }, struct);
      } catch (caughtError) {
        error = caughtError as StructError;
      }
      // The error is about `encoding`, not `privateKey`.
      expect(error?.message).toContain('encoding');
      // But the parent object at branch[0] must not expose the raw secret.
      const parentInBranch = error?.branch[0] as Record<string, unknown>;
      expect(parentInBranch?.privateKey).toBe(SENSITIVE_REDACTED);
      expect(parentInBranch?.privateKey).not.toBe(RAW_SECRET);
    });

    it('redacts the sensitive key from every failure returned by error.failures()', () => {
      let error: StructError | undefined;
      try {
        assert({ privateKey: RAW_SECRET, encoding: 'invalid' }, struct);
      } catch (caughtError) {
        error = caughtError as StructError;
      }
      // Collect every object appearing in any failure branch and assert that
      // none of them expose the raw private key.
      const allBranchItems = (error?.failures() ?? []).flatMap(
        (failure) => failure.branch,
      );
      expect(allBranchItems).not.toContainEqual(
        expect.objectContaining({ privateKey: RAW_SECRET }),
      );
    });

    it('redacts the sensitive key from branch when a deeply nested sibling field fails', () => {
      const nestedStruct = object({
        privateKey: sensitive(string()),
        // `meta` is a sibling whose inner field will fail validation.
        meta: object({ tag: literal('valid') }),
      });

      let error: StructError | undefined;
      try {
        assert(
          { privateKey: RAW_SECRET, meta: { tag: 'invalid' } },
          nestedStruct,
        );
      } catch (caughtError) {
        error = caughtError as StructError;
      }
      // The error path leads into the nested `meta.tag` field.
      expect(error?.path).toContain('tag');
      // The top-level parent at branch[0] must still have the key redacted.
      const parentInBranch = error?.branch[0] as Record<string, unknown>;
      expect(parentInBranch?.privateKey).toBe(SENSITIVE_REDACTED);
      expect(parentInBranch?.privateKey).not.toBe(RAW_SECRET);
    });
  });
});

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
});
