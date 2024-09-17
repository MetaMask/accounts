import {
  ensureDefined,
  equalsIgnoreCase,
  throwError,
  toJson,
  unique,
} from './util';

describe('unique', () => {
  it('returns an empty array when given an empty array', () => {
    const arr: number[] = [];
    const result = unique(arr);
    expect(result).toStrictEqual([]);
  });

  it('returns an array with unique elements', () => {
    const arr = [1, 2, 2, 3, 3, 3];
    const result = unique(arr);
    expect(result).toStrictEqual([1, 2, 3]);
  });

  it('returns an array with unique objects', () => {
    const obj1 = { name: 'John' };
    const obj2 = { name: 'Jane' };
    const arr = [obj1, obj1, obj2];
    const result = unique(arr);
    expect(result).toStrictEqual([{ name: 'John' }, { name: 'Jane' }]);
  });

  it('returns an array with unique values from a map', () => {
    const map = new Map<number, string>([
      [1, 'John'],
      [2, 'Jane'],
      [3, 'John'],
    ]);
    const result = unique(map.values());
    expect(result).toStrictEqual(['John', 'Jane']);
  });
});

describe('toJson', () => {
  it('correctly serializes an object to JSON', () => {
    const obj = { name: 'John', age: 30 };
    const json = toJson(obj);
    expect(json).toStrictEqual(obj);
  });

  it('correctly serializes an array to JSON', () => {
    const arr = [1, 2, 3];
    const json = toJson(arr);
    expect(json).toStrictEqual(arr);
  });

  it('correctly serializes an object with defined and non-undefined fields to JSON', () => {
    const obj = { name: 'John', age: undefined };
    const expectedJson = { name: 'John' };
    const json = toJson(obj);
    expect(json).toStrictEqual(expectedJson);
  });
});

describe('ensureDefined', () => {
  it('does not throw an error when value is defined', () => {
    expect(() => ensureDefined('hello')).not.toThrow();
  });

  it('throws an error when value is undefined', () => {
    expect(() => ensureDefined(undefined)).toThrow('Argument is undefined');
  });
});

describe('throwError', () => {
  it('throws an error with the given message', () => {
    expect(() => throwError('hello')).toThrow('hello');
  });
});

describe('equalsIgnoreCase', () => {
  it('returns true for equal strings', () => {
    expect(equalsIgnoreCase('hello', 'HELLO')).toBe(true);
  });

  it('returns false for different strings', () => {
    expect(equalsIgnoreCase('hello', 'world')).toBe(false);
  });
});
