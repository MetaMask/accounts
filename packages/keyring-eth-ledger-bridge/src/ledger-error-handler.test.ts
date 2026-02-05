import { TransportStatusError } from '@ledgerhq/hw-transport';
import {
  HardwareWalletError,
  ErrorCode as ErrorCodeEnum,
  Severity as SeverityEnum,
  Category as CategoryEnum,
} from '@metamask/hw-wallet-sdk';

import { handleLedgerTransportError } from './ledger-error-handler';

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
   * Helper function to test that handleLedgerTransportError throws a HardwareWalletError
   * with expected properties
   *
   * @param error - The error to pass to handleLedgerTransportError
   * @param expectedCode - Expected error code of the thrown HardwareWalletError
   * @param expectedMessageContains - Expected message substring of the thrown HardwareWalletError
   * @returns True if all assertions pass
   */
  function expectHardwareWalletError(
    error: unknown,
    expectedCode: ErrorCodeEnum,
    expectedMessageContains: string,
  ): boolean {
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
    expect((thrownError as HardwareWalletError).code).toBe(expectedCode);
    expect((thrownError as HardwareWalletError).message).toContain(
      expectedMessageContains,
    );

    return true;
  }

  describe('when error is TransportStatusError', () => {
    it.each([
      {
        tc: 'user rejection',
        inputMessage: 'User rejected',
        status: 0x6985,
        expectedCode: ErrorCodeEnum.UserRejected,
        expectedMessage: 'Ledger: User rejected action on device',
      },
      {
        tc: 'blind signing',
        inputMessage: 'Blind signing required',
        status: 0x6a80,
        expectedCode: ErrorCodeEnum.DeviceStateBlindSignNotSupported,
        expectedMessage: 'Ledger: Blind signing not supported',
      },
      {
        tc: 'device locked',
        inputMessage: 'Device locked',
        status: 0x5515,
        expectedCode: ErrorCodeEnum.AuthenticationDeviceLocked,
        expectedMessage: 'Ledger: Device is locked',
      },
      {
        tc: 'app closed',
        inputMessage: 'App closed',
        status: 0x650f,
        expectedCode: ErrorCodeEnum.ConnectionClosed,
        expectedMessage: 'Ledger: App closed or connection issue',
      },
      {
        tc: 'unknown status codes by preserving original message',
        inputMessage: 'Unknown transport error',
        status: 0x9999,
        expectedCode: ErrorCodeEnum.Unknown,
        expectedMessage: 'Unknown transport error',
      },
      {
        tc: 'unknown status codes with existing prefix',
        inputMessage: 'Ledger: Unknown transport error',
        status: 0x9999,
        expectedCode: ErrorCodeEnum.Unknown,
        expectedMessage: 'Ledger: Unknown transport error',
      },
    ])(
      'handles status code $status ($tc)',
      ({ inputMessage, status, expectedCode, expectedMessage }) => {
        const error = createTransportStatusError(inputMessage, status);
        expect(
          expectHardwareWalletError(error, expectedCode, expectedMessage),
        ).toBe(true);
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
    ])(
      'creates new HardwareWalletError with fallback message for: $tc',
      ({ value }) => {
        const throwingFunction = (): never =>
          handleLedgerTransportError(value, fallbackMessage);

        expect(throwingFunction).toThrow(HardwareWalletError);
        expect(throwingFunction).toThrow(fallbackMessage);
      },
    );

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

    it('passes through HardwareWalletError instances unchanged', () => {
      const originalError = new HardwareWalletError('Test error', {
        code: ErrorCodeEnum.UserRejected,
        severity: SeverityEnum.Err,
        category: CategoryEnum.UserAction,
        userMessage: 'User rejected the action',
      });

      let thrownError: unknown;
      try {
        handleLedgerTransportError(originalError, fallbackMessage);
      } catch (error_: unknown) {
        thrownError = error_;
      }

      expect(thrownError).toBe(originalError);
    });
  });

  describe('return type', () => {
    it('has never return type (always throws)', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      type ReturnTypeIsNever<F extends (...args: any[]) => any> =
        ReturnType<F> extends never ? true : false;

      const isNever: ReturnTypeIsNever<typeof handleLedgerTransportError> =
        true;
      expect(isNever).toBe(true);
    });
  });
});
