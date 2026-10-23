import { KeyringAccountEntropyTypeOption } from '@metamask/keyring-api';
import type {
  KeyringAccount,
  KeyringAccountEntropyMpcOptions,
} from '@metamask/keyring-api';

/**
 * MPC account type.
 */
export type MpcAccount<Account extends KeyringAccount> = Account & {
  // We force the option type for those accounts. (That's how we identify
  // if an account is MPC compatible).
  options: {
    entropy: KeyringAccountEntropyMpcOptions;
  };
};

/**
 * Checks if an account is an MPC account.
 *
 * @param account - The account to be tested.
 * @returns True if the account is an MPC account.
 */
export function isMpcAccount<Account extends KeyringAccount>(
  account: Account,
): account is MpcAccount<Account> {
  // To be MPC compatible, we just check for the entropy type (the
  // the `entropy` shape will be inferred automatically).
  return (
    account.options.entropy?.type === `${KeyringAccountEntropyTypeOption.Mpc}`
  );
}

/**
 * Asserts a keyring account is an MPC account.
 *
 * @param account - Keyring account to check.
 * @throws If the keyring account is not an MPC account.
 */
export function assertIsMpcAccount<Account extends KeyringAccount>(
  account: Account,
): asserts account is MpcAccount<Account> {
  if (!isMpcAccount(account)) {
    throw new Error('Account is not an MPC account');
  }
}
