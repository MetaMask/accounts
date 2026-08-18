import {
  decodeMnemonic,
  decodeMnemonicWords,
  encodeMnemonic,
  encodeMnemonicWords,
} from './mnemonic';

const toIndicesBytes = (indices: number[]): Uint8Array =>
  new Uint8Array(new Uint16Array(indices).buffer);

describe('encodeMnemonicWords', () => {
  it('returns an empty string for empty input', () => {
    expect(encodeMnemonicWords(toIndicesBytes([]))).toBe('');
  });

  it('encodes a single word (index 0 -> "abandon")', () => {
    expect(encodeMnemonicWords(toIndicesBytes([0]))).toBe('abandon');
  });

  it('encodes two words separated by a space (index 0 -> "abandon", index 1 -> "ability")', () => {
    expect(encodeMnemonicWords(toIndicesBytes([0, 1]))).toBe('abandon ability');
  });

  it('encodes a standard 12-word mnemonic (all "abandon")', () => {
    const indices = new Array(12).fill(0);
    expect(encodeMnemonicWords(toIndicesBytes(indices))).toBe(
      new Array(12).fill('abandon').join(' '),
    );
  });

  it('returns a string', () => {
    expect(typeof encodeMnemonicWords(toIndicesBytes([0]))).toBe('string');
  });
});

describe('encodeMnemonic', () => {
  it('returns an empty array for empty input', () => {
    expect(encodeMnemonic(toIndicesBytes([]))).toStrictEqual([]);
  });

  it('encodes a single word (index 0 -> "abandon")', () => {
    const expected = Array.from(new TextEncoder().encode('abandon'));
    expect(encodeMnemonic(toIndicesBytes([0]))).toStrictEqual(expected);
  });

  it('encodes two words separated by a space', () => {
    // index 0 -> "abandon", index 1 -> "ability"
    const expected = Array.from(new TextEncoder().encode('abandon ability'));
    expect(encodeMnemonic(toIndicesBytes([0, 1]))).toStrictEqual(expected);
  });

  it('encodes a standard 12-word mnemonic (all "abandon")', () => {
    const indices = new Array(12).fill(0);
    const expected = Array.from(
      new TextEncoder().encode(new Array(12).fill('abandon').join(' ')),
    );
    expect(encodeMnemonic(toIndicesBytes(indices))).toStrictEqual(expected);
  });

  it('returns number[] (not a Uint8Array)', () => {
    const result = encodeMnemonic(toIndicesBytes([0]));
    expect(Array.isArray(result)).toBe(true);
  });
});

describe('decodeMnemonicWords', () => {
  it('returns an empty array for empty input', () => {
    expect(decodeMnemonicWords('')).toStrictEqual(toIndicesBytes([]));
  });

  it('decodes a single word ("abandon" -> index 0)', () => {
    expect(decodeMnemonicWords('abandon')).toStrictEqual(toIndicesBytes([0]));
  });

  it('decodes two words separated by a space', () => {
    expect(decodeMnemonicWords('abandon ability')).toStrictEqual(
      toIndicesBytes([0, 1]),
    );
  });

  it('decodes a standard 12-word mnemonic (all "abandon")', () => {
    expect(
      decodeMnemonicWords(new Array(12).fill('abandon').join(' ')),
    ).toStrictEqual(toIndicesBytes(new Array(12).fill(0)));
  });

  it('throws if a word is not in the English BIP-39 wordlist', () => {
    expect(() => decodeMnemonicWords('abandon invalid')).toThrow(
      'Invalid mnemonic word: "invalid"',
    );
  });
});

describe('decodeMnemonic', () => {
  it('returns an empty array for empty input', () => {
    expect(decodeMnemonic(new Uint8Array())).toStrictEqual(toIndicesBytes([]));
  });

  it('decodes UTF-8 mnemonic bytes', () => {
    const mnemonicBytes = new TextEncoder().encode('abandon ability');

    expect(decodeMnemonic(mnemonicBytes)).toStrictEqual(toIndicesBytes([0, 1]));
  });

  it('round trips encoded mnemonic indices', () => {
    const mnemonicIndicesBytes = toIndicesBytes([0, 1, 2, 2047]);

    expect(
      decodeMnemonic(new Uint8Array(encodeMnemonic(mnemonicIndicesBytes))),
    ).toStrictEqual(mnemonicIndicesBytes);
  });

  it('throws if the mnemonic contains an invalid word', () => {
    const mnemonicBytes = new TextEncoder().encode('abandon invalid');

    expect(() => decodeMnemonic(mnemonicBytes)).toThrow(
      'Invalid mnemonic word: "invalid"',
    );
  });
});
