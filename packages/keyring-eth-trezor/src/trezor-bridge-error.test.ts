import { ErrorCode, HardwareWalletError } from '@metamask/hw-wallet-sdk';

import { createErrorFromTrezorResponse } from './trezor-bridge-error';

describe('createErrorFromTrezorResponse', () => {
  it('returns UserCancelled for cancellation messages', () => {
    const error = createErrorFromTrezorResponse({
      error: 'User cancelled action',
    });

    expect(error).toBeInstanceOf(HardwareWalletError);
    expect(error.code).toBe(ErrorCode.UserCancelled);
    expect(error.userMessage).toBe(
      'Action was cancelled on your Trezor device.',
    );
  });

  it('returns mapped error when payload code is present', () => {
    const error = createErrorFromTrezorResponse({
      error: 'User cancelled action',
      code: 'Method_Cancel',
    });

    expect(error).toBeInstanceOf(HardwareWalletError);
    expect(error.code).toBe(ErrorCode.UserCancelled);
  });

  it('returns Unknown for non-cancellation message-only failures', () => {
    const error = createErrorFromTrezorResponse({
      error: 'Trezor device disconnected',
    });

    expect(error).toBeInstanceOf(HardwareWalletError);
    expect(error.code).toBe(ErrorCode.Unknown);
    expect(error.message).toBe('Trezor device disconnected');
  });

  it('returns Unknown when payload is undefined', () => {
    const error = createErrorFromTrezorResponse(undefined);

    expect(error).toBeInstanceOf(HardwareWalletError);
    expect(error.code).toBe(ErrorCode.Unknown);
    expect(error.message).toBe('Unknown error');
  });

  it('returns Unknown when payload has no error field', () => {
    const error = createErrorFromTrezorResponse({});

    expect(error).toBeInstanceOf(HardwareWalletError);
    expect(error.code).toBe(ErrorCode.Unknown);
    expect(error.message).toBe('Unknown error');
  });
});
