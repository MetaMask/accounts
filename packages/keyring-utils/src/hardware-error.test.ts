import { HardwareWalletError } from './hardware-error';
import {
  ErrorCode,
  Severity,
  Category,
  RetryStrategy,
} from './hardware-errors-enums';

describe('HardwareWalletError', () => {
  const mockOptions = {
    code: ErrorCode.UserCancel001,
    severity: Severity.Warning,
    category: Category.UserAction,
    retryStrategy: RetryStrategy.Retry,
    userActionable: true,
    userMessage: 'Transaction was rejected',
  };

  describe('constructor', () => {
    it('should create an error with required properties', () => {
      const error = new HardwareWalletError('Test error', mockOptions);

      expect(error.message).toBe('Test error');
      expect(error.name).toBe('HardwareWalletError');
      expect(error.code).toBe(ErrorCode.UserCancel001);
      expect(error.severity).toBe(Severity.Warning);
      expect(error.category).toBe(Category.UserAction);
      expect(error.retryStrategy).toBe(RetryStrategy.Retry);
      expect(error.userActionable).toBe(true);
      expect(error.userMessage).toBe('Transaction was rejected');
    });

    it('should generate a unique error ID', () => {
      const error1 = new HardwareWalletError('Test error 1', mockOptions);
      const error2 = new HardwareWalletError('Test error 2', mockOptions);

      expect(error1.id).toBeDefined();
      expect(error2.id).toBeDefined();
      expect(error1.id).not.toBe(error2.id);
      expect(error1.id).toMatch(/^err_[a-z0-9]+_[a-z0-9]+$/u);
    });

    it('should set timestamp to current date', () => {
      const before = new Date();
      const error = new HardwareWalletError('Test error', mockOptions);
      const after = new Date();

      expect(error.timestamp.getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
      expect(error.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should set optional properties when provided', () => {
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

    it('should work with instanceof checks', () => {
      const error = new HardwareWalletError('Test error', mockOptions);
      expect(error instanceof HardwareWalletError).toBe(true);
      expect(error instanceof Error).toBe(true);
    });
  });

  describe('isRetryable', () => {
    it('should return true for RETRY strategy', () => {
      const error = new HardwareWalletError('Test error', {
        ...mockOptions,
        retryStrategy: RetryStrategy.Retry,
      });
      expect(error.isRetryable()).toBe(true);
    });

    it('should return true for EXPONENTIAL_BACKOFF strategy', () => {
      const error = new HardwareWalletError('Test error', {
        ...mockOptions,
        retryStrategy: RetryStrategy.ExponentialBackoff,
      });
      expect(error.isRetryable()).toBe(true);
    });

    it('should return false for NO_RETRY strategy', () => {
      const error = new HardwareWalletError('Test error', {
        ...mockOptions,
        retryStrategy: RetryStrategy.NoRetry,
      });
      expect(error.isRetryable()).toBe(false);
    });
  });

  describe('isCritical', () => {
    it('should return true for CRITICAL severity', () => {
      const error = new HardwareWalletError('Test error', {
        ...mockOptions,
        severity: Severity.Critical,
      });
      expect(error.isCritical()).toBe(true);
    });

    it('should return false for non-CRITICAL severity', () => {
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
    it('should return true for WARNING severity', () => {
      const error = new HardwareWalletError('Test error', {
        ...mockOptions,
        severity: Severity.Warning,
      });
      expect(error.isWarning()).toBe(true);
    });

    it('should return false for non-WARNING severity', () => {
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

  describe('requiresUserAction', () => {
    it('should return true when userActionable is true', () => {
      const error = new HardwareWalletError('Test error', {
        ...mockOptions,
        userActionable: true,
      });
      expect(error.requiresUserAction()).toBe(true);
    });

    it('should return false when userActionable is false', () => {
      const error = new HardwareWalletError('Test error', {
        ...mockOptions,
        userActionable: false,
      });
      expect(error.requiresUserAction()).toBe(false);
    });
  });

  describe('withMetadata', () => {
    it('should create a new error with additional metadata', () => {
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

    it('should create metadata when original has none', () => {
      const originalError = new HardwareWalletError('Test error', mockOptions);
      const metadata = { deviceId: '12345' };
      const newError = originalError.withMetadata(metadata);

      expect(newError.metadata).toStrictEqual(metadata);
    });

    it('should override existing metadata keys', () => {
      const originalError = new HardwareWalletError('Test error', {
        ...mockOptions,
        metadata: { key: 'old', other: 'value' },
      });

      const newError = originalError.withMetadata({ key: 'new' });

      expect(newError.metadata).toStrictEqual({ key: 'new', other: 'value' });
    });

    it('should preserve all other properties', () => {
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
      expect(newError.retryStrategy).toBe(originalError.retryStrategy);
      expect(newError.userActionable).toBe(originalError.userActionable);
      expect(newError.userMessage).toBe(originalError.userMessage);
      expect(newError.cause).toBe(originalError.cause);
    });
  });

  describe('toJSON', () => {
    it('should serialize all properties to JSON', () => {
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
      expect(json.code).toBe(ErrorCode.UserCancel001);
      expect(json.severity).toBe(Severity.Warning);
      expect(json.category).toBe(Category.UserAction);
      expect(json.retryStrategy).toBe(RetryStrategy.Retry);
      expect(json.userActionable).toBe(true);
      expect(json.userMessage).toBe('Transaction was rejected');
      expect(json.timestamp).toBe(error.timestamp.toISOString());
      expect(json.metadata).toStrictEqual(metadata);
    });

    it('should serialize cause when present', () => {
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

    it('should not include cause when not present', () => {
      const error = new HardwareWalletError('Test error', mockOptions);
      const json = error.toJSON();

      expect(json.cause).toBeUndefined();
    });

    it('should handle undefined optional properties', () => {
      const error = new HardwareWalletError('Test error', mockOptions);
      const json = error.toJSON();

      expect(json.metadata).toBeUndefined();
      expect(json.cause).toBeUndefined();
    });
  });

  describe('toString', () => {
    it('should return a user-friendly string representation', () => {
      const error = new HardwareWalletError('Test error', mockOptions);
      const result = error.toString();

      expect(result).toBe(
        'HardwareWalletError [UserCancel001]: Transaction was rejected',
      );
    });

    it('should work with different error codes and messages', () => {
      const error = new HardwareWalletError('Internal error', {
        ...mockOptions,
        code: ErrorCode.SysInternal001,
        userMessage: 'An internal error occurred',
      });
      const result = error.toString();

      expect(result).toBe(
        'HardwareWalletError [SysInternal001]: An internal error occurred',
      );
    });
  });

  describe('toDetailedString', () => {
    it('should return a detailed string with all information', () => {
      const error = new HardwareWalletError('Test error', {
        ...mockOptions,
      });

      const result = error.toDetailedString();

      expect(result).toContain('HardwareWalletError [UserCancel001]');
      expect(result).toContain('Message: Test error');
      expect(result).toContain('User Message: Transaction was rejected');
      expect(result).toContain('Severity: Warning');
      expect(result).toContain('Category: UserAction');
      expect(result).toContain('Retry Strategy: Retry');
      expect(result).toContain('User Actionable: true');
      expect(result).toContain('Timestamp:');
    });

    it('should include metadata when present', () => {
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

    it('should include cause when present', () => {
      const cause = new Error('Original error');
      const error = new HardwareWalletError('Test error', {
        ...mockOptions,
        cause,
      });

      const result = error.toDetailedString();
      expect(result).toContain('Caused by: Original error');
    });

    it('should not include optional fields when not present', () => {
      const error = new HardwareWalletError('Test error', mockOptions);
      const result = error.toDetailedString();

      expect(result).not.toContain('Metadata:');
      expect(result).not.toContain('Caused by:');
    });

    it('should not include metadata section when metadata is empty', () => {
      const error = new HardwareWalletError('Test error', {
        ...mockOptions,
        metadata: {},
      });

      const result = error.toDetailedString();
      expect(result).not.toContain('Metadata:');
    });
  });

  describe('error scenarios', () => {
    it('should handle critical authentication errors', () => {
      const error = new HardwareWalletError('Device blocked', {
        code: ErrorCode.AuthLock002,
        severity: Severity.Critical,
        category: Category.Authentication,
        retryStrategy: RetryStrategy.NoRetry,
        userActionable: true,
        userMessage: 'Device is blocked due to too many failed attempts',
      });

      expect(error.isCritical()).toBe(true);
      expect(error.isRetryable()).toBe(false);
      expect(error.requiresUserAction()).toBe(true);
    });

    it('should handle retryable connection errors', () => {
      const error = new HardwareWalletError('Connection timeout', {
        code: ErrorCode.ConnTimeout001,
        severity: Severity.Err,
        category: Category.Connection,
        retryStrategy: RetryStrategy.ExponentialBackoff,
        userActionable: false,
        userMessage: 'Connection timed out',
      });

      expect(error.isCritical()).toBe(false);
      expect(error.isRetryable()).toBe(true);
      expect(error.requiresUserAction()).toBe(false);
    });

    it('should handle user action warnings', () => {
      const error = new HardwareWalletError('User confirmation required', {
        code: ErrorCode.UserConfirm001,
        severity: Severity.Warning,
        category: Category.UserAction,
        retryStrategy: RetryStrategy.Retry,
        userActionable: true,
        userMessage: 'Please confirm the action on your device',
      });

      expect(error.isWarning()).toBe(true);
      expect(error.isCritical()).toBe(false);
      expect(error.isRetryable()).toBe(true);
      expect(error.requiresUserAction()).toBe(true);
    });
  });
});
