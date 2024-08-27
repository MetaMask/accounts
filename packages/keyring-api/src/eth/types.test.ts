import { UrlStruct } from '../utils';

describe('types', () => {
  it('is a valid BundlerUrl', () => {
    const url = 'https://api.example.com';
    expect(() => UrlStruct.assert(url)).not.toThrow();
  });

  it('is a valid BundlerUrl with query parameters', () => {
    const url = 'https://api.example.com?foo=bar';
    expect(() => UrlStruct.assert(url)).not.toThrow();
  });

  it('accepts path parameters', () => {
    const url = 'https://api.example.com/foo/bar';
    expect(() => UrlStruct.assert(url)).not.toThrow();
  });

  it('fails if it does not start with http or https', () => {
    const url = 'ftp://api.example.com';
    expect(() => UrlStruct.assert(url)).toThrow(
      'Expected a value of type `Url`, but received: `"ftp://api.example.com"`',
    );
  });

  it('has to start with http or https', () => {
    const url = 'http://api.example.com';
    expect(() => UrlStruct.assert(url)).not.toThrow();
  });
});
