import {
  HardwareWalletError,
  ErrorCode,
  Severity,
  Category,
} from '@metamask/hw-wallet-sdk';

import { handleTrezorTransportError } from './trezor-error-handler';

describe('handleTrezorTransportError', () => {
  const fallbackMessage = 'Default Trezor error';

  it.each([
    {
      tc: 'transport missing',
      input: Object.assign(new Error('error'), {
        code: 'Transport_Missing',
      }),
      code: ErrorCode.ConnectionTransportMissing,
    },
    {
      tc: 'disconnected device',
      input: Object.assign(new Error('error'), {
        code: 'Device_Disconnected',
      }),
      code: ErrorCode.DeviceDisconnected,
    },
    {
      tc: 'closed popup/session',
      input: Object.assign(new Error('error'), {
        code: 'Method_Interrupted',
      }),
      code: ErrorCode.ConnectionClosed,
    },
    {
      tc: 'cancelled action',
      input: Object.assign(new Error('error'), { code: 'Method_Cancel' }),
      code: ErrorCode.UserCancelled,
    },
    {
      tc: 'rejected action',
      input: Object.assign(new Error('error'), {
        code: 'Method_PermissionsNotGranted',
      }),
      code: ErrorCode.UserRejected,
    },
    {
      tc: 'timeout',
      input: Object.assign(new Error('error'), {
        code: 'Init_IframeTimeout',
      }),
      code: ErrorCode.ConnectionTimeout,
    },
  ])('maps $tc to HardwareWalletError', ({ input, code }) => {
    let thrownError: unknown;
    try {
      handleTrezorTransportError(input, fallbackMessage);
    } catch (error) {
      thrownError = error;
    }

    expect(thrownError).toBeInstanceOf(HardwareWalletError);
    expect((thrownError as HardwareWalletError).code).toBe(code);
  });

  it('prioritizes machine-readable code when present', () => {
    const error = new Error('error') as Error & { code: string };
    error.code = 'Method_PermissionsNotGranted';

    let thrownError: unknown;
    try {
      handleTrezorTransportError(error, fallbackMessage);
    } catch (error_) {
      thrownError = error_;
    }

    expect(thrownError).toBeInstanceOf(HardwareWalletError);
    expect((thrownError as HardwareWalletError).code).toBe(
      ErrorCode.UserRejected,
    );
  });

  it('uses error name as fallback identifier when code is absent', () => {
    const error = new Error('error');
    error.name = 'Device_Disconnected';

    let thrownError: unknown;
    try {
      handleTrezorTransportError(error, fallbackMessage);
    } catch (error_) {
      thrownError = error_;
    }

    expect(thrownError).toBeInstanceOf(HardwareWalletError);
    expect((thrownError as HardwareWalletError).code).toBe(
      ErrorCode.DeviceDisconnected,
    );
  });

  it('passes through HardwareWalletError instances unchanged', () => {
    const originalError = new HardwareWalletError('original', {
      code: ErrorCode.UserRejected,
      severity: Severity.Warning,
      category: Category.UserAction,
      userMessage: 'original',
    });

    let thrownError: unknown;
    try {
      handleTrezorTransportError(originalError, fallbackMessage);
    } catch (error) {
      thrownError = error;
    }

    expect(thrownError).toBe(originalError);
  });

  it('wraps unknown Error instances as ErrorCode.Unknown', () => {
    const originalError = new Error('Unexpected Trezor failure');

    let thrownError: unknown;
    try {
      handleTrezorTransportError(originalError, fallbackMessage);
    } catch (error) {
      thrownError = error;
    }

    expect(thrownError).toBeInstanceOf(HardwareWalletError);
    expect((thrownError as HardwareWalletError).code).toBe(ErrorCode.Unknown);
    expect((thrownError as HardwareWalletError).cause).toBe(originalError);
    expect((thrownError as HardwareWalletError).message).toBe(
      'Unexpected Trezor failure',
    );
  });

  it.each([
    {
      tc: 'user cancelled action message',
      input: new Error('User cancelled action'),
      code: ErrorCode.UserCancelled,
    },
    {
      tc: 'action cancelled by user message',
      input: new Error('Action cancelled by user'),
      code: ErrorCode.UserCancelled,
    },
    {
      tc: 'action canceled by user message',
      input: new Error('Action canceled by user'),
      code: ErrorCode.UserCancelled,
    },
    {
      tc: 'failure_actioncancelled message',
      input: new Error('failure_actioncancelled'),
      code: ErrorCode.UserCancelled,
    },
    {
      tc: 'user rejected message',
      input: new Error('User rejected the request'),
      code: ErrorCode.UserRejected,
    },
  ])('maps $tc to HardwareWalletError', ({ input, code }) => {
    let thrownError: unknown;
    try {
      handleTrezorTransportError(input, fallbackMessage);
    } catch (error) {
      thrownError = error;
    }

    expect(thrownError).toBeInstanceOf(HardwareWalletError);
    expect((thrownError as HardwareWalletError).code).toBe(code);
  });

  it('maps nested cancellation cause to UserCancelled', () => {
    const originalError = new Error('Wrapped error');
    Object.assign(originalError, {
      cause: new Error('Action cancelled by user'),
    });

    let thrownError: unknown;
    try {
      handleTrezorTransportError(originalError, fallbackMessage);
    } catch (error) {
      thrownError = error;
    }

    expect(thrownError).toBeInstanceOf(HardwareWalletError);
    expect((thrownError as HardwareWalletError).code).toBe(
      ErrorCode.UserCancelled,
    );
  });

  it('maps numeric error codes when present', () => {
    const error = new Error('error') as Error & { code: number };
    error.code = 4001;

    let thrownError: unknown;
    try {
      handleTrezorTransportError(error, fallbackMessage);
    } catch (error_) {
      thrownError = error_;
    }

    expect(thrownError).toBeInstanceOf(HardwareWalletError);
    expect((thrownError as HardwareWalletError).code).toBe(
      ErrorCode.UserCancelled,
    );
  });

  it('maps string rejection inputs to HardwareWalletError', () => {
    let thrownError: unknown;
    try {
      handleTrezorTransportError('User rejected the request', fallbackMessage);
    } catch (error) {
      thrownError = error;
    }

    expect(thrownError).toBeInstanceOf(HardwareWalletError);
    expect((thrownError as HardwareWalletError).code).toBe(
      ErrorCode.UserRejected,
    );
  });

  it.each([null, undefined, 'string error', { message: 'not an error' }])(
    'uses fallback for non-Error input: %p',
    (value) => {
      const throwingFunction = (): never =>
        handleTrezorTransportError(value, fallbackMessage);

      expect(throwingFunction).toThrow(HardwareWalletError);
      expect(throwingFunction).toThrow(fallbackMessage);
    },
  );

  it('has never return type', () => {
    type ReturnTypeIsNever =
      ReturnType<typeof handleTrezorTransportError> extends never
        ? true
        : false;

    const isNever: ReturnTypeIsNever = true;
    expect(isNever).toBe(true);
  });
});
