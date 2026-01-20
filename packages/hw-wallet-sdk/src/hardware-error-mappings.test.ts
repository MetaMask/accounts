import {
  LEDGER_ERROR_MAPPINGS,
  BLE_ERROR_MAPPINGS,
  MOBILE_ERROR_MAPPINGS,
} from './hardware-error-mappings';
import { ErrorCode, Severity, Category } from './hardware-errors-enums';

describe('HARDWARE_ERROR_MAPPINGS', () => {
  describe('Ledger mappings', () => {
    const errorMappings = LEDGER_ERROR_MAPPINGS;

    it('has errorMappings object', () => {
      expect(errorMappings).toBeDefined();
      expect(typeof errorMappings).toBe('object');
    });

    describe('success codes', () => {
      it('map 0x9000 to success', () => {
        const mapping = errorMappings['0x9000'];
        expect(mapping).toBeDefined();
        expect(mapping.code).toBe(ErrorCode.Success);
        expect(mapping.severity).toBe(Severity.Info);
        expect(mapping.category).toBe(Category.Success);
      });
    });

    describe('authentication errors', () => {
      it('map 0x6300 to authentication failed', () => {
        const mapping = errorMappings['0x6300'];
        expect(mapping.code).toBe(ErrorCode.AuthenticationFailed);
        expect(mapping.severity).toBe(Severity.Err);
        expect(mapping.category).toBe(Category.Authentication);
        expect(mapping.userMessage).toBeDefined();
      });

      it('map 0x63c0 to PIN attempts remaining', () => {
        const mapping = errorMappings['0x63c0'];
        expect(mapping.code).toBe(ErrorCode.AuthenticationPinAttemptsRemaining);
        expect(mapping.severity).toBe(Severity.Warning);
      });

      it('map 0x5515 to device locked', () => {
        const mapping = errorMappings['0x5515'];
        expect(mapping.code).toBe(ErrorCode.AuthenticationDeviceLocked);
        expect(mapping.severity).toBe(Severity.Err);
        expect(mapping.userMessage).toContain('unlock');
      });

      it('map 0x9840 to device blocked', () => {
        const mapping = errorMappings['0x9840'];
        expect(mapping.code).toBe(ErrorCode.AuthenticationDeviceBlocked);
        expect(mapping.severity).toBe(Severity.Critical);
      });
    });

    describe('user action errors', () => {
      it('map 0x6985 to user rejected', () => {
        const mapping = errorMappings['0x6985'];
        expect(mapping.code).toBe(ErrorCode.UserRejected);
        expect(mapping.severity).toBe(Severity.Warning);
        expect(mapping.category).toBe(Category.UserAction);
      });

      it('map 0x5501 to user refused', () => {
        const mapping = errorMappings['0x5501'];
        expect(mapping.code).toBe(ErrorCode.UserRejected);
        expect(mapping.severity).toBe(Severity.Warning);
      });
    });
    describe('connection errors', () => {
      it('map 0x650f to connection issue', () => {
        const mapping = errorMappings['0x650f'];
        expect(mapping.code).toBe(ErrorCode.ConnectionClosed);
        expect(mapping.category).toBe(Category.Connection);
      });
    });

    describe('device state errors', () => {
      it('maps 0x6f00 to device unresponsive', () => {
        const mapping = errorMappings['0x6f00'];
        expect(mapping.code).toBe(ErrorCode.DeviceUnresponsive);
        expect(mapping.severity).toBe(Severity.Err);
        expect(mapping.category).toBe(Category.DeviceState);
        expect(mapping.userMessage).toContain('not responding');
      });
    });

    it('has valid structure for all mappings', () => {
      Object.entries(errorMappings).forEach(([_, mapping]) => {
        expect(mapping).toHaveProperty('code');
        expect(mapping).toHaveProperty('message');
        expect(mapping).toHaveProperty('severity');
        expect(mapping).toHaveProperty('category');

        const numericErrorCodes = Object.values(ErrorCode).filter(
          (value): value is number => typeof value === 'number',
        );
        expect(numericErrorCodes).toContain(mapping.code);
        expect(Object.values(Severity)).toContain(mapping.severity);
        expect(Object.values(Category)).toContain(mapping.category);
        expect(typeof mapping.message).toBe('string');
      });
    });

    it('has valid userMessage when present', () => {
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

  describe('BLE mappings', () => {
    const errorMappings = BLE_ERROR_MAPPINGS;

    it('has errorMappings object', () => {
      expect(errorMappings).toBeDefined();
      expect(typeof errorMappings).toBe('object');
    });

    describe('permission errors', () => {
      it('maps BLUETOOTH_PERMISSION_DENIED correctly', () => {
        const mapping = errorMappings.BLUETOOTH_PERMISSION_DENIED;
        expect(mapping.code).toBe(ErrorCode.PermissionBluetoothDenied);
        expect(mapping.severity).toBe(Severity.Err);
        expect(mapping.category).toBe(Category.Configuration);
      });

      it('maps LOCATION_PERMISSION_DENIED correctly', () => {
        const mapping = errorMappings.LOCATION_PERMISSION_DENIED;
        expect(mapping.code).toBe(ErrorCode.PermissionLocationDenied);
        expect(mapping.severity).toBe(Severity.Err);
        expect(mapping.category).toBe(Category.Configuration);
        expect(mapping.userMessage).toContain('Location');
      });

      it('maps NEARBY_DEVICES_PERMISSION_DENIED correctly', () => {
        const mapping = errorMappings.NEARBY_DEVICES_PERMISSION_DENIED;
        expect(mapping.code).toBe(ErrorCode.PermissionNearbyDevicesDenied);
        expect(mapping.severity).toBe(Severity.Err);
        expect(mapping.category).toBe(Category.Configuration);
      });
    });

    describe('bluetooth state errors', () => {
      it('maps BLUETOOTH_DISABLED correctly', () => {
        const mapping = errorMappings.BLUETOOTH_DISABLED;
        expect(mapping.code).toBe(ErrorCode.BluetoothDisabled);
        expect(mapping.severity).toBe(Severity.Warning);
        expect(mapping.category).toBe(Category.Connection);
      });

      it('maps BLUETOOTH_SCAN_FAILED correctly', () => {
        const mapping = errorMappings.BLUETOOTH_SCAN_FAILED;
        expect(mapping.code).toBe(ErrorCode.BluetoothScanFailed);
        expect(mapping.severity).toBe(Severity.Err);
        expect(mapping.category).toBe(Category.Connection);
      });

      it('maps BLUETOOTH_CONNECTION_FAILED correctly', () => {
        const mapping = errorMappings.BLUETOOTH_CONNECTION_FAILED;
        expect(mapping.code).toBe(ErrorCode.BluetoothConnectionFailed);
        expect(mapping.severity).toBe(Severity.Err);
        expect(mapping.category).toBe(Category.Connection);
      });
    });

    it('has valid structure for all mappings', () => {
      Object.entries(errorMappings).forEach(([_, mapping]) => {
        expect(mapping).toHaveProperty('code');
        expect(mapping).toHaveProperty('message');
        expect(mapping).toHaveProperty('severity');
        expect(mapping).toHaveProperty('category');

        const numericErrorCodes = Object.values(ErrorCode).filter(
          (value): value is number => typeof value === 'number',
        );
        expect(numericErrorCodes).toContain(mapping.code);
        expect(Object.values(Severity)).toContain(mapping.severity);
        expect(Object.values(Category)).toContain(mapping.category);
        expect(typeof mapping.message).toBe('string');
      });
    });
  });

  describe('Mobile mappings', () => {
    const errorMappings = MOBILE_ERROR_MAPPINGS;

    it('has errorMappings object', () => {
      expect(errorMappings).toBeDefined();
      expect(typeof errorMappings).toBe('object');
    });

    it('maps NOT_SUPPORTED correctly', () => {
      const mapping = errorMappings.NOT_SUPPORTED;
      expect(mapping.code).toBe(ErrorCode.MobileNotSupported);
      expect(mapping.severity).toBe(Severity.Err);
      expect(mapping.category).toBe(Category.DeviceState);
    });

    it('has valid structure for all mappings', () => {
      Object.entries(errorMappings).forEach(([_, mapping]) => {
        expect(mapping).toHaveProperty('code');
        expect(mapping).toHaveProperty('message');
        expect(mapping).toHaveProperty('severity');
        expect(mapping).toHaveProperty('category');

        const numericErrorCodes = Object.values(ErrorCode).filter(
          (value): value is number => typeof value === 'number',
        );
        expect(numericErrorCodes).toContain(mapping.code);
        expect(Object.values(Severity)).toContain(mapping.severity);
        expect(Object.values(Category)).toContain(mapping.category);
        expect(typeof mapping.message).toBe('string');
      });
    });
  });
});
