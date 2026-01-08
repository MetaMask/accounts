import {
  ErrorCode as ErrorCodeEnum,
  Severity as SeverityEnum,
  Category as CategoryEnum,
  RetryStrategy as RetryStrategyEnum,
} from '@metamask/keyring-utils';

import {
  LedgerHardwareWalletError,
  createLedgerError,
  isKnownLedgerError,
  getLedgerErrorMapping,
} from './errors';

describe('LedgerHardwareWalletError', () => {
  describe('constructor', () => {
    it('should create an error with all properties', () => {
      const error = new LedgerHardwareWalletError('Test error', {
        code: ErrorCodeEnum.USER_CANCEL_001,
        severity: SeverityEnum.ERROR,
        category: CategoryEnum.USER_ACTION,
        retryStrategy: RetryStrategyEnum.NO_RETRY,
        ledgerCode: '0x6985',
      });

      expect(error).toBeInstanceOf(LedgerHardwareWalletError);
      expect(error.message).toBe('Test error');
      expect(error.code).toBe(ErrorCodeEnum.USER_CANCEL_001);
      expect(error.severity).toBe(SeverityEnum.ERROR);
      expect(error.category).toBe(CategoryEnum.USER_ACTION);
      expect(error.retryStrategy).toBe(RetryStrategyEnum.NO_RETRY);
      expect(error.ledgerCode).toBe('0x6985');
      expect(error.name).toBe('LedgerHardwareWalletError');
    });

    it('should create an error with a cause', () => {
      const cause = new Error('Original error');
      const error = new LedgerHardwareWalletError('Test error', {
        code: ErrorCodeEnum.UNKNOWN_001,
        severity: SeverityEnum.ERROR,
        category: CategoryEnum.UNKNOWN,
        retryStrategy: RetryStrategyEnum.NO_RETRY,
        cause,
      });

      expect(error.cause).toBe(cause);
    });

    it('should create an error without ledgerCode', () => {
      const error = new LedgerHardwareWalletError('Test error', {
        code: ErrorCodeEnum.UNKNOWN_001,
        severity: SeverityEnum.ERROR,
        category: CategoryEnum.UNKNOWN,
        retryStrategy: RetryStrategyEnum.NO_RETRY,
      });

      expect(error.ledgerCode).toBeUndefined();
    });
  });

  describe('withIncrementedRetryCount', () => {
    it('should create a new error instance with the same properties', () => {
      const originalError = new LedgerHardwareWalletError('Test error', {
        code: ErrorCodeEnum.AUTH_LOCK_001,
        severity: SeverityEnum.ERROR,
        category: CategoryEnum.AUTHENTICATION,
        retryStrategy: RetryStrategyEnum.RETRY,
        ledgerCode: '0x5515',
      });

      const newError = originalError.withIncrementedRetryCount();

      expect(newError).toBeInstanceOf(LedgerHardwareWalletError);
      expect(newError).not.toBe(originalError);
      expect(newError.message).toBe(originalError.message);
      expect(newError.code).toBe(originalError.code);
      expect(newError.severity).toBe(originalError.severity);
      expect(newError.category).toBe(originalError.category);
      expect(newError.retryStrategy).toBe(originalError.retryStrategy);
      expect(newError.ledgerCode).toBe(originalError.ledgerCode);
    });

    it('should preserve the cause when creating a new error', () => {
      const cause = new Error('Original cause');
      const originalError = new LedgerHardwareWalletError('Test error', {
        code: ErrorCodeEnum.AUTH_LOCK_001,
        severity: SeverityEnum.ERROR,
        category: CategoryEnum.AUTHENTICATION,
        retryStrategy: RetryStrategyEnum.RETRY,
        cause,
        ledgerCode: '0x5515',
      });

      const newError = originalError.withIncrementedRetryCount();

      expect(newError.cause).toBe(cause);
    });

    it('should handle error without cause', () => {
      const originalError = new LedgerHardwareWalletError('Test error', {
        code: ErrorCodeEnum.AUTH_LOCK_001,
        severity: SeverityEnum.ERROR,
        category: CategoryEnum.AUTHENTICATION,
        retryStrategy: RetryStrategyEnum.RETRY,
        ledgerCode: '0x5515',
      });

      const newError = originalError.withIncrementedRetryCount();

      expect(newError.cause).toBeUndefined();
    });
  });

  describe('withMetadata', () => {
    it('should create a new error instance with the same properties', () => {
      const originalError = new LedgerHardwareWalletError('Test error', {
        code: ErrorCodeEnum.AUTH_LOCK_001,
        severity: SeverityEnum.ERROR,
        category: CategoryEnum.AUTHENTICATION,
        retryStrategy: RetryStrategyEnum.RETRY,
        ledgerCode: '0x5515',
      });

      const metadata = { additionalInfo: 'test data' };
      const newError = originalError.withMetadata(metadata);

      expect(newError).toBeInstanceOf(LedgerHardwareWalletError);
      expect(newError).not.toBe(originalError);
      expect(newError.message).toBe(originalError.message);
      expect(newError.code).toBe(originalError.code);
      expect(newError.severity).toBe(originalError.severity);
      expect(newError.category).toBe(originalError.category);
      expect(newError.retryStrategy).toBe(originalError.retryStrategy);
      expect(newError.ledgerCode).toBe(originalError.ledgerCode);
    });

    it('should preserve the cause when creating a new error', () => {
      const cause = new Error('Original cause');
      const originalError = new LedgerHardwareWalletError('Test error', {
        code: ErrorCodeEnum.AUTH_LOCK_001,
        severity: SeverityEnum.ERROR,
        category: CategoryEnum.AUTHENTICATION,
        retryStrategy: RetryStrategyEnum.RETRY,
        cause,
        ledgerCode: '0x5515',
      });

      const metadata = { additionalInfo: 'test data' };
      const newError = originalError.withMetadata(metadata);

      expect(newError.cause).toBe(cause);
    });

    it('should handle error without cause', () => {
      const originalError = new LedgerHardwareWalletError('Test error', {
        code: ErrorCodeEnum.AUTH_LOCK_001,
        severity: SeverityEnum.ERROR,
        category: CategoryEnum.AUTHENTICATION,
        retryStrategy: RetryStrategyEnum.RETRY,
        ledgerCode: '0x5515',
      });

      const metadata = { additionalInfo: 'test data' };
      const newError = originalError.withMetadata(metadata);

      expect(newError.cause).toBeUndefined();
    });
  });

  describe('toJSON', () => {
    it('should serialize the error to JSON including ledgerCode', () => {
      const error = new LedgerHardwareWalletError('Test error', {
        code: ErrorCodeEnum.USER_CANCEL_001,
        severity: SeverityEnum.ERROR,
        category: CategoryEnum.USER_ACTION,
        retryStrategy: RetryStrategyEnum.NO_RETRY,
        ledgerCode: '0x6985',
      });

      const json = error.toJSON();

      expect(json).toHaveProperty('ledgerCode', '0x6985');
      expect(json).toHaveProperty('message', 'Test error');
      expect(json).toHaveProperty('code', ErrorCodeEnum.USER_CANCEL_001);
    });

    it('should serialize the error to JSON without ledgerCode when not provided', () => {
      const error = new LedgerHardwareWalletError('Test error', {
        code: ErrorCodeEnum.UNKNOWN_001,
        severity: SeverityEnum.ERROR,
        category: CategoryEnum.UNKNOWN,
        retryStrategy: RetryStrategyEnum.NO_RETRY,
      });

      const json = error.toJSON();

      expect(json).toHaveProperty('ledgerCode', undefined);
      expect(json).toHaveProperty('message', 'Test error');
    });
  });
});

