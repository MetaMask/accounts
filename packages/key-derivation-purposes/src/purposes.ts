import type { KeyDerivationPurpose } from './types';

/**
 * Owner: Money Accounts.
 * Intended use: encrypt MPC device-share backups for MFA recovery.
 * Key type: 32-byte symmetric encryption key.
 * Scheme: ADR-0009, `m/meta'/mask'/keys'/index'`, then HKDF-SHA256 via
 * `deriveEncryptionKey` in `@metamask/keyring-sdk`.
 * This purpose string is immutable; a new use/version requires a new constant.
 */
export const MONEY_ACCOUNT_MFA_ENCRYPTION_KEY_PURPOSE =
  'metamask:money-account:mfa:encryption-key:v1' satisfies KeyDerivationPurpose;
