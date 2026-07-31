import { HardwareWalletError } from './hardware-error';
import { ErrorCode, Severity, Category } from './hardware-errors-enums';
import {
  isUserRejectionLikeError,
  resolveUserRejectionErrorCode,
} from './user-rejection';

describe('isUserRejectionLikeError', () => {
  it.each([
    'User rejected the request',
    'Action cancelled by user',
    'Action canceled by user',
    'failure_actioncancelled',
    'User cancelled action',
  ])('returns true for rejection string: %s', (message) => {
    expect(isUserRejectionLikeError(message)).toBe(true);
  });

  it('returns true for code 4001', () => {
    expect(isUserRejectionLikeError({ code: 4001 })).toBe(true);
  });

  it('returns false for HardwareWalletError ConnectionClosed', () => {
    const error = new HardwareWalletError('Connection closed', {
      code: ErrorCode.ConnectionClosed,
      severity: Severity.Warning,
      category: Category.Connection,
      userMessage: 'Connection closed',
    });

    expect(isUserRejectionLikeError(error)).toBe(false);
    expect(resolveUserRejectionErrorCode(error)).toBeUndefined();
  });

  it('returns false for serialized HardwareWalletError ConnectionClosed', () => {
    expect(
      isUserRejectionLikeError({
        name: 'HardwareWalletError',
        code: ErrorCode.ConnectionClosed,
        message: 'Connection closed',
      }),
    ).toBe(false);
  });

  it('returns true for nested cause', () => {
    expect(
      isUserRejectionLikeError({
        message: 'Wrapped error',
        cause: new Error('Action cancelled by user'),
      }),
    ).toBe(true);
  });

  it('returns true for nested originalError', () => {
    expect(
      isUserRejectionLikeError({
        message: 'Wrapped error',
        originalError: new Error('User rejected the request'),
      }),
    ).toBe(true);
  });

  it('returns false for non-rejection errors', () => {
    expect(isUserRejectionLikeError(new Error('Device disconnected'))).toBe(
      false,
    );
    expect(
      isUserRejectionLikeError({ code: 1234, message: 'Something else' }),
    ).toBe(false);
  });

  it('returns false for circular references', () => {
    const circularError: { message: string; cause?: unknown } = {
      message: 'Something else',
    };
    circularError.cause = circularError;

    expect(isUserRejectionLikeError(circularError)).toBe(false);
  });
});

describe('resolveUserRejectionErrorCode', () => {
  it.each([
    ['Action cancelled by user', ErrorCode.UserCancelled],
    ['Action canceled by user', ErrorCode.UserCancelled],
    ['User cancelled action', ErrorCode.UserCancelled],
    ['failure_actioncancelled', ErrorCode.UserCancelled],
    ['User rejected the request', ErrorCode.UserRejected],
    ['Permission not granted on device', ErrorCode.UserRejected],
  ])('maps %s to %s', (message, expectedCode) => {
    expect(resolveUserRejectionErrorCode(message)).toBe(expectedCode);
    expect(resolveUserRejectionErrorCode(new Error(message))).toBe(
      expectedCode,
    );
  });

  it('maps code 4001 to UserCancelled by default', () => {
    expect(resolveUserRejectionErrorCode({ code: 4001 })).toBe(
      ErrorCode.UserCancelled,
    );
  });

  it('maps Method_PermissionsNotGranted code on error object to UserRejected', () => {
    const error = new Error('error') as Error & { code: string };
    error.code = 'Method_PermissionsNotGranted';

    expect(resolveUserRejectionErrorCode(error)).toBe(ErrorCode.UserRejected);
  });

  it('maps Method_Cancel code on error object to UserCancelled', () => {
    const error = new Error('error') as Error & { code: string };
    error.code = 'Method_Cancel';

    expect(resolveUserRejectionErrorCode(error)).toBe(ErrorCode.UserCancelled);
  });

  it('returns undefined for non-rejection errors', () => {
    expect(
      resolveUserRejectionErrorCode(new Error('Device disconnected')),
    ).toBeUndefined();
    expect(
      resolveUserRejectionErrorCode({ code: 1234, message: 'Something else' }),
    ).toBeUndefined();
  });

  it('resolves nested cause to UserCancelled', () => {
    expect(
      resolveUserRejectionErrorCode({
        message: 'Wrapped error',
        cause: new Error('Action cancelled by user'),
      }),
    ).toBe(ErrorCode.UserCancelled);
  });

  it('resolves nested originalError to UserRejected', () => {
    expect(
      resolveUserRejectionErrorCode({
        message: 'Wrapped error',
        originalError: new Error('User rejected the request'),
      }),
    ).toBe(ErrorCode.UserRejected);
  });
});
