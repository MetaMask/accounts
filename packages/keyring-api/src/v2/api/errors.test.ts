import { DeleteAccountsError } from './errors';

describe('DeleteAccountsError', () => {
  describe('constructor', () => {
    it('creates an error with the correct name', () => {
      const error = new DeleteAccountsError({
        '49116980-0712-4fa5-b045-e4294f1d440e': 'Account not found',
      });

      expect(error.name).toBe('DeleteAccountsError');
    });

    it('creates an error with a stable message', () => {
      const error = new DeleteAccountsError({
        '49116980-0712-4fa5-b045-e4294f1d440e': 'Account not found',
        '46b5ccd3-4786-427c-89d2-cef626dffe9b': 'Permission denied',
      });

      expect(error.message).toBe('Failed to delete one or more accounts');
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

      expect(error.message).toBe('Failed to delete one or more accounts');
    });

    it('is an instance of Error', () => {
      const error = new DeleteAccountsError({
        '49116980-0712-4fa5-b045-e4294f1d440e': 'Account not found',
      });

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(DeleteAccountsError);
    });

    it('handles an empty failures map', () => {
      const error = new DeleteAccountsError({});

      expect(error.failures).toStrictEqual({});
      expect(error.message).toBe('Failed to delete one or more accounts');
    });
  });
});
