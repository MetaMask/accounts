import {
  DMK_ERROR_MAPPINGS,
  DMK_ERROR_TAG_MAPPINGS,
  DMK_MESSAGE_PATTERNS,
  getDmkErrorFromTag,
} from './dmk-error-mappings';
import type { ErrorMapping } from './hardware-error-mappings';
import { Category, ErrorCode, Severity } from './hardware-errors-enums';

describe('DMK_ERROR_MAPPINGS', () => {
  it('maps DeviceSessionNotFound to DeviceDisconnected with full details', () => {
    expect(DMK_ERROR_MAPPINGS.DeviceSessionNotFound).toStrictEqual({
      code: ErrorCode.DeviceDisconnected,
      message: 'DMK device session not found',
      severity: Severity.Err,
      category: Category.Connection,
      userMessage:
        'Your Ledger device was disconnected. Please reconnect and try again.',
    });
  });

  it('maps ConnectionOpeningError to BluetoothConnectionFailed', () => {
    expect(DMK_ERROR_MAPPINGS.ConnectionOpeningError?.code).toBe(
      ErrorCode.BluetoothConnectionFailed,
    );
  });

  it('maps DeviceLockedError to AuthenticationDeviceLocked', () => {
    expect(DMK_ERROR_MAPPINGS.DeviceLockedError?.code).toBe(
      ErrorCode.AuthenticationDeviceLocked,
    );
    expect(DMK_ERROR_MAPPINGS.DeviceLockedError?.category).toBe(
      Category.Authentication,
    );
  });

  it('maps SessionRefresherError to DeviceDisconnected', () => {
    expect(DMK_ERROR_MAPPINGS.SessionRefresherError?.code).toBe(
      ErrorCode.DeviceDisconnected,
    );
  });

  it('has exactly 7 DMK error mappings', () => {
    expect(Object.keys(DMK_ERROR_MAPPINGS)).toHaveLength(7);
  });

  it('every mapping has all required ErrorMapping fields', () => {
    Object.values(DMK_ERROR_MAPPINGS).forEach((mapping) => {
      expect(mapping).toHaveProperty('code');
      expect(mapping).toHaveProperty('message');
      expect(mapping).toHaveProperty('severity');
      expect(mapping).toHaveProperty('category');
      expect(mapping).toHaveProperty('userMessage');
    });
  });

  it('every mapping code matches the code in DMK_ERROR_TAG_MAPPINGS', () => {
    Object.entries(DMK_ERROR_MAPPINGS).forEach(([tag, mapping]) => {
      expect(DMK_ERROR_TAG_MAPPINGS[tag]).toBe(mapping.code);
    });
  });

  it('every mapping maps to a valid ErrorCode', () => {
    const validCodes = Object.values(ErrorCode).filter(
      (value): value is number => typeof value === 'number',
    );
    Object.values(DMK_ERROR_MAPPINGS).forEach((mapping: ErrorMapping) => {
      expect(validCodes).toContain(mapping.code);
    });
  });
});

describe('DMK_ERROR_TAG_MAPPINGS', () => {
  it('maps DeviceSessionNotFound to DeviceDisconnected', () => {
    expect(DMK_ERROR_TAG_MAPPINGS.DeviceSessionNotFound).toBe(
      ErrorCode.DeviceDisconnected,
    );
  });

  it('maps ConnectionOpeningError to BluetoothConnectionFailed', () => {
    expect(DMK_ERROR_TAG_MAPPINGS.ConnectionOpeningError).toBe(
      ErrorCode.BluetoothConnectionFailed,
    );
  });

  it('maps DeviceDisconnectedWhileSendingError to DeviceDisconnected', () => {
    expect(DMK_ERROR_TAG_MAPPINGS.DeviceDisconnectedWhileSendingError).toBe(
      ErrorCode.DeviceDisconnected,
    );
  });

  it('maps DeviceDisconnectedBeforeSendingApdu to DeviceDisconnected', () => {
    expect(DMK_ERROR_TAG_MAPPINGS.DeviceDisconnectedBeforeSendingApdu).toBe(
      ErrorCode.DeviceDisconnected,
    );
  });

  it('maps DeviceLockedError to AuthenticationDeviceLocked', () => {
    expect(DMK_ERROR_TAG_MAPPINGS.DeviceLockedError).toBe(
      ErrorCode.AuthenticationDeviceLocked,
    );
  });

  it('maps DeviceNotConnectedError to DeviceDisconnected', () => {
    expect(DMK_ERROR_TAG_MAPPINGS.DeviceNotConnectedError).toBe(
      ErrorCode.DeviceDisconnected,
    );
  });

  it('maps SessionRefresherError to DeviceDisconnected', () => {
    expect(DMK_ERROR_TAG_MAPPINGS.SessionRefresherError).toBe(
      ErrorCode.DeviceDisconnected,
    );
  });

  it('has exactly 7 DMK tag mappings', () => {
    expect(Object.keys(DMK_ERROR_TAG_MAPPINGS)).toHaveLength(7);
  });

  it('maps every tag to a valid ErrorCode', () => {
    const validCodes = Object.values(ErrorCode).filter(
      (value): value is number => typeof value === 'number',
    );
    Object.values(DMK_ERROR_TAG_MAPPINGS).forEach((code) => {
      expect(validCodes).toContain(code);
    });
  });
});

