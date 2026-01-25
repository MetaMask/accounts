import {
  HardwareWalletError,
  ErrorCode as ErrorCodeEnum,
} from '@metamask/hw-wallet-sdk';

import {
  createLedgerError,
  isKnownLedgerError,
  getLedgerErrorMapping,
} from './errors';

describe('createLedgerError', () => {
  describe('known error codes', () => {
    it('creates HardwareWalletError for user rejection (0x6985)', () => {
      const error = createLedgerError('0x6985');

      expect(error).toBeInstanceOf(HardwareWalletError);
      expect(error.code).toBe(ErrorCodeEnum.UserRejected);
      expect(error.message).toBe('User rejected action on device');
    });

    it('creates HardwareWalletError for device locked (0x5515)', () => {
      const error = createLedgerError('0x5515');

      expect(error).toBeInstanceOf(HardwareWalletError);
      expect(error.code).toBe(ErrorCodeEnum.AuthenticationDeviceLocked);
      expect(error.message).toBe('Device is locked');
    });

    it('includes context in message when provided', () => {
      const error = createLedgerError('0x6985', 'during sign transaction');

      expect(error.message).toBe(
        'User rejected action on device (during sign transaction)',
      );
    });

    it('uses error message as userMessage when userMessage is not provided in mapping', () => {
      // 0x9000 is success code which doesn't have a userMessage in the mapping
      const error = createLedgerError('0x9000');

      expect(error).toBeInstanceOf(HardwareWalletError);
      // userMessage should fallback to the message
      expect(error.userMessage).toBeDefined();
    });
  });

  describe('unknown error codes', () => {
    it('creates fallback error for unknown code without context', () => {
      const error = createLedgerError('0x9999');

      expect(error).toBeInstanceOf(HardwareWalletError);
      expect(error.code).toBe(ErrorCodeEnum.Unknown);
      expect(error.message).toBe('Unknown Ledger error: 0x9999');
    });

    it('creates fallback error for unknown code with context', () => {
      const error = createLedgerError('0x9999', 'during operation');

      expect(error).toBeInstanceOf(HardwareWalletError);
      expect(error.code).toBe(ErrorCodeEnum.Unknown);
      expect(error.message).toBe(
        'Unknown Ledger error: 0x9999 (during operation)',
      );
    });
  });
});

describe('isKnownLedgerError', () => {
  it('returns true for known error codes', () => {
    expect(isKnownLedgerError('0x6985')).toBe(true);
    expect(isKnownLedgerError('0x5515')).toBe(true);
    expect(isKnownLedgerError('0x6a80')).toBe(true);
  });

  it('returns false for unknown error codes', () => {
    expect(isKnownLedgerError('0x9999')).toBe(false);
    expect(isKnownLedgerError('invalid')).toBe(false);
    expect(isKnownLedgerError('')).toBe(false);
  });
});

describe('getLedgerErrorMapping', () => {
  it('returns mapping for known error codes', () => {
    const mapping = getLedgerErrorMapping('0x6985');

    expect(mapping).toBeDefined();
    expect(mapping?.code).toBe(ErrorCodeEnum.UserRejected);
    expect(mapping?.message).toBe('User rejected action on device');
  });

  it('returns undefined for unknown error codes', () => {
    const mapping = getLedgerErrorMapping('0x9999');

    expect(mapping).toBeUndefined();
  });
});
