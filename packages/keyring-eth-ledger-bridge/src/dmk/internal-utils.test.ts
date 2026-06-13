import {
  hexToBytes,
  stripHexPrefix,
  stripPathPrefix,
  toHexString,
} from './internal-utils';

describe('stripHexPrefix', () => {
  it('strips the 0x prefix when present', () => {
    expect(stripHexPrefix('0xabc')).toBe('abc');
  });

  it('returns the value unchanged when no prefix is present', () => {
    expect(stripHexPrefix('abc')).toBe('abc');
  });

  it('handles empty string', () => {
    expect(stripHexPrefix('')).toBe('');
  });

  it('does not strip 0x that appears later in the string', () => {
    expect(stripHexPrefix('00xabc')).toBe('00xabc');
  });
});

describe('stripPathPrefix', () => {
  it('strips the leading m/ prefix', () => {
    expect(stripPathPrefix("m/44'/60'/0'/0/0")).toBe("44'/60'/0'/0/0");
  });

  it('returns the path unchanged when no m/ prefix is present', () => {
    expect(stripPathPrefix("44'/60'/0'/0/0")).toBe("44'/60'/0'/0/0");
  });

  it('only strips the prefix at the start of the string', () => {
    expect(stripPathPrefix("44'/m/0/0")).toBe("44'/m/0/0");
  });
});

describe('toHexString', () => {
  it('converts a number to a hex string without 0x prefix', () => {
    expect(toHexString(27)).toBe('1b');
  });

  it('converts a bigint to a hex string without 0x prefix', () => {
    expect(toHexString(BigInt(27))).toBe('1b');
  });

  it('strips the 0x prefix from an already-hex string', () => {
    expect(toHexString('0x1c')).toBe('1c');
  });

  it('returns a non-prefixed string unchanged', () => {
    expect(toHexString('1c')).toBe('1c');
  });
});

describe('hexToBytes', () => {
  it('converts an even-length hex string with 0x prefix to bytes', () => {
    expect(hexToBytes('0xdeadbeef')).toStrictEqual(
      Uint8Array.from([0xde, 0xad, 0xbe, 0xef]),
    );
  });

  it('converts an even-length hex string without 0x prefix to bytes', () => {
    expect(hexToBytes('deadbeef')).toStrictEqual(
      Uint8Array.from([0xde, 0xad, 0xbe, 0xef]),
    );
  });

  it('returns an empty Uint8Array for an empty string', () => {
    expect(hexToBytes('')).toStrictEqual(Uint8Array.from([]));
  });

  it('throws on an odd-length hex string', () => {
    expect(() => hexToBytes('abc')).toThrow(
      /Hex string must have an even number of characters/u,
    );
  });

  it('throws on a string with non-hex characters', () => {
    expect(() => hexToBytes('zz')).toThrow(
      /Hex string contains non-hex characters/u,
    );
  });

  it('throws on an odd-length hex string with 0x prefix', () => {
    expect(() => hexToBytes('0xabc')).toThrow(
      /Hex string must have an even number of characters/u,
    );
  });
});
