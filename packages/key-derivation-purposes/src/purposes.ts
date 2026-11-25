import type { KeyDerivationPurpose } from './types';

/**
 * Owner: Money Accounts.
 * Intended use: wrap MPC device-share backups for MFA recovery using AES-GCM.
 * Key type: 32-byte symmetric wrapping key (not AES-KW or AES-KWP).
 * Scheme: BIP-85 at `m/83696968'/META'/MASK'/index'`, then
 * HKDF-SHA256 via `KeyRoot.deriveEncryptionKey` in `@metamask/keyring-sdk`.
 * This purpose string is immutable; a new use/version requires a new constant.
 */
export const MONEY_ACCOUNT_MPC_DEVICE_SHARE_WRAPPING_KEY_PURPOSE =
  'metamask:money-account:mpc:device-share:wrapping-key:v1' satisfies KeyDerivationPurpose;
