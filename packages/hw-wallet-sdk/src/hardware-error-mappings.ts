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
    message: 'Ethereum app closed',
    severity: Severity.Err,
    category: Category.DeviceState,
    userMessage:
      'Ethereum app is closed. Please open it on your Ledger device to continue.',
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
    message: 'Ethereum app closed',
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
  CAMERA_PERMISSION_DENIED: {
    code: ErrorCode.PermissionCameraDenied,
    message: 'Camera permission denied',
    severity: Severity.Err,
    category: Category.Configuration,
    userMessage:
      'Camera permission is required to scan QR codes. Please enable it in your device settings.',
  },
  NOT_SUPPORTED: {
    code: ErrorCode.MobileNotSupported,
    message: 'Operation not supported on mobile',
    severity: Severity.Err,
    category: Category.DeviceState,
    userMessage: 'This operation is not supported on mobile devices.',
  },
};

/**
 * QR error mappings - static error data for QR hardware wallets and their related flows.
 */
export const QR_WALLET_ERROR_MAPPINGS: Record<string, ErrorMapping> = {
  CAMERA_PERMISSION_PROMPT_DISMISSED: {
    code: ErrorCode.PermissionCameraPromptDismissed,
    message: 'Camera permission prompt dismissed without granting access',
    severity: Severity.Warning,
    category: Category.Configuration,
    userMessage:
      'MetaMask needs camera access to scan the QR code on your device.',
  },
  CAMERA_PERMISSION_BLOCKED: {
    code: ErrorCode.PermissionCameraDenied,
    message: 'Camera permission blocked by the browser',
    severity: Severity.Err,
    category: Category.Configuration,
    userMessage: 'To continue, allow camera access in your browser settings.',
  },
};

/**
 * Trezor error mappings - static error data for Trezor hardware wallets.
 * These mappings provide consistent error classification across Trezor integrations.
 */
