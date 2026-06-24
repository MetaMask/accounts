import { createErrorFromTrezorResponse } from './trezor-bridge-error';

describe('createErrorFromTrezorResponse', () => {
  it('creates an error with the payload message', () => {
    const error = createErrorFromTrezorResponse({
      error: 'User cancelled action',
    });

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('User cancelled action');
    expect('code' in error).toBe(false);
  });

  it('attaches payload code when present', () => {
    const error = createErrorFromTrezorResponse({
      error: 'User cancelled action',
      code: 'Method_Cancel',
    }) as Error & { code?: string };

    expect(error.message).toBe('User cancelled action');
    expect(error.code).toBe('Method_Cancel');
  });

  it('uses Unknown error when payload is undefined', () => {
    const error = createErrorFromTrezorResponse(undefined);

    expect(error.message).toBe('Unknown error');
  });

  it('uses Unknown error when payload has no error field', () => {
    const error = createErrorFromTrezorResponse({});

    expect(error.message).toBe('Unknown error');
  });
});
