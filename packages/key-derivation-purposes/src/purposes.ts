import type { KeyDerivationPurpose } from './types';

/**
 * Registered purposes for domain-separated secret derivation.
 */
export const Purpose = {
  /**
   * Owner: Money Accounts.
   * Intended use: wrap MPC device-share backups for MFA recovery using AES-GCM.
   * Key type: 32-byte symmetric wrapping key (not AES-KW or AES-KWP).
   * Scheme: BIP-85 at `m/83696968'/META'/MASK'/index'`, then
   * HKDF-SHA256 via `KeyRoot.deriveSecret` with length 32 in `@metamask/keyring-sdk`.
   * This purpose string is immutable; a new use/version requires a new member.
   */
  MoneyAccountMpcDeviceShareWrappingKey:
    'metamask:money-account:mpc:device-share:wrapping-key:v1',
} as const satisfies Record<string, KeyDerivationPurpose>;

/**
 * A registered purpose value. Use `KeyDerivationPurpose` to also accept
 * consumer-defined purposes.
 */
export type Purpose = (typeof Purpose)[keyof typeof Purpose];