export const TREZOR_ERROR_MAPPINGS: Record<string, ErrorMapping> = {
  Transport_Missing: {
    code: ErrorCode.ConnectionTransportMissing,
    message: 'Trezor transport is unavailable',
    severity: Severity.Err,
    category: Category.Connection,
    userMessage:
      'Unable to connect to your Trezor device. Please reconnect and try again.',
  },
  Device_Disconnected: {
    code: ErrorCode.DeviceDisconnected,
    message: 'Trezor device disconnected',
    severity: Severity.Err,
    category: Category.Connection,
    userMessage:
      'Your Trezor device was disconnected. Please reconnect and try again.',
  },
  Popup_ConnectionMissing: {
    code: ErrorCode.ConnectionClosed,
    message: 'Trezor popup connection unavailable',
    severity: Severity.Err,
    category: Category.Connection,
    userMessage: 'Connection to your Trezor device popup failed. Please retry.',
  },
  Desktop_ConnectionMissing: {
    code: ErrorCode.ConnectionClosed,
    message: 'Trezor desktop connection unavailable',
    severity: Severity.Err,
    category: Category.Connection,
    userMessage:
      'Connection to Trezor Suite failed. Please retry with your device connected.',
  },
  Method_Interrupted: {
    code: ErrorCode.ConnectionClosed,
    message: 'Trezor action was interrupted',
    severity: Severity.Err,
    category: Category.Connection,
    userMessage:
      'Connection to your Trezor device was closed. Please reconnect and try again.',
  },
  Method_Cancel: {
    code: ErrorCode.UserCancelled,
    message: 'User cancelled action on Trezor device',
    severity: Severity.Warning,
    category: Category.UserAction,
    userMessage: 'Action was cancelled on your Trezor device.',
  },
  Method_PermissionsNotGranted: {
    code: ErrorCode.UserRejected,
    message: 'Permission not granted on Trezor device',
    severity: Severity.Warning,
    category: Category.UserAction,
    userMessage: 'Permission was rejected on your Trezor device.',
  },
  Failure_ActionCancelled: {
    code: ErrorCode.UserCancelled,
    message: 'User cancelled action on Trezor device',
    severity: Severity.Warning,
    category: Category.UserAction,
    userMessage: 'Action was cancelled on your Trezor device.',
  },
  Device_InvalidState: {
    code: ErrorCode.AuthenticationFailed,
    message: 'Trezor device authentication failed',
    severity: Severity.Err,
    category: Category.Authentication,
    userMessage:
      'Authentication failed on your Trezor device. Check your passphrase and retry.',
  },
  Device_CallInProgress: {
    code: ErrorCode.DeviceCallInProgress,
    message: 'Trezor device call already in progress',
    severity: Severity.Err,
    category: Category.DeviceState,
    userMessage:
      'Your Trezor device is busy. Finish the current action and retry.',
  },
  Init_IframeTimeout: {
    code: ErrorCode.ConnectionTimeout,
    message: 'Trezor connection timed out',
    severity: Severity.Err,
    category: Category.Connection,
    userMessage:
      'Connection to your Trezor device timed out. Please try again.',
  },
  Init_IframeBlocked: {
    code: ErrorCode.ConnectionBlocked,
    message: 'Trezor iframe blocked',
    severity: Severity.Err,
    category: Category.Connection,
    userMessage:
      'Trezor connection popup was blocked. Please allow popups and try again.',
  },
  Init_ManifestMissing: {
    code: ErrorCode.Unknown,
    message: 'Trezor manifest is missing',
    severity: Severity.Err,
    category: Category.Configuration,
    userMessage:
      'Trezor integration is not configured correctly. Please retry later.',
  },
  Device_NotFound: {
    code: ErrorCode.DeviceNotFound,
    message: 'Trezor device not found',
    severity: Severity.Err,
    category: Category.Connection,
    userMessage:
      'No Trezor device found. Please connect your device and try again.',
  },
  Device_UsedElsewhere: {
    code: ErrorCode.DeviceUsedElsewhere,
    message: 'Trezor device is used elsewhere',
    severity: Severity.Err,
    category: Category.DeviceState,
    userMessage:
      'Your Trezor device is busy in another window. Close the other flow and try again.',
  },
  Device_MultipleNotSupported: {
    code: ErrorCode.DeviceMultipleConnected,
    message: 'Multiple Trezor devices are not supported',
    severity: Severity.Err,
    category: Category.DeviceState,
    userMessage:
      'Multiple Trezor devices are connected. Keep one connected and retry.',
  },
  Device_MissingCapability: {
    code: ErrorCode.DeviceMissingCapability,
    message: 'Trezor device is missing capability',
    severity: Severity.Err,
    category: Category.DeviceState,
    userMessage:
      'Your Trezor firmware does not support this action. Please update and retry.',
  },
  Device_MissingCapabilityBtcOnly: {
    code: ErrorCode.DeviceBtcOnlyFirmware,
    message: 'Trezor device firmware only supports BTC',
    severity: Severity.Err,
    category: Category.DeviceState,
    userMessage:
      'Your Trezor firmware currently supports BTC only. Update firmware and retry.',
  },
  Failure_PinCancelled: {
    code: ErrorCode.AuthenticationPinCancelled,
    message: 'Trezor PIN entry cancelled',
    severity: Severity.Warning,
    category: Category.Authentication,
    userMessage: 'PIN entry was cancelled on your Trezor device.',
  },
  Failure_PinInvalid: {
    code: ErrorCode.AuthenticationIncorrectPin,
    message: 'Trezor PIN is invalid',
    severity: Severity.Err,
    category: Category.Authentication,
    userMessage: 'The PIN is incorrect. Please try again.',
  },
  Failure_PinMismatch: {
    code: ErrorCode.AuthenticationIncorrectPin,
    message: 'Trezor PIN mismatch',
    severity: Severity.Err,
    category: Category.Authentication,
    userMessage: 'The PIN does not match. Please try again.',
  },
  Failure_WipeCodeMismatch: {
    code: ErrorCode.AuthenticationWipeCodeMismatch,
    message: 'Trezor wipe code mismatch',
    severity: Severity.Err,
    category: Category.Authentication,
    userMessage: 'The wipe code does not match. Please verify and try again.',
  },
  Device_ModeException: {
    code: ErrorCode.DeviceIncompatibleMode,
    message: 'Trezor device mode is incompatible',
    severity: Severity.Err,
    category: Category.DeviceState,
    userMessage:
      'Your Trezor is in an incompatible mode for this action. Check the device and retry.',
  },
  Device_ThpPairingTagInvalid: {
    code: ErrorCode.AuthenticationSecurityCondition,
    message: 'Trezor pairing security check failed',
    severity: Severity.Err,
    category: Category.Authentication,
    userMessage:
      'A security check failed on your Trezor device. Reconnect and try again.',
  },
  Backend_Disconnected: {
    code: ErrorCode.ConnectionClosed,
    message: 'Trezor backend disconnected',
    severity: Severity.Err,
    category: Category.Connection,
    userMessage: 'Trezor backend disconnected. Please retry.',
  },
  Method_NoResponse: {
    code: ErrorCode.ConnectionClosed,
    message: 'Trezor call returned no response',
    severity: Severity.Err,
    category: Category.Connection,
    userMessage:
      'Trezor did not return a response. Reconnect your device and try again.',
  },
  Device_InitializeFailed: {
    code: ErrorCode.AuthenticationDeviceLocked,
    message: 'Trezor device initialization failed',
    severity: Severity.Err,
    category: Category.Authentication,
    userMessage:
      'Your Trezor device failed to initialize. Please unlock it and try again.',
  },
};

