import {
  type ErrorMapping,
  ErrorCode,
  Severity,
  Category,
  HardwareWalletError,
} from '@metamask/hw-wallet-sdk';
import { ERRORS } from '@trezor/connect-web';

const TREZOR_ERROR_OVERRIDES: Partial<Record<string, ErrorMapping>> = {
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
};

const TREZOR_ERROR_CODES = ERRORS.ERROR_CODES as Record<string, string>;
const TREZOR_ERROR_MAPPINGS: Record<string, ErrorMapping> = Object.fromEntries(
  Object.entries(TREZOR_ERROR_CODES).map(([identifier, sdkMessage]) => [
    identifier,
    TREZOR_ERROR_OVERRIDES[identifier] ?? {
      code: ErrorCode.Unknown,
      message: sdkMessage || `Trezor error (${identifier})`,
      severity: Severity.Err,
      category: Category.Unknown,
      userMessage:
        sdkMessage ||
        `A Trezor error occurred (${identifier}). Please try again.`,
    },
  ]),
);

const NORMALIZED_IDENTIFIER_MAP = new Map<string, string>();

function normalizeValue(value: string): string {
  return value.trim().toLowerCase();
}

function registerAlias(alias: string, identifier: string): void {
  const normalizedAlias = normalizeValue(alias);
  if (!normalizedAlias) {
    return;
  }
  NORMALIZED_IDENTIFIER_MAP.set(normalizedAlias, identifier);
}

for (const identifier of Object.keys(TREZOR_ERROR_MAPPINGS)) {
  registerAlias(identifier, identifier);
}

for (const [identifier, message] of Object.entries(TREZOR_ERROR_CODES)) {
  registerAlias(message, identifier);
}

registerAlias(ERRORS.LIBUSB_ERROR_MESSAGE, 'Transport_Missing');

/**
 * Checks if a Trezor error identifier has a known mapping.
 *
 * @param identifier - The identifier to check.
 * @returns True if identifier is mapped, false otherwise.
 */
export function isKnownTrezorError(identifier: string): boolean {
  return NORMALIZED_IDENTIFIER_MAP.has(normalizeValue(identifier));
}

/**
 * Gets mapped error details for a Trezor identifier.
 *
 * @param identifier - The identifier to look up.
 * @returns The mapped error details, if available.
 */
export function getTrezorErrorMapping(
  identifier: string,
): ErrorMapping | undefined {
  const normalizedIdentifier = normalizeValue(identifier);
  const mappedIdentifier = NORMALIZED_IDENTIFIER_MAP.get(normalizedIdentifier);
  if (!mappedIdentifier) {
    return undefined;
  }
  return TREZOR_ERROR_MAPPINGS[mappedIdentifier];
}

/**
 * Resolves a deterministic Trezor error identifier from raw text.
 *
 * @param rawValue - A code/name string.
 * @returns The mapped identifier if matched, otherwise undefined.
 */
export function getTrezorErrorIdentifier(
  rawValue: string | undefined,
): string | undefined {
  if (!rawValue) {
    return undefined;
  }
  return NORMALIZED_IDENTIFIER_MAP.get(normalizeValue(rawValue));
}

/**
 * Factory to create a typed HardwareWalletError for Trezor errors.
 *
 * @param identifier - Mapped Trezor identifier.
 * @param context - Optional extra context appended to the message.
 * @param cause - Optional original cause error.
 * @returns A typed HardwareWalletError.
 */
export function createTrezorError(
  identifier: string,
  context?: string,
  cause?: Error,
): HardwareWalletError {
  const errorMapping = getTrezorErrorMapping(identifier);

  if (errorMapping) {
    const normalizedContext = context?.trim().toLowerCase();
    const normalizedMessage = errorMapping.message.toLowerCase();
    const message =
      normalizedContext && normalizedContext !== normalizedMessage
        ? `${errorMapping.message} (${context})`
        : errorMapping.message;
    return new HardwareWalletError(message, {
      code: errorMapping.code,
      severity: errorMapping.severity,
      category: errorMapping.category,
      userMessage: errorMapping.userMessage ?? message,
      cause,
    });
  }

  const fallbackMessage = context
    ? `Unknown Trezor error: ${identifier} (${context})`
    : `Unknown Trezor error: ${identifier}`;
  return new HardwareWalletError(fallbackMessage, {
    code: ErrorCode.Unknown,
    severity: Severity.Err,
    category: Category.Unknown,
    userMessage: fallbackMessage,
    cause,
  });
}
