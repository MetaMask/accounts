import { areBothEmpty } from './utils';

describe('internal utils', () => {
  describe('areBothEmpty', () => {
    it('returns true if both arrays are empty', () => {
      expect(areBothEmpty([], [])).toBe(true);
    });

    it('returns false if one of the arrays is empty', () => {
      expect(areBothEmpty([0], [])).toBe(false);
      expect(areBothEmpty([], [1])).toBe(false);
    });

    it('returns false if the two arrays are not empty', () => {
      expect(areBothEmpty([0], [1])).toBe(false);
    });
  });
});
