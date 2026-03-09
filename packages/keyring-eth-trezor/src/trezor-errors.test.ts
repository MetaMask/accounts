import {
  Category,
  ErrorCode,
  HardwareWalletError,
  Severity,
} from '@metamask/hw-wallet-sdk';
import { ERRORS } from '@trezor/connect-web';

import {
  createTrezorError,
  getTrezorErrorIdentifier,
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
      expect(isKnownTrezorError('')).toBe(false);
    });
  });

  describe('getTrezorErrorMapping', () => {
    it('maps all current TrezorConnect error codes', () => {
      for (const identifier of Object.keys(ERRORS.ERROR_CODES)) {
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

  describe('getTrezorErrorIdentifier', () => {
    it('returns undefined for empty values', () => {
      expect(getTrezorErrorIdentifier(undefined)).toBeUndefined();
      expect(getTrezorErrorIdentifier('')).toBeUndefined();
    });

    it('matches known identifiers case-insensitively', () => {
      expect(getTrezorErrorIdentifier('Device_Disconnected')).toBe(
        'Device_Disconnected',
      );
      expect(getTrezorErrorIdentifier('DEVice_disconnected')).toBe(
        'Device_Disconnected',
      );
    });

    it('maps sdk messages to identifiers', () => {
      expect(getTrezorErrorIdentifier('Device disconnected')).toBe(
        'Device_Disconnected',
      );
    });

    it('does not resolve removed legacy identifiers', () => {
      expect(getTrezorErrorIdentifier('deviceDisconnected')).toBeUndefined();
      expect(getTrezorErrorIdentifier('connectionTimeout')).toBeUndefined();
    });
  });

  describe('createTrezorError', () => {
    it('creates typed errors for known identifiers', () => {
      const cause = new Error('underlying');
      const error = createTrezorError('Transport_Missing', undefined, cause);

      expect(error).toBeInstanceOf(HardwareWalletError);
      expect(error.code).toBe(ErrorCode.ConnectionTransportMissing);
      expect(error.severity).toBe(Severity.Err);
      expect(error.category).toBe(Category.Connection);
      expect(error.cause).toBe(cause);
    });

    it('appends context when it differs from mapped message', () => {
      const error = createTrezorError('Method_Cancel', 'during sign operation');
      expect(error.message).toContain('(during sign operation)');
    });

    it('does not append context when it only repeats mapped message casing/spacing', () => {
      const error = createTrezorError(
        'Method_Cancel',
        '  USER CANCELLED ACTION ON TREZOR DEVICE  ',
      );
      expect(error.message).toBe('User cancelled action on Trezor device');
    });

    it('falls back to ErrorCode.Unknown for unknown identifiers', () => {
      const cause = new Error('unknown cause');
      const error = createTrezorError('not-real', 'while testing', cause);
      expect(error).toBeInstanceOf(HardwareWalletError);
      expect(error.code).toBe(ErrorCode.Unknown);
      expect(error.category).toBe(Category.Unknown);
      expect(error.userMessage).toBe(
        'Unknown Trezor error: not-real (while testing)',
      );
      expect(error.cause).toBe(cause);
    });
  });
});
