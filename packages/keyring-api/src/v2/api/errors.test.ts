import { DeleteAccountsError } from './errors';

describe('DeleteAccountsError', () => {
  describe('constructor', () => {
    it('creates an error with the correct name', () => {
      const error = new DeleteAccountsError({
        '49116980-0712-4fa5-b045-e4294f1d440e': 'Account not found',
      });

      expect(error.name).toBe('DeleteAccountsError');
    });

    it('creates an error with a descriptive message', () => {
      const error = new DeleteAccountsError({
        '49116980-0712-4fa5-b045-e4294f1d440e': 'Account not found',
        '46b5ccd3-4786-427c-89d2-cef626dffe9b': 'Permission denied',
      });

      expect(error.message).toBe(
        'Failed to delete 2 account(s): 49116980-0712-4fa5-b045-e4294f1d440e, 46b5ccd3-4786-427c-89d2-cef626dffe9b',
      );
    });

    it('stores the failures map', () => {
      const failures = {
        '49116980-0712-4fa5-b045-e4294f1d440e': 'Account not found',
      };

      const error = new DeleteAccountsError(failures);

      expect(error.failures).toStrictEqual(failures);
    });

    it('handles a single failure', () => {
      const error = new DeleteAccountsError({
        '49116980-0712-4fa5-b045-e4294f1d440e': 'Account not found',
      });

      expect(error.message).toBe(
        'Failed to delete 1 account(s): 49116980-0712-4fa5-b045-e4294f1d440e',
      );
    });

    it('is an instance of Error', () => {
      const error = new DeleteAccountsError({
        '49116980-0712-4fa5-b045-e4294f1d440e': 'Account not found',
      });

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(DeleteAccountsError);
    });
  });

  describe('fromFailures', () => {
    it('creates a DeleteAccountsError from a failures map', () => {
      const failures = {
        '49116980-0712-4fa5-b045-e4294f1d440e': 'Account not found',
        '46b5ccd3-4786-427c-89d2-cef626dffe9b': 'Permission denied',
      };

      const error = DeleteAccountsError.fromFailures(failures);

      expect(error).toBeInstanceOf(DeleteAccountsError);
      expect(error.failures).toStrictEqual(failures);
      expect(error.message).toBe(
        'Failed to delete 2 account(s): 49116980-0712-4fa5-b045-e4294f1d440e, 46b5ccd3-4786-427c-89d2-cef626dffe9b',
      );
    });

    it('creates an error with an empty failures map', () => {
      const error = DeleteAccountsError.fromFailures({});

      expect(error.failures).toStrictEqual({});
      expect(error.message).toBe('Failed to delete 0 account(s): ');
    });
  });
});
