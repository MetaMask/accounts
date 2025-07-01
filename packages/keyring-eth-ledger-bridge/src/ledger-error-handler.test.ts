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

  /**
   * Helper function to test that handleLedgerTransportError throws a LedgerStatusError
   * with expected properties
   *
   * @param error - The error to pass to handleLedgerTransportError
   * @param expectedStatusCode - Expected status code of the thrown LedgerStatusError
   * @param expectedMessage - Expected message of the thrown LedgerStatusError
   * @returns True if all assertions pass
   */
  function expectLedgerStatusError(
    error: unknown,
    expectedStatusCode: number,
    expectedMessage: string,
  ): boolean {
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
      expectedStatusCode,
    );
    expect((thrownError as LedgerStatusError).message).toBe(expectedMessage);

    return true;
  }

  describe('when error is TransportStatusError', () => {
    it.each([
      {
        tc: 'user rejection',
        inputMessage: 'User rejected',
        status: 0x6985,
        expectedMessage: 'Ledger: User rejected the transaction',
      },
      {
        tc: 'blind signing',
        inputMessage: 'Blind signing required',
        status: 0x6a80,
        expectedMessage: 'Ledger: Blind signing must be enabled',
      },
      {
        tc: 'device locked',
        inputMessage: 'Device locked',
        status: 0x5515,
        expectedMessage: 'Ledger: Device is locked. Unlock it to continue',
      },
      {
        tc: 'app closed',
        inputMessage: 'App closed',
        status: 0x650f,
        expectedMessage: 'Ledger: Ethereum app closed. Open it to unlock',
      },
      {
        tc: 'unknown status codes by preserving original message',
        inputMessage: 'Unknown transport error',
        status: 0x9999,
        expectedMessage: 'Unknown transport error',
      },
    ])(
      'handles status code $status ($tc)',
      ({ inputMessage, status, expectedMessage }) => {
        const error = createTransportStatusError(inputMessage, status);
        expect(expectLedgerStatusError(error, status, expectedMessage)).toBe(
          true,
        );
      },
    );
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
