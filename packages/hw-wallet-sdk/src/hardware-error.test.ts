import { HardwareWalletError } from './hardware-error';
import { ErrorCode, Severity, Category } from './hardware-errors-enums';

describe('HardwareWalletError', () => {
  const mockOptions = {
    code: ErrorCode.UserRejected,
    severity: Severity.Warning,
    category: Category.UserAction,
    userMessage: 'Transaction was rejected',
  };

  describe('constructor', () => {
    it('creates an error with required properties', () => {
      const error = new HardwareWalletError('Test error', mockOptions);

      expect(error.message).toBe('Test error');
      expect(error.name).toBe('HardwareWalletError');
      expect(error.code).toBe(ErrorCode.UserRejected);
      expect(error.severity).toBe(Severity.Warning);
      expect(error.category).toBe(Category.UserAction);
      expect(error.userMessage).toBe('Transaction was rejected');
    });

    it('generates a unique error ID', () => {
      const error1 = new HardwareWalletError('Test error 1', mockOptions);
      const error2 = new HardwareWalletError('Test error 2', mockOptions);

      expect(error1.id).toBeDefined();
      expect(error2.id).toBeDefined();
      expect(error1.id).not.toBe(error2.id);
      expect(error1.id).toMatch(/^err_[a-z0-9]+_[a-z0-9]+$/u);
    });

    it('sets timestamp to current date', () => {
      const before = new Date();
      const error = new HardwareWalletError('Test error', mockOptions);
      const after = new Date();

      expect(error.timestamp.getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
      expect(error.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('sets optional properties when provided', () => {
      const cause = new Error('Original error');
      const metadata = { deviceId: '12345', attempt: 1 };

      const error = new HardwareWalletError('Test error', {
        ...mockOptions,
        cause,
        metadata,
      });

      expect(error.cause).toBe(cause);
      expect(error.metadata).toStrictEqual(metadata);
    });

    it('works with instanceof checks', () => {
      const error = new HardwareWalletError('Test error', mockOptions);
      expect(error instanceof HardwareWalletError).toBe(true);
      expect(error instanceof Error).toBe(true);
    });
  });

  describe('isCritical', () => {
    it('returns true for CRITICAL severity', () => {
      const error = new HardwareWalletError('Test error', {
        ...mockOptions,
        severity: Severity.Critical,
      });
      expect(error.isCritical()).toBe(true);
    });

    it('returns false for non-CRITICAL severity', () => {
      const severities = [Severity.Err, Severity.Warning, Severity.Info];
      severities.forEach((severity) => {
        const error = new HardwareWalletError('Test error', {
          ...mockOptions,
          severity,
        });
        expect(error.isCritical()).toBe(false);
      });
    });
  });

  describe('isWarning', () => {
    it('returns true for WARNING severity', () => {
      const error = new HardwareWalletError('Test error', {
        ...mockOptions,
        severity: Severity.Warning,
      });
      expect(error.isWarning()).toBe(true);
    });

    it('returns false for non-WARNING severity', () => {
      const severities = [Severity.Err, Severity.Critical, Severity.Info];
      severities.forEach((severity) => {
        const error = new HardwareWalletError('Test error', {
          ...mockOptions,
          severity,
        });
        expect(error.isWarning()).toBe(false);
      });
    });
  });

  describe('withMetadata', () => {
    it('creates a new error with additional metadata', () => {
      const originalMetadata = { deviceId: '12345' };
      const originalError = new HardwareWalletError('Test error', {
        ...mockOptions,
        metadata: originalMetadata,
      });

      const additionalMetadata = { attempt: 1, timestamp: Date.now() };
      const newError = originalError.withMetadata(additionalMetadata);

      expect(newError.metadata).toStrictEqual({
        ...originalMetadata,
        ...additionalMetadata,
      });
      expect(originalError.metadata).toStrictEqual(originalMetadata); // Original unchanged
      expect(newError).not.toBe(originalError); // New instance
    });

    it('creates metadata when original has none', () => {
      const originalError = new HardwareWalletError('Test error', mockOptions);
      const metadata = { deviceId: '12345' };
      const newError = originalError.withMetadata(metadata);

      expect(newError.metadata).toStrictEqual(metadata);
    });

    it('overrides existing metadata keys', () => {
      const originalError = new HardwareWalletError('Test error', {
        ...mockOptions,
        metadata: { key: 'old', other: 'value' },
      });

      const newError = originalError.withMetadata({ key: 'new' });

      expect(newError.metadata).toStrictEqual({ key: 'new', other: 'value' });
    });

    it('preserves all other properties', () => {
      const cause = new Error('Original error');

      const originalError = new HardwareWalletError('Test error', {
        ...mockOptions,
        cause,
      });

      const newError = originalError.withMetadata({ extra: 'data' });

      expect(newError.message).toBe(originalError.message);
      expect(newError.code).toBe(originalError.code);
      expect(newError.severity).toBe(originalError.severity);
      expect(newError.category).toBe(originalError.category);
      expect(newError.userMessage).toBe(originalError.userMessage);
      expect(newError.cause).toBe(originalError.cause);
    });
  });

  describe('toJSON', () => {
    it('serializes all properties to JSON', () => {
      const cause = new Error('Original error');
      const metadata = { deviceId: '12345' };

      const error = new HardwareWalletError('Test error', {
        ...mockOptions,
        cause,
        metadata,
      });

      const json = error.toJSON();

      expect(json.id).toBe(error.id);
      expect(json.name).toBe('HardwareWalletError');
      expect(json.message).toBe('Test error');
      expect(json.code).toBe(ErrorCode.UserRejected);
      expect(json.severity).toBe(Severity.Warning);
      expect(json.category).toBe(Category.UserAction);
      expect(json.userMessage).toBe('Transaction was rejected');
      expect(json.timestamp).toBe(error.timestamp.toISOString());
      expect(json.metadata).toStrictEqual(metadata);
    });

    it('serializes cause when present', () => {
      const cause = new Error('Original error');

      const error = new HardwareWalletError('Test error', {
        ...mockOptions,
        cause,
      });

      const json = error.toJSON();

      expect(json.cause).toStrictEqual({
        name: 'Error',
        message: 'Original error',
      });
    });

    it('does not include cause when not present', () => {
      const error = new HardwareWalletError('Test error', mockOptions);
      const json = error.toJSON();

      expect(json.cause).toBeUndefined();
    });

    it('handles undefined optional properties', () => {
      const error = new HardwareWalletError('Test error', mockOptions);
      const json = error.toJSON();

      expect(json.metadata).toBeUndefined();
      expect(json.cause).toBeUndefined();
    });
  });

  describe('toString', () => {
    it('returns a user-friendly string representation', () => {
      const error = new HardwareWalletError('Test error', mockOptions);
      const result = error.toString();

      expect(result).toBe(
        'HardwareWalletError [UserRejected:2000]: Test error',
      );
    });

    it('works with different error codes and messages', () => {
      const error = new HardwareWalletError('Internal error', {
        ...mockOptions,
        code: ErrorCode.Unknown,
        userMessage: 'An internal error occurred',
      });
      const result = error.toString();

      expect(result).toBe(
        'HardwareWalletError [Unknown:99999]: Internal error',
      );
    });

    it('falls back to UNKNOWN name for unmapped numeric codes', () => {
      const error = new HardwareWalletError('Weird error', {
        ...mockOptions,
        code: 123456 as unknown as ErrorCode,
        userMessage: 'Something strange happened',
      });

      expect(error.toString()).toBe(
        'HardwareWalletError [Unknown:123456]: Weird error',
      );
    });
  });

  describe('toDetailedString', () => {
    it('returns a detailed string with all information', () => {
      const error = new HardwareWalletError('Test error', {
        ...mockOptions,
      });

      const result = error.toDetailedString();

      expect(result).toContain('HardwareWalletError [UserRejected:2000]');
      expect(result).toContain(
        'HardwareWalletError [UserRejected:2000]: Test error',
      );
      expect(result).toContain('User Message: Transaction was rejected');
      expect(result).toContain('Severity: Warning');
      expect(result).toContain('Category: UserAction');
      expect(result).toContain('Timestamp:');
    });

    it('includes metadata when present', () => {
      const metadata = { deviceId: '12345', attempt: 1 };
      const error = new HardwareWalletError('Test error', {
        ...mockOptions,
        metadata,
      });

      const result = error.toDetailedString();
      expect(result).toContain('Metadata:');
      expect(result).toContain('"deviceId": "12345"');
      expect(result).toContain('"attempt": 1');
    });

    it('includes cause when present', () => {
      const cause = new Error('Original error');
      const error = new HardwareWalletError('Test error', {
        ...mockOptions,
        cause,
      });

      const result = error.toDetailedString();
      expect(result).toContain('Caused by: Original error');
    });

    it('does not include optional fields when not present', () => {
      const error = new HardwareWalletError('Test error', mockOptions);
      const result = error.toDetailedString();

      expect(result).not.toContain('Metadata:');
      expect(result).not.toContain('Caused by:');
    });

    it('does not include metadata section when metadata is empty', () => {
      const error = new HardwareWalletError('Test error', {
        ...mockOptions,
        metadata: {},
      });

      const result = error.toDetailedString();
      expect(result).not.toContain('Metadata:');
    });
  });

  describe('isHardwareWalletError', () => {
    it('returns true for HardwareWalletError instances', () => {
      const error = new HardwareWalletError('Test error', mockOptions);
      expect(HardwareWalletError.isHardwareWalletError(error)).toBe(true);
    });

    it('returns false for regular Error instances', () => {
      const error = new Error('Regular error');
      expect(HardwareWalletError.isHardwareWalletError(error)).toBe(false);
    });

    it('returns false for non-error values', () => {
      expect(HardwareWalletError.isHardwareWalletError(null)).toBe(false);
      expect(HardwareWalletError.isHardwareWalletError(undefined)).toBe(false);
      expect(HardwareWalletError.isHardwareWalletError('string')).toBe(false);
      expect(HardwareWalletError.isHardwareWalletError(123)).toBe(false);
      expect(HardwareWalletError.isHardwareWalletError({})).toBe(false);
    });
  });

  describe('error scenarios', () => {
    it('handles critical authentication errors', () => {
      const error = new HardwareWalletError('Device blocked', {
        code: ErrorCode.AuthenticationDeviceBlocked,
        severity: Severity.Critical,
        category: Category.Authentication,
        userMessage: 'Device is blocked due to too many failed attempts',
      });

      expect(error.isCritical()).toBe(true);
    });

    it('handles retryable connection errors', () => {
      const error = new HardwareWalletError('Connection timeout', {
        code: ErrorCode.ConnectionTimeout,
        severity: Severity.Err,
        category: Category.Connection,
        userMessage: 'Connection timed out',
      });

      expect(error.isCritical()).toBe(false);
    });

    it('handles user action warnings', () => {
      const error = new HardwareWalletError('User confirmation required', {
        code: ErrorCode.UserConfirmationRequired,
        severity: Severity.Warning,
        category: Category.UserAction,
        userMessage: 'Please confirm the action on your device',
      });

      expect(error.isWarning()).toBe(true);
      expect(error.isCritical()).toBe(false);
    });
  });
});
