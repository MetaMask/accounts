// Error Code Enum
export enum ErrorCode {
  // Authentication & Security
  AuthPin001 = 'AuthPin001',
  AuthPin002 = 'AuthPin002',
  AuthPin003 = 'AuthPin003',
  AuthPin004 = 'AuthPin004',
  AuthLock001 = 'AuthLock001',
  AuthLock002 = 'AuthLock002',
  AuthSec001 = 'AuthSec001',
  AuthSec002 = 'AuthSec002',
  AuthWipe001 = 'AuthWipe001',

  // User Action
  UserCancel001 = 'UserCancel001',
  UserCancel002 = 'UserCancel002',
  UserInput001 = 'UserInput001',
  UserConfirm001 = 'UserConfirm001',

  // Device State
  DeviceState001 = 'DeviceState001',
  DeviceState002 = 'DeviceState002',
  DeviceState003 = 'DeviceState003',
  DeviceState004 = 'DeviceState004',
  DeviceState005 = 'DeviceState005',
  DeviceDetect001 = 'DeviceDetect001',
  DeviceCap001 = 'DeviceCap001',
  DeviceCap002 = 'DeviceCap002',
  DeviceMode001 = 'DeviceMode001',

  // Connection & Transport
  ConnTransport001 = 'ConnTransport001',
  ConnClosed001 = 'ConnClosed001',
  ConnIframe001 = 'ConnIframe001',
  ConnSuite001 = 'ConnSuite001',
  ConnTimeout001 = 'ConnTimeout001',
  ConnBlocked001 = 'ConnBlocked001',

  // Data & Validation
  DataFormat001 = 'DataFormat001',
  DataFormat002 = 'DataFormat002',
  DataFormat003 = 'DataFormat003',
  DataMissing001 = 'DataMissing001',
  DataValidation001 = 'DataValidation001',
  DataValidation002 = 'DataValidation002',
  DataNotfound001 = 'DataNotfound001',
  DataNotfound002 = 'DataNotfound002',
  DataNotfound003 = 'DataNotfound003',

  // Cryptographic Operations
  CryptoSign001 = 'CryptoSign001',
  CryptoAlgo001 = 'CryptoAlgo001',
  CryptoKey001 = 'CryptoKey001',
  CryptoEntropy001 = 'CryptoEntropy001',

  // System & Internal
  SysInternal001 = 'SysInternal001',
  SysMemory001 = 'SysMemory001',
  SysMemory002 = 'SysMemory002',
  SysFile001 = 'SysFile001',
  SysFile002 = 'SysFile002',
  SysLicense001 = 'SysLicense001',
  SysFirmware001 = 'SysFirmware001',
  SysFirmware002 = 'SysFirmware002',

  // Command & Protocol
  ProtoCmd001 = 'ProtoCmd001',
  ProtoCmd002 = 'ProtoCmd002',
  ProtoCmd003 = 'ProtoCmd003',
  ProtoMsg001 = 'ProtoMsg001',
  ProtoParam001 = 'ProtoParam001',

  // Configuration & Initialization
  ConfigInit001 = 'ConfigInit001',
  ConfigInit002 = 'ConfigInit002',
  ConfigInit003 = 'ConfigInit003',
  ConfigPerm001 = 'ConfigPerm001',
  ConfigMethod001 = 'ConfigMethod001',

  // Transaction
  TxFunds001 = 'TxFunds001',
  TxFail001 = 'TxFail001',

  // Success
  Success000 = 'Success000',

  // Unknown/Fallback
  Unknown001 = 'Unknown001',
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
  DataValidation = 'DataValidation',
  Protocol = 'Protocol',
  System = 'System',
  Cryptography = 'Cryptography',
  Configuration = 'Configuration',
  Connection = 'Connection',
  UserAction = 'UserAction',
  DeviceState = 'DeviceState',
  Transaction = 'Transaction',
  Unknown = 'Unknown',
}

// Retry Strategy Enum
export enum RetryStrategy {
  NoRetry = 'NoRetry',
  Retry = 'Retry',
  ExponentialBackoff = 'ExponentialBackoff',
}
