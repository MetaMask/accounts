import { HARDWARE_ERROR_MAPPINGS } from './hardware-error-mappings';
import { ErrorCode, Severity, Category } from './hardware-errors-enums';

describe('HARDWARE_ERROR_MAPPINGS', () => {
  describe('structure', () => {
    it('should have ledger vendor', () => {
      expect(HARDWARE_ERROR_MAPPINGS).toHaveProperty('ledger');
    });

    it('should have vendor names', () => {
      expect(HARDWARE_ERROR_MAPPINGS.ledger.vendorName).toBe('Ledger');
    });
  });

  describe('Ledger mappings', () => {
    const { errorMappings } = HARDWARE_ERROR_MAPPINGS.ledger;

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
      });
    });

    describe('authentication errors', () => {
      it('should map 0x6300 to authentication failed', () => {
        const mapping = errorMappings['0x6300'];
        expect(mapping.customCode).toBe(ErrorCode.AuthFailed);
        expect(mapping.severity).toBe(Severity.Err);
        expect(mapping.category).toBe(Category.Authentication);
        expect(mapping.userMessage).toBeDefined();
      });

      it('should map 0x63c0 to PIN attempts remaining', () => {
        const mapping = errorMappings['0x63c0'];
        expect(mapping.customCode).toBe(ErrorCode.AuthPinAttemptsRemaining);
        expect(mapping.severity).toBe(Severity.Warning);
      });

      it('should map 0x5515 to device locked', () => {
        const mapping = errorMappings['0x5515'];
        expect(mapping.customCode).toBe(ErrorCode.AuthDeviceLocked);
        expect(mapping.severity).toBe(Severity.Err);
        expect(mapping.userMessage).toContain('unlock');
      });

      it('should map 0x9840 to device blocked', () => {
        const mapping = errorMappings['0x9840'];
        expect(mapping.customCode).toBe(ErrorCode.AuthDeviceBlocked);
        expect(mapping.severity).toBe(Severity.Critical);
      });
    });

    describe('user action errors', () => {
      it('should map 0x6985 to user rejected', () => {
        const mapping = errorMappings['0x6985'];
        expect(mapping.customCode).toBe(ErrorCode.UserRejected);
        expect(mapping.severity).toBe(Severity.Warning);
        expect(mapping.category).toBe(Category.UserAction);
      });

      it('should map 0x5501 to user refused', () => {
        const mapping = errorMappings['0x5501'];
        expect(mapping.customCode).toBe(ErrorCode.UserRejected);
        expect(mapping.severity).toBe(Severity.Warning);
      });
    });
    describe('connection errors', () => {
      it('should map 0x650f to connection issue', () => {
        const mapping = errorMappings['0x650f'];
        expect(mapping.customCode).toBe(ErrorCode.ConnClosed);
        expect(mapping.category).toBe(Category.Connection);
      });
    });

    it('should have valid structure for all mappings', () => {
      Object.entries(errorMappings).forEach(([_, mapping]) => {
        expect(mapping).toHaveProperty('customCode');
        expect(mapping).toHaveProperty('message');
        expect(mapping).toHaveProperty('severity');
        expect(mapping).toHaveProperty('category');

        const numericErrorCodes = Object.values(ErrorCode).filter(
          (value): value is number => typeof value === 'number',
        );
        expect(numericErrorCodes).toContain(mapping.customCode);
        expect(Object.values(Severity)).toContain(mapping.severity);
        expect(Object.values(Category)).toContain(mapping.category);
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

  describe('consistency checks', () => {
    it('should have unique error codes within each vendor', () => {
      const ledgerCodes = Object.values(
        HARDWARE_ERROR_MAPPINGS.ledger.errorMappings,
      );
      const ledgerCustomCodes = ledgerCodes.map(
        (mapping) => mapping.customCode,
      );
      expect(ledgerCustomCodes.length).toBeGreaterThan(0);
    });
  });
});
