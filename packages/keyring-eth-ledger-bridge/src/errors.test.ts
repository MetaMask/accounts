import {
  ErrorCode as ErrorCodeEnum,
  Severity as SeverityEnum,
  Category as CategoryEnum,
  RetryStrategy as RetryStrategyEnum,
  HardwareWalletError,
} from '@metamask/keyring-utils';

import {
  createLedgerError,
  isKnownLedgerError,
  getLedgerErrorMapping,
} from './errors';

describe('createLedgerError', () => {
  it('should create a HardwareWalletError from a known error code', () => {
    const error = createLedgerError('0x6985');

    expect(error).toBeInstanceOf(HardwareWalletError);
    expect(error.message).toContain('User rejected');
    expect(error.code).toBe(ErrorCodeEnum.USER_CANCEL_001);
  });

  it('should create a HardwareWalletError with context', () => {
    const error = createLedgerError('0x6985', 'during transaction signing');

    expect(error).toBeInstanceOf(HardwareWalletError);
    expect(error.message).toContain('User rejected');
    expect(error.message).toContain('(during transaction signing)');
  });

  it('should create a fallback error for unknown error codes without context', () => {
    const error = createLedgerError('0x9999');

    expect(error).toBeInstanceOf(HardwareWalletError);
    expect(error.message).toBe('Unknown Ledger error: 0x9999');
    expect(error.code).toBe(ErrorCodeEnum.UNKNOWN_001);
    expect(error.severity).toBe(SeverityEnum.ERROR);
    expect(error.category).toBe(CategoryEnum.UNKNOWN);
    expect(error.retryStrategy).toBe(RetryStrategyEnum.NO_RETRY);
  });

  it('should create a fallback error for unknown error codes with context', () => {
    const error = createLedgerError('0x9999', 'while doing something');

    expect(error).toBeInstanceOf(HardwareWalletError);
    expect(error.message).toBe(
      'Unknown Ledger error: 0x9999 (while doing something)',
    );
    expect(error.code).toBe(ErrorCodeEnum.UNKNOWN_001);
  });
});

describe('isKnownLedgerError', () => {
  it('should return true for known error codes', () => {
    expect(isKnownLedgerError('0x6985')).toBe(true);
    expect(isKnownLedgerError('0x5515')).toBe(true);
    expect(isKnownLedgerError('0x6a80')).toBe(true);
  });

  it('should return false for unknown error codes', () => {
    expect(isKnownLedgerError('0x9999')).toBe(false);
    expect(isKnownLedgerError('0x0000')).toBe(false);
  });
});

describe('getLedgerErrorMapping', () => {
  it('should return error mapping for known error codes', () => {
    const mapping = getLedgerErrorMapping('0x6985');

    expect(mapping).toBeDefined();
    expect(mapping?.customCode).toBe(ErrorCodeEnum.USER_CANCEL_001);
    expect(mapping?.message).toContain('User rejected');
  });

  it('should return undefined for unknown error codes', () => {
    const mapping = getLedgerErrorMapping('0x9999');

    expect(mapping).toBeUndefined();
  });
});
