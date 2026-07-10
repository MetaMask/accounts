import { ErrorCode } from './hardware-errors-enums';

/**
 * DMK (Device Management Kit) `_tag`-based error name mappings.
 *
 * DMK is Ledger's newer SDK. Unlike legacy `@ledgerhq/errors`, which identify
 * errors via the standard `error.name` property, DMK errors carry a
 * non-standard `_tag` string (e.g. `'DeviceSessionNotFound'`,
 * `'DeviceLockedError'`). Tag values are looked up in this mapping to resolve
 * the corresponding `ErrorCode`.
 *
 * These mappings are shared with legacy error names in consumers (e.g.
 * MetaMask Mobile) since both map to the same `ErrorCode` values.
 */
export const DMK_ERROR_TAG_MAPPINGS: Record<string, ErrorCode> = {
  DeviceSessionNotFound: ErrorCode.DeviceDisconnected,
  ConnectionOpeningError: ErrorCode.BluetoothConnectionFailed,
  DeviceDisconnectedWhileSendingError: ErrorCode.DeviceDisconnected,
  DeviceDisconnectedBeforeSendingApdu: ErrorCode.DeviceDisconnected,
  DeviceLockedError: ErrorCode.AuthenticationDeviceLocked,
  DeviceNotConnectedError: ErrorCode.DeviceDisconnected,
  SessionRefresherError: ErrorCode.DeviceDisconnected,
};

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
export function getDMKErrorFromTag(error: unknown): DMKTagResolution | null {
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
