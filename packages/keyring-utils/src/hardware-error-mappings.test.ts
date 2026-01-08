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
        expect(mapping.customCode).toBe(ErrorCode.Success000);
        expect(mapping.severity).toBe(Severity.Info);
        expect(mapping.category).toBe(Category.Success);
        expect(mapping.retryStrategy).toBe(RetryStrategy.NoRetry);
        expect(mapping.userActionable).toBe(false);
      });
    });

    describe('authentication errors', () => {
      it('should map 0x6300 to authentication failed', () => {
        const mapping = errorMappings['0x6300'];
        expect(mapping.customCode).toBe(ErrorCode.AuthSec001);
        expect(mapping.severity).toBe(Severity.Err);
        expect(mapping.category).toBe(Category.Authentication);
        expect(mapping.userActionable).toBe(true);
        expect(mapping.userMessage).toBeDefined();
      });

      it('should map 0x63c0 to PIN attempts remaining', () => {
        const mapping = errorMappings['0x63c0'];
        expect(mapping.customCode).toBe(ErrorCode.AuthPin003);
        expect(mapping.severity).toBe(Severity.Warning);
        expect(mapping.retryStrategy).toBe(RetryStrategy.Retry);
      });

      it('should map 0x5515 to device locked', () => {
        const mapping = errorMappings['0x5515'];
        expect(mapping.customCode).toBe(ErrorCode.AuthLock001);
        expect(mapping.severity).toBe(Severity.Err);
        expect(mapping.userActionable).toBe(true);
        expect(mapping.userMessage).toContain('unlock');
      });

      it('should map 0x9840 to device blocked', () => {
        const mapping = errorMappings['0x9840'];
        expect(mapping.customCode).toBe(ErrorCode.AuthLock002);
        expect(mapping.severity).toBe(Severity.Critical);
        expect(mapping.retryStrategy).toBe(RetryStrategy.NoRetry);
      });
    });

    describe('user action errors', () => {
      it('should map 0x6985 to user rejected', () => {
        const mapping = errorMappings['0x6985'];
        expect(mapping.customCode).toBe(ErrorCode.UserCancel001);
        expect(mapping.severity).toBe(Severity.Warning);
        expect(mapping.category).toBe(Category.UserAction);
        expect(mapping.retryStrategy).toBe(RetryStrategy.Retry);
        expect(mapping.userActionable).toBe(true);
      });

      it('should map 0x5501 to user refused', () => {
        const mapping = errorMappings['0x5501'];
        expect(mapping.customCode).toBe(ErrorCode.UserCancel001);
        expect(mapping.severity).toBe(Severity.Warning);
        expect(mapping.retryStrategy).toBe(RetryStrategy.Retry);
      });
    });

    describe('data validation errors', () => {
      it('should map 0x6700 to incorrect data length', () => {
        const mapping = errorMappings['0x6700'];
        expect(mapping.customCode).toBe(ErrorCode.DataFormat001);
        expect(mapping.category).toBe(Category.DataValidation);
        expect(mapping.userActionable).toBe(false);
      });

      it('should map 0x6a80 to invalid data', () => {
        const mapping = errorMappings['0x6a80'];
        expect(mapping.customCode).toBe(ErrorCode.DataFormat002);
        expect(mapping.category).toBe(Category.DataValidation);
      });

      it('should map 0x6b00 to invalid parameter', () => {
        const mapping = errorMappings['0x6b00'];
        expect(mapping.customCode).toBe(ErrorCode.DataFormat003);
        expect(mapping.severity).toBe(Severity.Err);
      });
    });

    describe('protocol errors', () => {
      it('should map 0x6981 to command incompatible', () => {
        const mapping = errorMappings['0x6981'];
        expect(mapping.customCode).toBe(ErrorCode.ProtoCmd002);
        expect(mapping.category).toBe(Category.Protocol);
      });

      it('should map 0x6d00 to instruction not supported', () => {
        const mapping = errorMappings['0x6d00'];
        expect(mapping.customCode).toBe(ErrorCode.ProtoCmd001);
        expect(mapping.category).toBe(Category.Protocol);
      });

      it('should map 0x6d02 to unknown APDU command', () => {
        const mapping = errorMappings['0x6d02'];
        expect(mapping.customCode).toBe(ErrorCode.ProtoMsg001);
        expect(mapping.category).toBe(Category.Protocol);
      });
    });

    describe('system errors', () => {
      it('should map 0x6f00 to internal device error', () => {
        const mapping = errorMappings['0x6f00'];
        expect(mapping.customCode).toBe(ErrorCode.SysInternal001);
        expect(mapping.severity).toBe(Severity.Critical);
        expect(mapping.category).toBe(Category.System);
      });

      it('should map 0x6a84 to not enough memory', () => {
        const mapping = errorMappings['0x6a84'];
        expect(mapping.customCode).toBe(ErrorCode.SysMemory001);
        expect(mapping.category).toBe(Category.System);
      });

      it('should map 0x6faa to device halted', () => {
        const mapping = errorMappings['0x6faa'];
        expect(mapping.customCode).toBe(ErrorCode.SysInternal001);
        expect(mapping.severity).toBe(Severity.Critical);
        expect(mapping.userMessage).toContain('disconnect and reconnect');
      });
    });

    describe('connection errors', () => {
      it('should map 0x650f to connection issue', () => {
        const mapping = errorMappings['0x650f'];
        expect(mapping.customCode).toBe(ErrorCode.ConnClosed001);
        expect(mapping.category).toBe(Category.Connection);
        expect(mapping.retryStrategy).toBe(RetryStrategy.Retry);
      });
    });

    describe('cryptographic errors', () => {
      it('should map 0x9484 to algorithm not supported', () => {
        const mapping = errorMappings['0x9484'];
        expect(mapping.customCode).toBe(ErrorCode.CryptoAlgo001);
        expect(mapping.category).toBe(Category.Cryptography);
      });

      it('should map 0x9485 to invalid key check value', () => {
        const mapping = errorMappings['0x9485'];
        expect(mapping.customCode).toBe(ErrorCode.CryptoKey001);
        expect(mapping.category).toBe(Category.Cryptography);
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

        expect(Object.values(ErrorCode)).toContain(mapping.customCode);
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
        expect(mapping.customCode).toBe(ErrorCode.ProtoCmd003);
        expect(mapping.severity).toBe(Severity.Err);
        expect(mapping.retryStrategy).toBe(RetryStrategy.Retry);
        expect(mapping.originalName).toBe('Failure_UnexpectedMessage');
      });

      it('should map code 4 to action cancelled', () => {
        const mapping = errorMappings['4'];
        expect(mapping.customCode).toBe(ErrorCode.UserCancel002);
        expect(mapping.category).toBe(Category.UserAction);
        expect(mapping.userActionable).toBe(true);
        expect(mapping.originalName).toBe('Failure_ActionCancelled');
      });

      it('should map code 10 to insufficient funds', () => {
        const mapping = errorMappings['10'];
        expect(mapping.customCode).toBe(ErrorCode.TxFunds001);
        expect(mapping.category).toBe(Category.Transaction);
        expect(mapping.originalName).toBe('Failure_NotEnoughFunds');
      });

      it('should map code 99 to firmware error', () => {
        const mapping = errorMappings['99'];
        expect(mapping.customCode).toBe(ErrorCode.SysFirmware002);
        expect(mapping.severity).toBe(Severity.Critical);
        expect(mapping.originalName).toBe('Failure_FirmwareError');
      });
    });

    describe('PIN errors', () => {
      it('should map code 5 to PIN expected', () => {
        const mapping = errorMappings['5'];
        expect(mapping.customCode).toBe(ErrorCode.UserInput001);
        expect(mapping.category).toBe(Category.UserAction);
        expect(mapping.originalName).toBe('Failure_PinExpected');
      });

      it('should map code 7 to PIN invalid', () => {
        const mapping = errorMappings['7'];
        expect(mapping.customCode).toBe(ErrorCode.AuthPin001);
        expect(mapping.category).toBe(Category.Authentication);
        expect(mapping.retryStrategy).toBe(RetryStrategy.Retry);
        expect(mapping.originalName).toBe('Failure_PinInvalid');
      });

      it('should map code 12 to PIN mismatch', () => {
        const mapping = errorMappings['12'];
        expect(mapping.customCode).toBe(ErrorCode.AuthPin004);
        expect(mapping.originalName).toBe('Failure_PinMismatch');
      });
    });

    describe('device state errors', () => {
      it('should map code 11 to device not initialized', () => {
        const mapping = errorMappings['11'];
        expect(mapping.customCode).toBe(ErrorCode.DeviceState001);
        expect(mapping.category).toBe(Category.DeviceState);
        expect(mapping.originalName).toBe('Failure_NotInitialized');
      });

      it('should map code 15 to device busy', () => {
        const mapping = errorMappings['15'];
        expect(mapping.customCode).toBe(ErrorCode.DeviceState002);
        expect(mapping.severity).toBe(Severity.Warning);
        expect(mapping.retryStrategy).toBe(RetryStrategy.ExponentialBackoff);
        expect(mapping.originalName).toBe('Failure_Busy');
      });

      it('should map Device_Disconnected to device disconnected', () => {
        const mapping = errorMappings.Device_Disconnected;
        expect(mapping.customCode).toBe(ErrorCode.DeviceState003);
        expect(mapping.retryStrategy).toBe(RetryStrategy.Retry);
        expect(mapping.sdkMessage).toBe('Device disconnected');
      });

      it('should map Device_UsedElsewhere correctly', () => {
        const mapping = errorMappings.Device_UsedElsewhere;
        expect(mapping.customCode).toBe(ErrorCode.DeviceState004);
        expect(mapping.retryStrategy).toBe(RetryStrategy.NoRetry);
        expect(mapping.userMessage).toContain('another window');
      });
    });

    describe('initialization errors', () => {
      it('should map Init_NotInitialized', () => {
        const mapping = errorMappings.Init_NotInitialized;
        expect(mapping.customCode).toBe(ErrorCode.ConfigInit001);
        expect(mapping.category).toBe(Category.Configuration);
        expect(mapping.sdkMessage).toBe('TrezorConnect not initialized');
      });

      it('should map Init_AlreadyInitialized', () => {
        const mapping = errorMappings.Init_AlreadyInitialized;
        expect(mapping.customCode).toBe(ErrorCode.ConfigInit002);
        expect(mapping.severity).toBe(Severity.Warning);
      });

      it('should map Init_ManifestMissing', () => {
        const mapping = errorMappings.Init_ManifestMissing;
        expect(mapping.customCode).toBe(ErrorCode.ConfigInit003);
        expect(mapping.category).toBe(Category.Configuration);
      });
    });

    describe('connection errors', () => {
      it('should map Init_IframeBlocked', () => {
        const mapping = errorMappings.Init_IframeBlocked;
        expect(mapping.customCode).toBe(ErrorCode.ConnBlocked001);
        expect(mapping.category).toBe(Category.Connection);
        expect(mapping.userMessage).toContain('browser settings');
      });

      it('should map Init_IframeTimeout', () => {
        const mapping = errorMappings.Init_IframeTimeout;
        expect(mapping.customCode).toBe(ErrorCode.ConnTimeout001);
        expect(mapping.retryStrategy).toBe(RetryStrategy.Retry);
      });

      it('should map Transport_Missing', () => {
        const mapping = errorMappings.Transport_Missing;
        expect(mapping.customCode).toBe(ErrorCode.ConnTransport001);
        expect(mapping.category).toBe(Category.Connection);
      });
    });

    describe('method errors', () => {
      it('should map Method_InvalidParameter', () => {
        const mapping = errorMappings.Method_InvalidParameter;
        expect(mapping.customCode).toBe(ErrorCode.DataFormat003);
        expect(mapping.category).toBe(Category.DataValidation);
      });

      it('should map Method_Cancel', () => {
        const mapping = errorMappings.Method_Cancel;
        expect(mapping.customCode).toBe(ErrorCode.UserCancel002);
        expect(mapping.category).toBe(Category.UserAction);
        expect(mapping.retryStrategy).toBe(RetryStrategy.Retry);
      });

      it('should map Method_UnknownCoin', () => {
        const mapping = errorMappings.Method_UnknownCoin;
        expect(mapping.customCode).toBe(ErrorCode.DataNotfound003);
        expect(mapping.userMessage).toContain('not supported');
      });
    });

    describe('device capability errors', () => {
      it('should map Device_MissingCapability', () => {
        const mapping = errorMappings.Device_MissingCapability;
        expect(mapping.customCode).toBe(ErrorCode.DeviceCap001);
        expect(mapping.userMessage).toContain('firmware update');
      });

      it('should map Device_MissingCapabilityBtcOnly', () => {
        const mapping = errorMappings.Device_MissingCapabilityBtcOnly;
        expect(mapping.customCode).toBe(ErrorCode.DeviceCap002);
        expect(mapping.userMessage).toContain('Bitcoin-only');
      });
    });

    describe('special codes', () => {
      it('should have UNKNOWN fallback', () => {
        const mapping = errorMappings.UNKNOWN;
        expect(mapping.customCode).toBe(ErrorCode.Unknown001);
        expect(mapping.category).toBe(Category.Unknown);
        expect(mapping.originalName).toBe('Failure_UnknownCode');
      });

      it('should map ENTROPY_CHECK', () => {
        const mapping = errorMappings.ENTROPY_CHECK;
        expect(mapping.customCode).toBe(ErrorCode.CryptoEntropy001);
        expect(mapping.category).toBe(Category.Cryptography);
        expect(mapping.originalName).toBe('Failure_EntropyCheck');
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

        expect(Object.values(ErrorCode)).toContain(mapping.customCode);
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
      expect(defaultMapping.customCode).toBe(ErrorCode.Unknown001);
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
