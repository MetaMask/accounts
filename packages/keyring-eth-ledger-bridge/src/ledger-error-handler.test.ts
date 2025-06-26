import { TransportStatusError } from '@ledgerhq/hw-transport';

import { handleLedgerTransportError } from './ledger-error-handler';
import { LedgerStatusError } from './type';

describe('handleLedgerTransportError', () => {
  const fallbackMessage = 'Default error message';

  /**
   * Helper function to create a TransportStatusError-like object
   *
   * @param message - The error message
   * @param statusCode - The status code
   * @returns A TransportStatusError instance
   */
  function createTransportStatusError(
    message: string,
    statusCode: number,
  ): TransportStatusError {
    const error = {
      statusCode,
      message,
      name: 'TransportStatusError',
    };
    Object.setPrototypeOf(error, TransportStatusError.prototype);
    return error as TransportStatusError;
  }

  describe('when error is TransportStatusError', () => {
    it('handles status code 0x6985 (user rejection)', () => {
      const error = createTransportStatusError('User rejected', 0x6985);

      expect(() => handleLedgerTransportError(error, fallbackMessage)).toThrow(
        LedgerStatusError,
      );

      let thrownError: unknown;
      try {
        handleLedgerTransportError(error, fallbackMessage);
      } catch (error_: unknown) {
        thrownError = error_;
      }
      expect(thrownError).toBeInstanceOf(LedgerStatusError);
      expect((thrownError as LedgerStatusError).statusCode).toBe(0x6985);
      expect((thrownError as LedgerStatusError).message).toBe(
        'Ledger: User rejected the transaction',
      );
    });

    it('handles status code 0x6a80 (blind signing)', () => {
      const error = createTransportStatusError(
        'Blind signing required',
        0x6a80,
      );

      expect(() => handleLedgerTransportError(error, fallbackMessage)).toThrow(
        LedgerStatusError,
      );

      let thrownError: unknown;
      try {
        handleLedgerTransportError(error, fallbackMessage);
      } catch (error_: unknown) {
        thrownError = error_;
      }
      expect(thrownError).toBeInstanceOf(LedgerStatusError);
      expect((thrownError as LedgerStatusError).statusCode).toBe(0x6a80);
      expect((thrownError as LedgerStatusError).message).toBe(
        'Ledger: Blind signing must be enabled',
      );
    });

    it('handles status code 0x5515 (device locked)', () => {
      const error = createTransportStatusError('Device locked', 0x5515);

      expect(() => handleLedgerTransportError(error, fallbackMessage)).toThrow(
        LedgerStatusError,
      );

      let thrownError: unknown;
      try {
        handleLedgerTransportError(error, fallbackMessage);
      } catch (error_: unknown) {
        thrownError = error_;
      }
      expect(thrownError).toBeInstanceOf(LedgerStatusError);
      expect((thrownError as LedgerStatusError).statusCode).toBe(0x5515);
      expect((thrownError as LedgerStatusError).message).toBe(
        'Ledger: Device is locked. Unlock it to continue.',
      );
    });

    it('handles status code 0x650f (app closed)', () => {
      const error = createTransportStatusError('App closed', 0x650f);

      expect(() => handleLedgerTransportError(error, fallbackMessage)).toThrow(
        LedgerStatusError,
      );

      let thrownError: unknown;
      try {
        handleLedgerTransportError(error, fallbackMessage);
      } catch (error_: unknown) {
        thrownError = error_;
      }
      expect(thrownError).toBeInstanceOf(LedgerStatusError);
      expect((thrownError as LedgerStatusError).statusCode).toBe(0x650f);
      expect((thrownError as LedgerStatusError).message).toBe(
        'Ledger: Ethereum app closed. Open it to unlock.',
      );
    });

    it('handles unknown status codes by preserving original message', () => {
      const unknownStatusCode = 0x9999;
      const originalMessage = 'Unknown transport error';
      const error = createTransportStatusError(
        originalMessage,
        unknownStatusCode,
      );

      expect(() => handleLedgerTransportError(error, fallbackMessage)).toThrow(
        LedgerStatusError,
      );

      let thrownError: unknown;
      try {
        handleLedgerTransportError(error, fallbackMessage);
      } catch (error_: unknown) {
        thrownError = error_;
      }
      expect(thrownError).toBeInstanceOf(LedgerStatusError);
      expect((thrownError as LedgerStatusError).statusCode).toBe(
        unknownStatusCode,
      );
      expect((thrownError as LedgerStatusError).message).toBe(originalMessage);
    });
  });

  describe('when error is not TransportStatusError', () => {
    it('re-throws Error instances as-is', () => {
      const error = new Error('Original error message');

      expect(() => handleLedgerTransportError(error, fallbackMessage)).toThrow(
        error,
      );

      expect(() => handleLedgerTransportError(error, fallbackMessage)).toThrow(
        error.message,
      );
    });

    it('creates new Error with fallback message for non-Error instances', () => {
      const nonErrorValue = 'string error';

      const throwingFunction = (): never =>
        handleLedgerTransportError(nonErrorValue, fallbackMessage);

      expect(throwingFunction).toThrow(Error);
      expect(throwingFunction).toThrow(fallbackMessage);
    });

    it('creates new Error with fallback message for null', () => {
      const throwingFunctionNull = (): never =>
        handleLedgerTransportError(null, fallbackMessage);

      expect(throwingFunctionNull).toThrow(Error);
      expect(throwingFunctionNull).toThrow(fallbackMessage);
    });

    it('creates new Error with fallback message for undefined', () => {
      const throwingFunctionUndefined = (): never =>
        handleLedgerTransportError(undefined, fallbackMessage);

      expect(throwingFunctionUndefined).toThrow(Error);
      expect(throwingFunctionUndefined).toThrow(fallbackMessage);
    });

    it('creates new Error with fallback message for objects without Error prototype', () => {
      const plainObject = { message: 'not an error' };

      const throwingFunction = (): never =>
        handleLedgerTransportError(plainObject, fallbackMessage);

      expect(throwingFunction).toThrow(Error);
      expect(throwingFunction).toThrow(fallbackMessage);
    });
  });

  describe('return type', () => {
    it('has never return type (always throws)', () => {
      type ReturnTypeIsNever<Function extends (...args: any) => any> =
        ReturnType<Function> extends never ? true : false;

      const isNever: ReturnTypeIsNever<typeof handleLedgerTransportError> =
        true;
      expect(isNever).toBe(true);
    });
  });
});
