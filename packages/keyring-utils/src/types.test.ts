import { is, assert } from '@metamask/superstruct';

import { StringNumberStruct, UrlStruct } from './types';

describe('types', () => {
  it('is a valid URL', () => {
    const url = 'https://api.example.com';
    expect(() => assert(url, UrlStruct)).not.toThrow();
  });

  it('is a valid URL', () => {
    const url = 'https://api.example.com';
    expect(() => assert(url, UrlStruct)).not.toThrow();
  });

  it('is a valid URL with query parameters', () => {
    const url = 'https://api.example.com?foo=bar';
    expect(() => assert(url, UrlStruct)).not.toThrow();
  });

  it('accepts path parameters', () => {
    const url = 'https://api.example.com/foo/bar';
    expect(() => assert(url, UrlStruct)).not.toThrow();
  });

  it('fails if it does not start with http or https', () => {
    const url = 'ftp://api.example.com';
    expect(() => assert(url, UrlStruct)).toThrow(
      'Expected a value of type `Url`, but received: `"ftp://api.example.com"`',
    );
  });

  it('fails if the URL is not valid', () => {
    const url = 'api.example.com'; // No protocol.
    expect(() => assert(url, UrlStruct)).toThrow(
      'Expected a value of type `Url`, but received: `"api.example.com"`',
    );
  });

  it('has to start with http or https', () => {
    const url = 'http://api.example.com';
    expect(() => assert(url, UrlStruct)).not.toThrow();
  });
});

describe('StringNumber', () => {
  it.each(['0', '0.0', '0.1', '0.19', '00.19', '0.000000000000000000000'])(
    'validates basic number: %s',
    (input: string) => {
      expect(is(input, StringNumberStruct)).toBe(true);
    },
  );

  it.each(['foobar', 'NaN', '0.123.4', '1e3', undefined, null, 1, true])(
    'fails to validate wrong number: %s',
    (input: any) => {
      expect(is(input, StringNumberStruct)).toBe(false);
    },
  );
});
