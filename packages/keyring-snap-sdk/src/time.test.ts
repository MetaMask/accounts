import { getCurrentUnixTimestamp, toUnixTimestamp } from './time';

describe('time', () => {
  describe('toUnixTimestamp', () => {
    it.each([
      ['1970-01-01', 0],
      ['1970-01-02', 24 * 60 * 60],
    ])('converts a Date object to a UNIX timestamp', (format, timestamp) => {
      const date = new Date(format);

      expect(toUnixTimestamp(date)).toBe(timestamp);
    });
  });

  describe('getCurrentTimestamp', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('converts the current time to its equivalent UNIX timestamp', () => {
      const seconds = 17;

      jest.setSystemTime(seconds * 1000); // ms
      expect(getCurrentUnixTimestamp()).toBe(seconds);
    });
  });
});
