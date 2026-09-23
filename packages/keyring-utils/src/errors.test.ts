import { toErrorMessage, toAccountsFailures } from './errors';

describe('toErrorMessage', () => {
  it('returns the message for an Error instance', () => {
    expect(toErrorMessage(new Error('something went wrong'))).toBe(
      'something went wrong',
    );
  });

  it('returns the message for a subclass of Error', () => {
    class CustomError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'CustomError';
      }
    }

    expect(toErrorMessage(new CustomError('custom failure'))).toBe(
      'custom failure',
    );
  });

  it('converts a string to itself', () => {
    expect(toErrorMessage('string error')).toBe('string error');
  });

  it('converts a number to a string', () => {
    expect(toErrorMessage(42)).toBe('42');
  });

  it('converts null to "null"', () => {
    expect(toErrorMessage(null)).toBe('null');
  });

  it('converts undefined to "undefined"', () => {
    expect(toErrorMessage(undefined)).toBe('undefined');
  });

  it('converts an object to a string representation', () => {
    expect(toErrorMessage({ code: 500 })).toBe('[object Object]');
  });
});

describe('toAccountsFailures', () => {
  it('returns undefined when all results are fulfilled', () => {
    const ids = ['account-1', 'account-2'] as never[];
    const results = [
      { status: 'fulfilled', value: undefined },
      { status: 'fulfilled', value: undefined },
    ] as PromiseSettledResult<unknown>[];

    expect(toAccountsFailures(ids, results)).toBeUndefined();
  });

  it('collects error messages for rejected results', () => {
    const ids = ['account-1', 'account-2'] as never[];
    const results = [
      { status: 'fulfilled', value: undefined },
      { status: 'rejected', reason: new Error('not found') },
    ] as PromiseSettledResult<unknown>[];

    expect(toAccountsFailures(ids, results)).toStrictEqual({
      'account-2': 'not found',
    });
  });

  it('collects multiple failures', () => {
    const ids = ['account-1', 'account-2'] as never[];
    const results = [
      { status: 'rejected', reason: new Error('permission denied') },
      { status: 'rejected', reason: 'string error' },
    ] as PromiseSettledResult<unknown>[];

    expect(toAccountsFailures(ids, results)).toStrictEqual({
      'account-1': 'permission denied',
      'account-2': 'string error',
    });
  });

  it('handles non-Error rejection reasons', () => {
    const ids = ['account-1'] as never[];
    const results = [
      { status: 'rejected', reason: 42 },
    ] as PromiseSettledResult<unknown>[];

    expect(toAccountsFailures(ids, results)).toStrictEqual({
      'account-1': '42',
    });
  });

  it('returns undefined for empty inputs', () => {
    expect(toAccountsFailures([], [])).toBeUndefined();
  });
});