describe('createLedgerError', () => {
  it('should create a LedgerHardwareWalletError from a known error code', () => {
    const error = createLedgerError('0x6985');

    expect(error).toBeInstanceOf(LedgerHardwareWalletError);
    expect(error.message).toContain('User rejected');
    expect(error.ledgerCode).toBe('0x6985');
    expect(error.code).toBe(ErrorCodeEnum.USER_CANCEL_001);
  });

  it('should create a LedgerHardwareWalletError with context', () => {
    const error = createLedgerError('0x6985', 'during transaction signing');

    expect(error).toBeInstanceOf(LedgerHardwareWalletError);
    expect(error.message).toContain('User rejected');
    expect(error.message).toContain('(during transaction signing)');
    expect(error.ledgerCode).toBe('0x6985');
  });

  it('should create a fallback error for unknown error codes without context', () => {
    const error = createLedgerError('0x9999');

    expect(error).toBeInstanceOf(LedgerHardwareWalletError);
    expect(error.message).toBe('Unknown Ledger error: 0x9999');
    expect(error.ledgerCode).toBe('0x9999');
    expect(error.code).toBe(ErrorCodeEnum.UNKNOWN_001);
    expect(error.severity).toBe(SeverityEnum.ERROR);
    expect(error.category).toBe(CategoryEnum.UNKNOWN);
    expect(error.retryStrategy).toBe(RetryStrategyEnum.NO_RETRY);
  });

  it('should create a fallback error for unknown error codes with context', () => {
    const error = createLedgerError('0x9999', 'while doing something');

    expect(error).toBeInstanceOf(LedgerHardwareWalletError);
    expect(error.message).toBe(
      'Unknown Ledger error: 0x9999 (while doing something)',
    );
    expect(error.ledgerCode).toBe('0x9999');
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
