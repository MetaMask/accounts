import { HARDWARE_MAPPINGS } from './hardware-error-mappings';
import {
  ErrorCode,
  Severity,
  Category,
  RetryStrategy,
} from './hardware-errors-enums';

describe('HARDWARE_MAPPINGS', () => {
  describe('structure', () => {
    it('should have ledger and trezor vendors', () => {
      expect(HARDWARE_MAPPINGS).toHaveProperty('ledger');
      expect(HARDWARE_MAPPINGS).toHaveProperty('trezor');
    });

    it('should have vendor names', () => {
      expect(HARDWARE_MAPPINGS.ledger.vendorName).toBe('Ledger');
      expect(HARDWARE_MAPPINGS.trezor.vendorName).toBe('Trezor');
    });
  });

  describe('Ledger mappings', () => {
    const { errorMappings } = HARDWARE_MAPPINGS.ledger;

    it('should have errorMappings object', () => {
      expect(errorMappings).toBeDefined();
      expect(typeof errorMappings).toBe('object');
    });

    describe('success codes', () => {
      it('should map 0x9000 to success', () => {
        const mapping = errorMappings['0x9000'];
        expect(mapping).toBeDefined();
        expect(mapping.customCode).toBe(ErrorCode.Success);
        expect(mapping.severity).toBe(Severity.Info);
        expect(mapping.category).toBe(Category.Success);
        expect(mapping.retryStrategy).toBe(RetryStrategy.NoRetry);
        expect(mapping.userActionable).toBe(false);
      });
    });

    describe('authentication errors', () => {
      it('should map 0x6300 to authentication failed', () => {
        const mapping = errorMappings['0x6300'];
        expect(mapping.customCode).toBe(ErrorCode.AuthFailed);
        expect(mapping.severity).toBe(Severity.Err);
        expect(mapping.category).toBe(Category.Authentication);
        expect(mapping.userActionable).toBe(true);
        expect(mapping.userMessage).toBeDefined();
      });

      it('should map 0x63c0 to PIN attempts remaining', () => {
        const mapping = errorMappings['0x63c0'];
        expect(mapping.customCode).toBe(ErrorCode.AuthPinAttemptsRemaining);
        expect(mapping.severity).toBe(Severity.Warning);
        expect(mapping.retryStrategy).toBe(RetryStrategy.Retry);
      });

      it('should map 0x5515 to device locked', () => {
        const mapping = errorMappings['0x5515'];
        expect(mapping.customCode).toBe(ErrorCode.AuthDeviceLocked);
        expect(mapping.severity).toBe(Severity.Err);
        expect(mapping.userActionable).toBe(true);
        expect(mapping.userMessage).toContain('unlock');
      });

      it('should map 0x9840 to device blocked', () => {
        const mapping = errorMappings['0x9840'];
        expect(mapping.customCode).toBe(ErrorCode.AuthDeviceBlocked);
        expect(mapping.severity).toBe(Severity.Critical);
        expect(mapping.retryStrategy).toBe(RetryStrategy.NoRetry);
      });
    });

    describe('user action errors', () => {
      it('should map 0x6985 to user rejected', () => {
        const mapping = errorMappings['0x6985'];
        expect(mapping.customCode).toBe(ErrorCode.UserRejected);
        expect(mapping.severity).toBe(Severity.Warning);
        expect(mapping.category).toBe(Category.UserAction);
        expect(mapping.retryStrategy).toBe(RetryStrategy.Retry);
        expect(mapping.userActionable).toBe(true);
      });

      it('should map 0x5501 to user refused', () => {
        const mapping = errorMappings['0x5501'];
        expect(mapping.customCode).toBe(ErrorCode.UserRejected);
        expect(mapping.severity).toBe(Severity.Warning);
        expect(mapping.retryStrategy).toBe(RetryStrategy.Retry);
      });
    });
    describe('connection errors', () => {
      it('should map 0x650f to connection issue', () => {
        const mapping = errorMappings['0x650f'];
        expect(mapping.customCode).toBe(ErrorCode.ConnClosed);
        expect(mapping.category).toBe(Category.Connection);
        expect(mapping.retryStrategy).toBe(RetryStrategy.Retry);
      });
    });

    it('should have valid structure for all mappings', () => {
      Object.entries(errorMappings).forEach(([_, mapping]) => {
        expect(mapping).toHaveProperty('customCode');
        expect(mapping).toHaveProperty('message');
        expect(mapping).toHaveProperty('severity');
        expect(mapping).toHaveProperty('category');
        expect(mapping).toHaveProperty('retryStrategy');
        expect(mapping).toHaveProperty('userActionable');

        const numericErrorCodes = Object.values(ErrorCode).filter(
          (value): value is number => typeof value === 'number',
        );
        expect(numericErrorCodes).toContain(mapping.customCode);
        expect(Object.values(Severity)).toContain(mapping.severity);
        expect(Object.values(Category)).toContain(mapping.category);
        expect(Object.values(RetryStrategy)).toContain(mapping.retryStrategy);
        expect(typeof mapping.userActionable).toBe('boolean');
        expect(typeof mapping.message).toBe('string');
      });
    });

    it('should have valid userMessage when present', () => {
      const mappingsWithUserMessage = Object.values(errorMappings).filter(
        (mapping): mapping is typeof mapping & { userMessage: string } =>
          'userMessage' in mapping &&
          typeof mapping.userMessage === 'string' &&
          mapping.userMessage.length > 0,
      );
      expect(mappingsWithUserMessage.length).toBeGreaterThan(0);
      mappingsWithUserMessage.forEach((mapping) => {
        expect(typeof mapping.userMessage).toBe('string');
        expect(mapping.userMessage.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Trezor mappings', () => {
    const { errorMappings } = HARDWARE_MAPPINGS.trezor;

    it('should have errorMapping object', () => {
      expect(errorMappings).toBeDefined();
      expect(typeof errorMappings).toBe('object');
    });

    describe('failure codes', () => {
      it('should map code 1 to unexpected message', () => {
        const mapping = errorMappings['1'];
        expect(mapping.customCode).toBe(ErrorCode.ProtoUnexpectedMessage);
        expect(mapping.severity).toBe(Severity.Err);
        expect(mapping.retryStrategy).toBe(RetryStrategy.Retry);
        expect(mapping.originalName).toBe('Failure_UnexpectedMessage');
      });

      it('should map code 4 to action cancelled', () => {
        const mapping = errorMappings['4'];
        expect(mapping.customCode).toBe(ErrorCode.UserCancelled);
        expect(mapping.category).toBe(Category.UserAction);
        expect(mapping.userActionable).toBe(true);
        expect(mapping.originalName).toBe('Failure_ActionCancelled');
      });
    });

    describe('PIN errors', () => {
      it('should map code 5 to PIN expected', () => {
        const mapping = errorMappings['5'];
        expect(mapping.customCode).toBe(ErrorCode.UserInputRequired);
        expect(mapping.category).toBe(Category.UserAction);
        expect(mapping.originalName).toBe('Failure_PinExpected');
      });

      it('should map code 7 to PIN invalid', () => {
        const mapping = errorMappings['7'];
        expect(mapping.customCode).toBe(ErrorCode.AuthIncorrectPin);
        expect(mapping.category).toBe(Category.Authentication);
        expect(mapping.retryStrategy).toBe(RetryStrategy.Retry);
        expect(mapping.originalName).toBe('Failure_PinInvalid');
      });

      it('should map code 12 to PIN mismatch', () => {
        const mapping = errorMappings['12'];
        expect(mapping.customCode).toBe(ErrorCode.AuthPinMismatch);
        expect(mapping.originalName).toBe('Failure_PinMismatch');
      });
    });

    describe('device state errors', () => {
      it('should map code 11 to device not initialized', () => {
        const mapping = errorMappings['11'];
        expect(mapping.customCode).toBe(ErrorCode.DeviceNotReady);
        expect(mapping.category).toBe(Category.DeviceState);
        expect(mapping.originalName).toBe('Failure_NotInitialized');
      });

      it('should map code 15 to device busy', () => {
        const mapping = errorMappings['15'];
        expect(mapping.customCode).toBe(ErrorCode.DeviceCallInProgress);
        expect(mapping.severity).toBe(Severity.Warning);
        expect(mapping.retryStrategy).toBe(RetryStrategy.ExponentialBackoff);
        expect(mapping.originalName).toBe('Failure_Busy');
      });

      it('should map Device_Disconnected to device disconnected', () => {
        const mapping = errorMappings.Device_Disconnected;
        expect(mapping.customCode).toBe(ErrorCode.DeviceDisconnected);
        expect(mapping.retryStrategy).toBe(RetryStrategy.Retry);
        expect(mapping.sdkMessage).toBe('Device disconnected');
      });

      it('should map Device_UsedElsewhere correctly', () => {
        const mapping = errorMappings.Device_UsedElsewhere;
        expect(mapping.customCode).toBe(ErrorCode.DeviceUsedElsewhere);
        expect(mapping.retryStrategy).toBe(RetryStrategy.NoRetry);
        expect(mapping.userMessage).toContain('another window');
      });
    });

    describe('connection errors', () => {
      it('should map Init_IframeBlocked', () => {
        const mapping = errorMappings.Init_IframeBlocked;
        expect(mapping.customCode).toBe(ErrorCode.ConnBlocked);
        expect(mapping.category).toBe(Category.Connection);
        expect(mapping.userMessage).toContain('browser settings');
      });

      it('should map Init_IframeTimeout', () => {
        const mapping = errorMappings.Init_IframeTimeout;
        expect(mapping.customCode).toBe(ErrorCode.ConnTimeout);
        expect(mapping.retryStrategy).toBe(RetryStrategy.Retry);
      });

      it('should map Transport_Missing', () => {
        const mapping = errorMappings.Transport_Missing;
        expect(mapping.customCode).toBe(ErrorCode.ConnTransportMissing);
        expect(mapping.category).toBe(Category.Connection);
      });
    });

    describe('method errors', () => {
      it('should map Method_Cancel', () => {
        const mapping = errorMappings.Method_Cancel;
        expect(mapping.customCode).toBe(ErrorCode.UserCancelled);
        expect(mapping.category).toBe(Category.UserAction);
        expect(mapping.retryStrategy).toBe(RetryStrategy.Retry);
      });

      it('should map Method_UnknownCoin', () => {
        const mapping = errorMappings.Method_UnknownCoin;
        expect(mapping.customCode).toBe(ErrorCode.Unknown);
        expect(mapping.userMessage).toContain('not supported');
      });
    });

    describe('device capability errors', () => {
      it('should map Device_MultipleNotSupported', () => {
        const mapping = errorMappings.Device_MultipleNotSupported;
        expect(mapping.customCode).toBe(ErrorCode.DeviceMultipleConnected);
        expect(mapping.userMessage).toContain('only one');
      });

      it('should map Device_MissingCapability', () => {
        const mapping = errorMappings.Device_MissingCapability;
        expect(mapping.customCode).toBe(ErrorCode.DeviceMissingCapability);
        expect(mapping.userMessage).toContain('firmware update');
      });

      it('should map Device_MissingCapabilityBtcOnly', () => {
        const mapping = errorMappings.Device_MissingCapabilityBtcOnly;
        expect(mapping.customCode).toBe(ErrorCode.DeviceBtcOnlyFirmware);
        expect(mapping.userMessage).toContain('Bitcoin-only');
      });
    });
    describe('special codes', () => {
      it('should have UNKNOWN fallback', () => {
        const mapping = errorMappings.UNKNOWN;
        expect(mapping.customCode).toBe(ErrorCode.Unknown);
        expect(mapping.category).toBe(Category.Unknown);
        expect(mapping.originalName).toBe('Failure_UnknownCode');
      });
    });

    it('should have valid structure for all mappings', () => {
      Object.entries(errorMappings).forEach(([_code, mapping]) => {
        expect(mapping).toHaveProperty('customCode');
        expect(mapping).toHaveProperty('message');
        expect(mapping).toHaveProperty('severity');
        expect(mapping).toHaveProperty('category');
        expect(mapping).toHaveProperty('retryStrategy');
        expect(mapping).toHaveProperty('userActionable');

        const numericErrorCodes = Object.values(ErrorCode).filter(
          (value): value is number => typeof value === 'number',
        );
        expect(numericErrorCodes).toContain(mapping.customCode);
        expect(Object.values(Severity)).toContain(mapping.severity);
        expect(Object.values(Category)).toContain(mapping.category);
        expect(Object.values(RetryStrategy)).toContain(mapping.retryStrategy);
        expect(typeof mapping.userActionable).toBe('boolean');
        expect(typeof mapping.message).toBe('string');
      });
    });

    it('should have valid optional fields when present', () => {
      const mappingsWithUserMessage = Object.values(errorMappings).filter(
        (mapping): mapping is typeof mapping & { userMessage: string } =>
          'userMessage' in mapping &&
          typeof mapping.userMessage === 'string' &&
          mapping.userMessage.length > 0,
      );
      mappingsWithUserMessage.forEach((mapping) => {
        expect(typeof mapping.userMessage).toBe('string');
        expect(mapping.userMessage.length).toBeGreaterThan(0);
      });

      const mappingsWithOriginalName = Object.values(errorMappings).filter(
        (mapping): mapping is typeof mapping & { originalName: string } =>
          'originalName' in mapping &&
          typeof mapping.originalName === 'string' &&
          mapping.originalName.length > 0,
      );
      mappingsWithOriginalName.forEach((mapping) => {
        expect(typeof mapping.originalName).toBe('string');
        expect(mapping.originalName.length).toBeGreaterThan(0);
      });

      const mappingsWithSdkMessage = Object.values(errorMappings).filter(
        (mapping): mapping is typeof mapping & { sdkMessage: string } =>
          'sdkMessage' in mapping &&
          typeof mapping.sdkMessage === 'string' &&
          mapping.sdkMessage.length > 0,
      );
      mappingsWithSdkMessage.forEach((mapping) => {
        expect(typeof mapping.sdkMessage).toBe('string');
        expect(mapping.sdkMessage.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Trezor default and patterns', () => {
    it('should have default error mapping', () => {
      const { default: defaultMapping } = HARDWARE_MAPPINGS.trezor;
      expect(defaultMapping).toBeDefined();
      expect(defaultMapping.customCode).toBe(ErrorCode.Unknown);
      expect(defaultMapping.category).toBe(Category.Unknown);
    });

    it('should have error_patterns array', () => {
      const { error_patterns: errorPatterns } = HARDWARE_MAPPINGS.trezor;
      expect(Array.isArray(errorPatterns)).toBe(true);
      expect(errorPatterns.length).toBeGreaterThan(0);
    });

    it('should have valid pattern structure', () => {
      const { error_patterns: errorPatterns } = HARDWARE_MAPPINGS.trezor;
      errorPatterns.forEach((pattern) => {
        expect(pattern).toHaveProperty('pattern');
        expect(pattern).toHaveProperty('type');
        expect(pattern).toHaveProperty('description');
        expect(pattern).toHaveProperty('defaultSeverity');
        expect(typeof pattern.pattern).toBe('string');
        expect(typeof pattern.type).toBe('string');
        expect(typeof pattern.description).toBe('string');
        expect(Object.values(Severity)).toContain(pattern.defaultSeverity);
      });
    });

    it('should have patterns for common error prefixes', () => {
      const { error_patterns: errorPatterns } = HARDWARE_MAPPINGS.trezor;
      const patterns = errorPatterns.map((patternObj) => patternObj.pattern);
      expect(patterns).toContain('^Failure_.*');
      expect(patterns).toContain('^Init_.*');
      expect(patterns).toContain('^Method_.*');
      expect(patterns).toContain('^Device_.*');
    });
  });

  describe('consistency checks', () => {
    it('should have unique error codes within each vendor', () => {
      const ledgerCodes = Object.values(HARDWARE_MAPPINGS.ledger.errorMappings);
      const ledgerCustomCodes = ledgerCodes.map(
        (mapping) => mapping.customCode,
      );
      expect(ledgerCustomCodes.length).toBeGreaterThan(0);

      const trezorCodes = Object.values(HARDWARE_MAPPINGS.trezor.errorMappings);
      const trezorCustomCodes = trezorCodes.map(
        (mapping) => mapping.customCode,
      );
      expect(trezorCustomCodes.length).toBeGreaterThan(0);
    });

    it('should have user messages for user-actionable errors', () => {
      const ledgerMappings = Object.values(
        HARDWARE_MAPPINGS.ledger.errorMappings,
      ).filter(
        (mapping): mapping is typeof mapping & { userMessage: string } =>
          mapping.userActionable &&
          mapping.severity !== Severity.Info &&
          'userMessage' in mapping &&
          typeof mapping.userMessage === 'string' &&
          mapping.userMessage.length > 0,
      );

      ledgerMappings.forEach((mapping) => {
        expect(mapping.userMessage).toBeDefined();
        expect(mapping.userMessage.length).toBeGreaterThan(0);
      });

      const trezorMappings = Object.values(
        HARDWARE_MAPPINGS.trezor.errorMappings,
      ).filter(
        (mapping): mapping is typeof mapping & { userMessage: string } =>
          mapping.userActionable &&
          mapping.severity !== Severity.Info &&
          'userMessage' in mapping &&
          typeof mapping.userMessage === 'string' &&
          mapping.userMessage.length > 0,
      );

      trezorMappings.forEach((mapping) => {
        expect(mapping.userMessage).toBeDefined();
        expect(mapping.userMessage.length).toBeGreaterThan(0);
      });
    });

    it('should use NO_RETRY for critical errors', () => {
      const allMappings = [
        ...Object.values(HARDWARE_MAPPINGS.ledger.errorMappings),
        ...Object.values(HARDWARE_MAPPINGS.trezor.errorMappings),
      ];

      const criticalMappings = allMappings.filter(
        (mapping) => mapping.severity === Severity.Critical,
      );

      criticalMappings.forEach((mapping) => {
        expect([RetryStrategy.NoRetry, RetryStrategy.Retry]).toContain(
          mapping.retryStrategy,
        );
      });
    });
  });
});
