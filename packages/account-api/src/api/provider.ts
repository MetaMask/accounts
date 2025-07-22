import type { KeyringAccount } from '@metamask/keyring-api';

/**
 * An account provider is reponsible of providing accounts to an account group.
 */
export type AccountProvider<Account extends KeyringAccount> = {
  /**
   * Gets an account for a given ID.
   *
   * @returns An account, or undefined if not found.
   */
  getAccount: (id: Account['id']) => Account | undefined;

  /**
   * Gets all accounts for a given entropy source and group index.
   *
   * @returns A list of all account for this provider.
   */
  getAccounts: () => Account[];
};
