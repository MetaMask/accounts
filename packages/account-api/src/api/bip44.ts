import type {
  KeyringAccount,
  KeyringAccountEntropyMnemonicOptions,
} from '@metamask/keyring-api';

/**
 * BIP-44 compatible account type.
 */
export type Bip44Account<Account extends KeyringAccount> = Account & {
  // We force the option type for those accounts. (That's how we identify
  // if an account is BIP-44 compatible).
  options: {
    entropy: KeyringAccountEntropyMnemonicOptions;
  };
};

/**
 * Checks if an account is BIP-44 compatible.
 *
 * @param account - The account to be tested.
 * @returns True if the account is BIP-44 compatible.
 */
export function isBip44Account<Account extends KeyringAccount>(
  account: Account,
): account is Bip44Account<Account> {
  // To be BIP-44 compatible, we just check for the entropy type (the
  // the `entropy` shape will be inferred automatically).
  return account.options.entropy?.type === 'mnemonic';
}

/**
 * Asserts a keyring account is BIP-44 compatible.
 *
 * @param account - Keyring account to check.
 * @throws If the keyring account is not compatible.
 */
export function assertIsBip44Account<Account extends KeyringAccount>(
  account: Account,
): asserts account is Bip44Account<Account> {
  if (!isBip44Account(account)) {
    throw new Error('Account is not BIP-44 compatible');
  }
}
