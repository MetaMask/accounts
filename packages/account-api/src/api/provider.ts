import type { KeyringAccount } from '@metamask/keyring-api';

/**
 * An account provider is reponsible of providing accounts to an account group.
 */
export type AccountProvider<Account extends KeyringAccount> = {
  /**
   * Gets an account for a given ID.
   *
   * @throws If the account ID does not belong to this provider.
   * @returns An account.
   */
  getAccount: (id: Account['id']) => Account;

  /**
   * Gets all accounts for a given entropy source and group index.
   *
   * @returns A list of all account for this provider.
   */
  getAccounts: () => Account[];
};
