import {
  type ErrorMapping,
  TREZOR_ERROR_MAPPINGS,
} from '@metamask/hw-wallet-sdk';
import {
  ErrorCode,
  Severity,
  Category,
  HardwareWalletError,
} from '@metamask/hw-wallet-sdk';

/**
 * Normalized identifier map for Trezor error lookup.
 * Maps normalized (lowercase, trimmed) error strings to their canonical identifiers.
 */
const NORMALIZED_IDENTIFIER_MAP = new Map<string, string>();

/**
 * Normalizes a value for case-insensitive comparison.
 *
 * @param value - The value to normalize.
 * @returns Normalized (trimmed, lowercase) string.
 */
function normalizeValue(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Registers an alias for a Trezor error identifier.
 *
 * @param alias - The alias to register.
 * @param identifier - The canonical identifier.
 */
function registerAlias(alias: string, identifier: string): void {
  const normalizedAlias = normalizeValue(alias);
  if (!normalizedAlias) {
    return;
  }
  NORMALIZED_IDENTIFIER_MAP.set(normalizedAlias, identifier);
}

// Register all Trezor error identifiers and their aliases
for (const identifier of Object.keys(TREZOR_ERROR_MAPPINGS)) {
  registerAlias(identifier, identifier);
}

// Register SDK messages as aliases
for (const [identifier, mapping] of Object.entries(TREZOR_ERROR_MAPPINGS)) {
  registerAlias(mapping.message, identifier);
}

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
    const normalizedContext = context ? normalizeValue(context) : undefined;
    const normalizedMessage = errorMapping
      ? normalizeValue(errorMapping.message)
      : undefined;
    const message =
      normalizedContext && normalizedContext !== normalizedMessage
        ? `${errorMapping.message} (${context})`
        : errorMapping.message;
    return new HardwareWalletError(message, {
      code: errorMapping.code,
      severity: errorMapping.severity,
      category: errorMapping.category,
      userMessage: errorMapping.userMessage ?? message,
      ...(cause ? { cause } : {}),
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
    ...(cause ? { cause } : {}),
  });
}
