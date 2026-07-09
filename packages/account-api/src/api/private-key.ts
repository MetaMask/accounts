import { KeyringAccountEntropyTypeOption } from '@metamask/keyring-api';
import type {
  KeyringAccount,
  KeyringAccountEntropyPrivateKeyOptions,
} from '@metamask/keyring-api';

/**
 * Private key account type.
 */
export type PrivateKeyAccount<Account extends KeyringAccount> = Account & {
  // We force the option type for those accounts. (That's how we identify
  // if an account is private key compatible).
  options: {
    entropy: KeyringAccountEntropyPrivateKeyOptions;
  };
};

/**
 * Checks if an account is a private key account.
 *
 * @param account - The account to be tested.
 * @returns True if the account is a private key account.
 */
export function isPrivateKeyAccount<Account extends KeyringAccount>(
  account: Account,
): account is PrivateKeyAccount<Account> {
  // To be private key compatible, we just check for the entropy type (the
  // the `entropy` shape will be inferred automatically).
  return (
    account.options.entropy?.type ===
    `${KeyringAccountEntropyTypeOption.PrivateKey}`
  );
}

/**
 * Asserts a keyring account is a private key account.
 *
 * @param account - Keyring account to check.
 * @throws If the keyring account is not a private key account.
 */
export function assertIsPrivateKeyAccount<Account extends KeyringAccount>(
  account: Account,
): asserts account is PrivateKeyAccount<Account> {
  if (!isPrivateKeyAccount(account)) {
    throw new Error('Account is not private key account');
  }
}
