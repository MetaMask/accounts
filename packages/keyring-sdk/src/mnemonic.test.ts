import { encodeMnemonic, encodeMnemonicWords } from './mnemonic';

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
