import { ErrorCode, Severity, Category } from './hardware-errors-enums';

export type ErrorMapping = {
  code: ErrorCode;
  message: string;
  severity: Severity;
  category: Category;
  userMessage?: string;
};

export const LEDGER_ERROR_MAPPINGS: Record<string, ErrorMapping> = {
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
    code: ErrorCode.DeviceStateEthAppClosed,
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
  '0x6a83': {
    code: ErrorCode.DeviceStateEthAppClosed,
    message: 'Ethereum app closed',
    severity: Severity.Err,
    category: Category.DeviceState,
    userMessage:
      'Ethereum app is closed. Currently on solana. Please open it to continue.',
  },
  '0x6d00': {
    code: ErrorCode.DeviceStateEthAppClosed,
    message: 'Ledger Only V4 supported',
    severity: Severity.Err,
    category: Category.DeviceState,
    userMessage:
      'Ethereum app is closed. Currently on bitcoin. Please open it to continue.',
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
  '0x6f00': {
    code: ErrorCode.DeviceUnresponsive,
    message: 'Device unresponsive',
    severity: Severity.Err,
    category: Category.DeviceState,
    userMessage:
      'Your device is not responding. Please disconnect and reconnect your device.',
  },
  '0x6b0c': {
    code: ErrorCode.AuthenticationDeviceLocked,
    message: 'Device locked',
    severity: Severity.Err,
    category: Category.Authentication,
    userMessage: 'Please unlock your Ledger device to continue.',
  },
  '0x6a15': {
    code: ErrorCode.DeviceStateEthAppClosed,
    message: 'Ethereum app closed',
    severity: Severity.Err,
    category: Category.DeviceState,
    userMessage: 'Ethereum app is closed. Please open it to continue.',
  },
  '0x6511': {
    code: ErrorCode.DeviceStateEthAppClosed,
    message: 'Ethereum app closed',
    severity: Severity.Err,
    category: Category.DeviceState,
    userMessage: 'Ethereum app is closed. Please open it to continue.',
  },
};

export const BLE_ERROR_MAPPINGS = {
  BLUETOOTH_PERMISSION_DENIED: {
    code: ErrorCode.PermissionBluetoothDenied,
    message: 'Bluetooth permission denied',
    severity: Severity.Err,
    category: Category.Configuration,
    userMessage:
      'Bluetooth permission is required to connect to your hardware wallet. Please enable it in your device settings.',
  },
  LOCATION_PERMISSION_DENIED: {
    code: ErrorCode.PermissionLocationDenied,
    message: 'Location permission denied',
    severity: Severity.Err,
    category: Category.Configuration,
    userMessage:
      'Location permission is required for Bluetooth scanning on Android. Please enable it in your device settings.',
  },
  NEARBY_DEVICES_PERMISSION_DENIED: {
    code: ErrorCode.PermissionNearbyDevicesDenied,
    message: 'Nearby devices permission denied',
    severity: Severity.Err,
    category: Category.Configuration,
    userMessage:
      'Nearby devices permission is required to scan for your hardware wallet. Please enable it in your device settings.',
  },
  BLUETOOTH_DISABLED: {
    code: ErrorCode.BluetoothDisabled,
    message: 'Bluetooth is turned off',
    severity: Severity.Warning,
    category: Category.Connection,
    userMessage:
      'Bluetooth is turned off. Please enable Bluetooth to connect to your hardware wallet.',
  },
  BLUETOOTH_SCAN_FAILED: {
    code: ErrorCode.BluetoothScanFailed,
    message: 'Bluetooth scanning failed',
    severity: Severity.Err,
    category: Category.Connection,
    userMessage: 'Unable to scan for Bluetooth devices. Please try again.',
  },
  BLUETOOTH_CONNECTION_FAILED: {
    code: ErrorCode.BluetoothConnectionFailed,
    message: 'Bluetooth connection failed',
    severity: Severity.Err,
    category: Category.Connection,
    userMessage:
      'Failed to connect via Bluetooth. Please make sure your device is nearby and try again.',
  },
};

export const MOBILE_ERROR_MAPPINGS = {
  NOT_SUPPORTED: {
    code: ErrorCode.MobileNotSupported,
    message: 'Operation not supported on mobile',
    severity: Severity.Err,
    category: Category.DeviceState,
    userMessage: 'This operation is not supported on mobile devices.',
  },
};
