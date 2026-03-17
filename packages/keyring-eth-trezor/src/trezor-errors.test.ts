import {
  Category,
  ErrorCode,
  HardwareWalletError,
  Severity,
  TREZOR_ERROR_MAPPINGS,
} from '@metamask/hw-wallet-sdk';

import {
  createTrezorError,
  getTrezorErrorMapping,
  isKnownTrezorError,
} from './trezor-errors';

describe('trezor-errors', () => {
  describe('isKnownTrezorError', () => {
    it('returns true for known identifiers', () => {
      expect(isKnownTrezorError('Device_Disconnected')).toBe(true);
      expect(isKnownTrezorError('Method_Cancel')).toBe(true);
    });

    it('returns false for unknown identifiers', () => {
      expect(isKnownTrezorError('unknownIdentifier')).toBe(false);
    });
  });

  describe('getTrezorErrorMapping', () => {
    it('maps all TREZOR_ERROR_MAPPINGS error codes', () => {
      for (const identifier of Object.keys(TREZOR_ERROR_MAPPINGS)) {
        expect(getTrezorErrorMapping(identifier)).toBeDefined();
      }
    });

    it('returns mapping for known identifiers', () => {
      expect(getTrezorErrorMapping('Init_IframeTimeout')).toMatchObject({
        code: ErrorCode.ConnectionTimeout,
        severity: Severity.Err,
        category: Category.Connection,
      });
    });

    it('returns undefined for unknown identifiers', () => {
      expect(getTrezorErrorMapping('not-real')).toBeUndefined();
    });
  });

  describe('createTrezorError', () => {
    it('creates typed errors for known identifiers', () => {
      const error = createTrezorError('Transport_Missing');

      expect(error).toBeInstanceOf(HardwareWalletError);
      expect(error.code).toBe(ErrorCode.ConnectionTransportMissing);
      expect(error.severity).toBe(Severity.Err);
      expect(error.category).toBe(Category.Connection);
    });

    it('appends context to the error message', () => {
      const error = createTrezorError('Method_Cancel', 'during sign operation');
      expect(error.message).toContain('(during sign operation)');
    });

    it('falls back to ErrorCode.Unknown for unknown identifiers', () => {
      const error = createTrezorError('not-real', 'while testing');
      expect(error).toBeInstanceOf(HardwareWalletError);
      expect(error.code).toBe(ErrorCode.Unknown);
      expect(error.category).toBe(Category.Unknown);
      expect(error.userMessage).toBe(
        'Unknown Trezor error: not-real (while testing)',
      );
    });
  });
});
