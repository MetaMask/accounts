import { TransportStatusError } from '@ledgerhq/hw-transport';
import {
  ErrorCode,
  Severity,
  Category,
  RetryStrategy,
  HardwareWalletError,
} from '@metamask/keyring-utils';

import { handleLedgerTransportError } from './ledger-error-handler';

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
 * Helper function to test that handleLedgerTransportError throws a HardwareWalletError
 * with expected properties
 *
 * @param error - The error to pass to handleLedgerTransportError
 * @param expectedMessage - Expected message of the thrown HardwareWalletError
 * @returns True if all assertions pass
 */
function expectLedgerError(error: unknown, expectedMessage: string): boolean {
  expect(() => handleLedgerTransportError(error, fallbackMessage)).toThrow(
    HardwareWalletError,
  );

  let thrownError: unknown;
  try {
    handleLedgerTransportError(error, fallbackMessage);
  } catch (error_: unknown) {
    thrownError = error_;
  }
  expect(thrownError).toBeInstanceOf(HardwareWalletError);
  expect((thrownError as HardwareWalletError).message).toBe(expectedMessage);

  return true;
}
describe('handleLedgerTransportError', () => {
  describe('when error is TransportStatusError', () => {
    it.each([
      {
        tc: 'user rejection',
        inputMessage: 'User rejected',
        status: 0x6985,
        expectedMessage: 'User rejected action on device',
      },
      {
        tc: 'blind signing',
        inputMessage: 'Blind signing required',
        status: 0x6a80,
        expectedMessage: 'Invalid data received',
      },
      {
        tc: 'device locked',
        inputMessage: 'Device locked',
        status: 0x5515,
        expectedMessage: 'Device is locked',
      },
      {
        tc: 'app closed',
        inputMessage: 'App closed',
        status: 0x650f,
        expectedMessage: 'App closed or connection issue',
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
        expect(expectLedgerError(error, expectedMessage)).toBe(true);
      },
    );
  });

  describe('when error is not TransportStatusError', () => {
    it.each([
      { tc: 'null', value: null },
      { tc: 'undefined', value: undefined },
      { tc: 'non-Error instances', value: 'string error' },
      {
        tc: 'objects without Error prototype',
        value: { message: 'not an error' },
      },
    ])('creates new Error with fallback message for: $tc', ({ value }) => {
      const throwingFunction = (): never =>
        handleLedgerTransportError(value, fallbackMessage);

      expect(throwingFunction).toThrow(Error);
      expect(throwingFunction).toThrow(fallbackMessage);
    });

    it('wraps Error instances in HardwareWalletError', () => {
      const error = new Error('Original error message');

      expect(() => handleLedgerTransportError(error, fallbackMessage)).toThrow(
        HardwareWalletError,
      );

      let thrownError: unknown;
      try {
        handleLedgerTransportError(error, fallbackMessage);
      } catch (error_: unknown) {
        thrownError = error_;
      }

      expect(thrownError).toBeInstanceOf(HardwareWalletError);
      expect((thrownError as HardwareWalletError).message).toBe(
        'Original error message',
      );
      expect((thrownError as HardwareWalletError).cause).toBe(error);
    });

    it('passes through HardwareWalletError instances', () => {
      const ledgerError = new HardwareWalletError('Ledger error', {
        code: ErrorCode.USER_CANCEL_001,
        severity: Severity.ERROR,
        category: Category.USER_ACTION,
        retryStrategy: RetryStrategy.NO_RETRY,
        userActionable: false,
        userMessage: '',
      });

      expect(() =>
        handleLedgerTransportError(ledgerError, fallbackMessage),
      ).toThrow(ledgerError);

      let thrownError: unknown;
      try {
        handleLedgerTransportError(ledgerError, fallbackMessage);
      } catch (error_: unknown) {
        thrownError = error_;
      }

      expect(thrownError).toBe(ledgerError);
    });
  });
});
