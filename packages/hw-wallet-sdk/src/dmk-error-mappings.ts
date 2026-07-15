import type { ErrorMapping } from './hardware-error-mappings';
import { Category, ErrorCode, Severity } from './hardware-errors-enums';

/**
 * Full DMK (Device Management Kit) `_tag`-based error mappings.
 *
 * DMK is Ledger's newer SDK. Unlike legacy `@ledgerhq/errors`, which identify
 * errors via the standard `error.name` property, DMK errors carry a
 * non-standard `_tag` string (e.g. `'DeviceSessionNotFound'`,
 * `'DeviceLockedError'`). Tag values are looked up in this mapping to resolve
 * the full {@link ErrorMapping} (code, message, severity, category,
 * userMessage).
 *
 * This is the single source of truth for DMK tag → error details. The
 * code-only {@link DMK_ERROR_TAG_MAPPINGS} is derived from this object so
 * consumers that only need the `ErrorCode` (e.g. MetaMask Mobile) can use the
 * simpler mapping without duplicating data.
 *
 * These mappings are shared with legacy error names in consumers (e.g.
 * MetaMask Mobile) since both map to the same `ErrorCode` values.
 */
export const DMK_ERROR_MAPPINGS: Record<string, ErrorMapping> = {
  DeviceSessionNotFound: {
    code: ErrorCode.DeviceDisconnected,
    message: 'DMK device session not found',
    severity: Severity.Err,
    category: Category.Connection,
    userMessage:
      'Your Ledger device was disconnected. Please reconnect and try again.',
  },
  ConnectionOpeningError: {
    code: ErrorCode.BluetoothConnectionFailed,
    message: 'DMK connection failed to open',
    severity: Severity.Err,
    category: Category.Connection,
    userMessage:
      'Failed to connect to your Ledger device. Please make sure it is nearby and try again.',
  },
  DeviceDisconnectedWhileSendingError: {
    code: ErrorCode.DeviceDisconnected,
    message: 'DMK device disconnected while sending',
    severity: Severity.Err,
    category: Category.Connection,
    userMessage:
      'Your Ledger device was disconnected. Please reconnect and try again.',
  },
  DeviceDisconnectedBeforeSendingApdu: {
    code: ErrorCode.DeviceDisconnected,
    message: 'DMK device disconnected before sending',
    severity: Severity.Err,
    category: Category.Connection,
    userMessage:
      'Your Ledger device was disconnected. Please reconnect and try again.',
  },
  DeviceLockedError: {
    code: ErrorCode.AuthenticationDeviceLocked,
    message: 'DMK device locked',
    severity: Severity.Err,
    category: Category.Authentication,
    userMessage: 'Please unlock your Ledger device to continue.',
  },
  DeviceNotConnectedError: {
    code: ErrorCode.DeviceDisconnected,
    message: 'DMK device not connected',
    severity: Severity.Err,
    category: Category.Connection,
    userMessage:
      'Your Ledger device is not connected. Please connect and try again.',
  },
  SessionRefresherError: {
    code: ErrorCode.DeviceDisconnected,
    message: 'DMK session refresh failed',
    severity: Severity.Err,
    category: Category.Connection,
    userMessage:
      'Your Ledger device session has expired. Please reconnect and try again.',
  },
};

/**
 * DMK `_tag`-to-`ErrorCode` mappings.
 *
 * Derived from {@link DMK_ERROR_MAPPINGS} so there is a single source of truth
 * for tag → code resolution. Consumers that only need the numeric `ErrorCode`
 * (e.g. MetaMask Mobile) can use this lightweight mapping directly.
 */
export const DMK_ERROR_TAG_MAPPINGS: Record<string, ErrorCode> =
  Object.fromEntries(
    Object.entries(DMK_ERROR_MAPPINGS).map(([tag, { code }]) => [tag, code]),
  );

/**
 * DMK-specific message patterns for error parsing.
 *
 * Each entry maps one or more case-insensitive message substrings to an
 * `ErrorCode`. Used as a fallback when neither `error.name` nor `_tag` is
 * recognised, but the error message contains DMK-specific phrasing.
 */
export const DMK_MESSAGE_PATTERNS: readonly {
  patterns: string[];
  code: ErrorCode;
}[] = [
  {
    patterns: [
      'session not found',
      'sessionid is not initialized',
      'invalid session',
    ],
    code: ErrorCode.DeviceDisconnected,
  },
  {
    patterns: ['device action ended without completion'],
    code: ErrorCode.DeviceUnresponsive,
  },
  {
    patterns: ['ledger command failed'],
    code: ErrorCode.DeviceNotReady,
  },
];

/**
 * Result of resolving a DMK error from its `_tag` property.
 */
export type DMKTagResolution = {
  code: ErrorCode;
  tag: string;
};

/**
 * Parse a DMK (Device Management Kit) error by its `_tag` property.
 *
 * DMK errors carry a non-standard `_tag` string. This function extracts the
 * tag and looks it up in {@link DMK_ERROR_TAG_MAPPINGS} to resolve the
 * corresponding `ErrorCode`.
 *
 * @param error - The error object to parse.
 * @returns The resolved `ErrorCode` and the original tag string, or `null`
 * if no `_tag` is present or the tag is not recognised.
 */
export function getDmkErrorFromTag(error: unknown): DMKTagResolution | null {
  if (error === null || typeof error !== 'object') {
    return null;
  }

  const errorObj = error as Record<string, unknown>;
  const tag =
    '_tag' in errorObj && typeof errorObj._tag === 'string'
      ? errorObj._tag
      : null;

  if (!tag) {
    return null;
  }

  const code = DMK_ERROR_TAG_MAPPINGS[tag];
  if (code === undefined) {
    return null;
  }

  return { code, tag };
}
