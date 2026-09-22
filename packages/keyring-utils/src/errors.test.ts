import { toErrorMessage } from './errors';

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
