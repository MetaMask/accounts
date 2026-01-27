import { LedgerStatusError } from './type';

describe('LedgerStatusError', () => {
  describe('constructor', () => {
    it('should create an error with status code and message', () => {
      const statusCode = 0x6985;
      const message = 'User rejected the transaction';

      const error = new LedgerStatusError(statusCode, message);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(LedgerStatusError);
      expect(error.statusCode).toBe(statusCode);
      expect(error.message).toBe(message);
    });

    it('should create an error with different status codes', () => {
      const testCases = [
        { statusCode: 0x5515, message: 'Device is locked' },
        { statusCode: 0x650f, message: 'App closed' },
        { statusCode: 0x6a80, message: 'Invalid data' },
      ];

      testCases.forEach(({ statusCode, message }) => {
        const error = new LedgerStatusError(statusCode, message);

        expect(error.statusCode).toBe(statusCode);
        expect(error.message).toBe(message);
        expect(error).toBeInstanceOf(Error);
      });
    });

    it('should have Error as prototype', () => {
      const error = new LedgerStatusError(0x6985, 'Test error');

      expect(Object.getPrototypeOf(error)).toBe(LedgerStatusError.prototype);
      expect(error instanceof Error).toBe(true);
    });
  });
});
