import {
  convertEnglishWordlistIndicesToCodepoints,
  convertMnemonicToWordlistIndices,
} from './mnemonic';

describe('mnemonic utils', () => {
  const mnemonic =
    'abandon ability able about above absent absorb abstract absurd abuse access accident';
  describe('convertEnglishWordlistIndicesToCodepoints', () => {
    it('should convert English wordlist indices to codepoints', () => {
      const indices = new Uint8Array(
        new Uint16Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]).buffer,
      );
      const result = convertEnglishWordlistIndicesToCodepoints(indices);
      expect(result).toStrictEqual(Buffer.from(mnemonic));
    });
  });

  describe('convertMnemonicToWordlistIndices', () => {
    it('should convert a mnemonic to wordlist indices', () => {
      const result = convertMnemonicToWordlistIndices(mnemonic);
      expect(result).toStrictEqual(
        new Uint8Array(
          new Uint16Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]).buffer,
        ),
      );
    });
  });
});
