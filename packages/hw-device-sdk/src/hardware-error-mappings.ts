/* eslint-disable @typescript-eslint/naming-convention */
import { ErrorCode, Severity, Category } from './hardware-errors-enums';

export const LEDGER_ERROR_MAPPINGS = {
  '0x9000': {
    code: ErrorCode.Success,
    message: 'Operation successful',
    severity: Severity.Info,
    category: Category.Success,
  },
  '0x6300': {
    code: ErrorCode.AuthenticationFailed,
    message: 'Authentication failed',
    severity: Severity.Err,
    category: Category.Authentication,
    userMessage: 'Authentication failed. Please verify your credentials.',
  },
  '0x63c0': {
    code: ErrorCode.AuthenticationPinAttemptsRemaining,
    message: 'PIN attempts remaining',
    severity: Severity.Warning,
    category: Category.Authentication,
    userMessage: 'Incorrect PIN. Please try again.',
  },
  '0x6982': {
    code: ErrorCode.AuthenticationSecurityCondition,
    message: 'Security conditions not satisfied',
    severity: Severity.Err,
    category: Category.Authentication,

    userMessage:
      'Device is locked or access rights are insufficient. Please unlock your device.',
  },
  '0x6985': {
    code: ErrorCode.UserRejected,
    message: 'User rejected action on device',
    severity: Severity.Warning,
    category: Category.UserAction,

    userMessage:
      'Transaction was rejected. Please approve on your device to continue.',
  },
  '0x9804': {
    code: ErrorCode.AuthenticationSecurityCondition,
    message: 'App update required',
    severity: Severity.Err,
    category: Category.Authentication,

    userMessage: 'Please update your Ledger app to continue.',
  },
  '0x9808': {
    code: ErrorCode.AuthenticationFailed,
    message: 'Contradiction in secret code status',
    severity: Severity.Err,
    category: Category.Authentication,
  },
  '0x9840': {
    code: ErrorCode.AuthenticationDeviceBlocked,
    message: 'Code blocked',
    severity: Severity.Critical,
    category: Category.Authentication,

    userMessage:
      'Your device is blocked due to too many failed attempts. Please follow device recovery procedures.',
  },
  '0x650f': {
    code: ErrorCode.ConnectionClosed,
    message: 'App closed or connection issue',
    severity: Severity.Err,
    category: Category.Connection,
    userMessage:
      'Connection lost or app closed. Please open the corresponding app on your Ledger device.',
  },
  '0x5515': {
    code: ErrorCode.AuthenticationDeviceLocked,
    message: 'Device is locked',
    severity: Severity.Err,
    category: Category.Authentication,
    userMessage: 'Please unlock your Ledger device to continue.',
  },
  '0x5501': {
    code: ErrorCode.UserRejected,
    message: 'User refused on device',
    severity: Severity.Warning,
    category: Category.UserAction,
    userMessage:
      'Operation was rejected. Please approve on your device to continue.',
  },
  '0x6a80': {
    code: ErrorCode.DeviceStateBlindSignNotSupported,
    message: 'Blind signing not supported',
    severity: Severity.Err,
    category: Category.DeviceState,
    userMessage: 'Blind signing is not supported on this device.',
  },
  '0x6d00': {
    code: ErrorCode.DeviceStateOnlyV4Supported,
    message: 'Ledger Only V4 supported',
    severity: Severity.Err,
    category: Category.DeviceState,
    userMessage: 'Only V4 is supported on this device.',
  },
  '0x6e00': {
    code: ErrorCode.DeviceStateEthAppClosed,
    message: 'Ethereum app closed',
    severity: Severity.Err,
    category: Category.DeviceState,
    userMessage: 'Ethereum app is closed. Please open it to continue.',
  },
  '0x6501': {
    code: ErrorCode.DeviceStateEthAppOutOfDate,
    message: 'Ethereum app out of date',
    severity: Severity.Err,
    category: Category.DeviceState,
    userMessage: 'Ethereum app is out of date. Please update it to continue.',
  },
};
