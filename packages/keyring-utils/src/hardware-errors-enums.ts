// Error Code Enum
export enum ErrorCode {
  // Success
  Success = 0,

  // Authentication
  AuthFailed = 1000,
  AuthIncorrectPin = 1001,
  AuthPinAttemptsRemaining = 1002,
  AuthPinCancelled = 1003,
  AuthPinMismatch = 1004,
  AuthDeviceLocked = 1010,
  AuthDeviceBlocked = 1011,
  AuthSecurityCondition = 1020,
  AuthWipeCodeMismatch = 1030,

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
  ConnIframeMissing = 4010,
  ConnSuiteMissing = 4011,

  // Protocol
  ProtoUnexpectedMessage = 5000,
  ProtoCommandError = 5001,
  ProtoMessageError = 5002,

  // Transaction
  TxInsufficientFunds = 10000,

  // Unknown/fallback
  Unknown = 99999,
}

// Severity Enum
export enum Severity {
  Info = 'Info',
  Err = 'Err',
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

// Retry Strategy Enum
export enum RetryStrategy {
  NoRetry = 'NoRetry',
  Retry = 'Retry',
  ExponentialBackoff = 'ExponentialBackoff',
}