describe('DMK_MESSAGE_PATTERNS', () => {
  it('has patterns for device disconnected', () => {
    const entry = DMK_MESSAGE_PATTERNS.find(
      ({ code }) => code === ErrorCode.DeviceDisconnected,
    );
    expect(entry).toBeDefined();
    expect(entry?.patterns).toContain('session not found');
    expect(entry?.patterns).toContain('sessionid is not initialized');
    expect(entry?.patterns).toContain('invalid session');
  });

  it('has patterns for device unresponsive', () => {
    const entry = DMK_MESSAGE_PATTERNS.find(
      ({ code }) => code === ErrorCode.DeviceUnresponsive,
    );
    expect(entry).toBeDefined();
    expect(entry?.patterns).toContain('device action ended without completion');
  });

  it('has patterns for device not ready', () => {
    const entry = DMK_MESSAGE_PATTERNS.find(
      ({ code }) => code === ErrorCode.DeviceNotReady,
    );
    expect(entry).toBeDefined();
    expect(entry?.patterns).toContain('ledger command failed');
  });

  it('every pattern maps to a valid ErrorCode', () => {
    const validCodes = Object.values(ErrorCode).filter(
      (value): value is number => typeof value === 'number',
    );
    DMK_MESSAGE_PATTERNS.forEach(({ code }) => {
      expect(validCodes).toContain(code);
    });
  });
});

describe('getDmkErrorFromTag', () => {
  it('returns DeviceDisconnected for DeviceSessionNotFound tag', () => {
    const error = {
      _tag: 'DeviceSessionNotFound',
      message: 'Session not found',
    };
    expect(getDmkErrorFromTag(error)).toStrictEqual({
      code: ErrorCode.DeviceDisconnected,
      tag: 'DeviceSessionNotFound',
    });
  });

  it('returns BluetoothConnectionFailed for ConnectionOpeningError tag', () => {
    const error = {
      _tag: 'ConnectionOpeningError',
      message: 'Failed to open connection',
    };
    expect(getDmkErrorFromTag(error)).toStrictEqual({
      code: ErrorCode.BluetoothConnectionFailed,
      tag: 'ConnectionOpeningError',
    });
  });

  it('returns DeviceDisconnected for DeviceDisconnectedWhileSendingError tag', () => {
    const error = {
      _tag: 'DeviceDisconnectedWhileSendingError',
      message: 'Disconnected',
    };
    expect(getDmkErrorFromTag(error)).toStrictEqual({
      code: ErrorCode.DeviceDisconnected,
      tag: 'DeviceDisconnectedWhileSendingError',
    });
  });

  it('returns AuthenticationDeviceLocked for DeviceLockedError tag', () => {
    const error = {
      _tag: 'DeviceLockedError',
      message: 'Device is locked',
    };
    expect(getDmkErrorFromTag(error)).toStrictEqual({
      code: ErrorCode.AuthenticationDeviceLocked,
      tag: 'DeviceLockedError',
    });
  });

  it('returns DeviceDisconnected for SessionRefresherError tag', () => {
    const error = {
      _tag: 'SessionRefresherError',
      message: 'Session refresh failed',
    };
    expect(getDmkErrorFromTag(error)).toStrictEqual({
      code: ErrorCode.DeviceDisconnected,
      tag: 'SessionRefresherError',
    });
  });

  it('returns null when _tag is not a recognised DMK tag', () => {
    const error = { _tag: 'SomeUnknownTag', message: 'Unknown' };
    expect(getDmkErrorFromTag(error)).toBeNull();
  });

  it('returns null when _tag is missing', () => {
    const error = { message: 'No tag here' };
    expect(getDmkErrorFromTag(error)).toBeNull();
  });

  it('returns null when _tag is not a string', () => {
    const error = { _tag: 42, message: 'Numeric tag' };
    expect(getDmkErrorFromTag(error)).toBeNull();
  });

  it('returns null for null input', () => {
    expect(getDmkErrorFromTag(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(getDmkErrorFromTag(undefined)).toBeNull();
  });

  it('returns null for primitive input', () => {
    expect(getDmkErrorFromTag('string error')).toBeNull();
    expect(getDmkErrorFromTag(42)).toBeNull();
  });

  it('returns null for empty string _tag', () => {
    const error = { _tag: '', message: 'Empty tag' };
    expect(getDmkErrorFromTag(error)).toBeNull();
  });

  it('handles errors with additional properties beyond _tag', () => {
    const error = {
      _tag: 'DeviceLockedError',
      message: 'Device is locked',
      name: 'SomeError',
      stack: 'trace...',
    };
    expect(getDmkErrorFromTag(error)).toStrictEqual({
      code: ErrorCode.AuthenticationDeviceLocked,
      tag: 'DeviceLockedError',
    });
  });
});
