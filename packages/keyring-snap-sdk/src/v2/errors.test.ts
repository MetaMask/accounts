import { DeleteAccountsSnapError } from './errors';

describe('DeleteAccountsSnapError', () => {
  it('creates an error with the correct message', () => {
    const error = new DeleteAccountsSnapError({
      '49116980-0712-4fa5-b045-e4294f1d440e': 'Account not found',
      '46b5ccd3-4786-427c-89d2-cef626dffe9b': 'Permission denied',
    });

    expect(error.message).toBe(
      'Failed to delete 2 account(s): 49116980-0712-4fa5-b045-e4294f1d440e, 46b5ccd3-4786-427c-89d2-cef626dffe9b',
    );
  });

  it('stores the failures in the error data', () => {
    const failures = {
      '49116980-0712-4fa5-b045-e4294f1d440e': 'Account not found',
    };

    const error = new DeleteAccountsSnapError(failures);

    expect(error.data).toStrictEqual({
      failures,
    });
  });

  it('serializes correctly for the Snap boundary', () => {
    const failures = {
      '49116980-0712-4fa5-b045-e4294f1d440e': 'Account not found',
    };

    const error = new DeleteAccountsSnapError(failures);
    const serialized = error.serialize();

    expect(serialized.code).toBe(-31002);
    expect(serialized.message).toBe('Snap Error');
    expect(serialized.data).toMatchObject({
      cause: {
        data: {
          failures,
        },
      },
    });
  });

  it('handles a single failure', () => {
    const error = new DeleteAccountsSnapError({
      '49116980-0712-4fa5-b045-e4294f1d440e': 'Account not found',
    });

    expect(error.message).toBe(
      'Failed to delete 1 account(s): 49116980-0712-4fa5-b045-e4294f1d440e',
    );
  });

  it('handles an empty failures map', () => {
    const error = new DeleteAccountsSnapError({});

    expect(error.message).toBe('Failed to delete 0 account(s): ');
  });
});
