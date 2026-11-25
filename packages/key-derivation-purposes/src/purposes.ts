import type { KeyDerivationPurpose } from './types';

/**
 * Owner: Money Accounts.
 * Intended use: encrypt MPC device-share backups for MFA recovery.
 * Key type: 32-byte symmetric encryption key.
 * Scheme: ADR-0009, BIP-85 at `m/83696968'/META'/MASK'/index'`, then
 * HKDF-SHA256 via `KeyRoot.deriveEncryptionKey` in `@metamask/keyring-sdk`.
 * This purpose string is immutable; a new use/version requires a new constant.
 */
export const MONEY_ACCOUNT_MPC_DEVICE_SHARE_ENCRYPTION_KEY_PURPOSE =
  'metamask:money-account:mpc:device-share:encryption-key:v1' satisfies KeyDerivationPurpose;
