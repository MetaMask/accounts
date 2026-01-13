// Error Code Enum
export enum ErrorCode {
  // Success
  Success = 0,

  // Authentication
  AuthFailed = 1000,
  AuthIncorrectPin = 1001,
  AuthPinAttemptsRemaining = 1002,
  AuthPinCancelled = 1003,
  AuthDeviceLocked = 1100,
  AuthDeviceBlocked = 1101,
  AuthSecurityCondition = 1200,
  AuthWipeCodeMismatch = 1300,

  // User action
  UserRejected = 2000,
  UserCancelled = 2001,
  UserConfirmationRequired = 2002,
  UserInputRequired = 2003,

  // Device state
  DeviceNotReady = 3000,
  DeviceInvalidSession = 3001,
  DeviceDisconnected = 3003,
  DeviceUsedElsewhere = 3004,
  DeviceCallInProgress = 3005,
  DeviceNotFound = 3010,
  DeviceMultipleConnected = 3011,
  DeviceMissingCapability = 3020,
  DeviceBtcOnlyFirmware = 3021,
  DeviceIncompatibleMode = 3030,

  // Connection & transport
  ConnTransportMissing = 4000,
  ConnClosed = 4001,
  ConnTimeout = 4002,
  ConnBlocked = 4003,

  // Protocol
  ProtoUnexpectedMessage = 5000,
  ProtoCommandError = 5001,
  ProtoMessageError = 5002,

  // Device state
  DeviceStateBlindSignNotSupported = 6001,
  DeviceStateOnlyV4Supported = 6002,
  DeviceStateEthAppClosed = 6003,
  DeviceStateEthAppOutOfDate = 6004,

  // Transaction
  TxInsufficientFunds = 10000,

  // Unknown/fallback
  Unknown = 99999,
}

// Severity Enum
export enum Severity {
  Info = 'Info',
  Err = 'Error',
  Warning = 'Warning',
  Critical = 'Critical',
}

// Category Enum
export enum Category {
  Success = 'Success',
  Authentication = 'Authentication',
  Protocol = 'Protocol',
  Connection = 'Connection',
  UserAction = 'UserAction',
  DeviceState = 'DeviceState',
  Unknown = 'Unknown',
}
