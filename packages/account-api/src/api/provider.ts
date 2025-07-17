import type { KeyringAccount } from '@metamask/keyring-api';

/**
 * an account provider is reponsible of providing accounts to an account group.
 */
export type AccountGroupProvider<Account extends KeyringAccount> = {
  /**
   * Gets all accounts for a given entropy source and group index.
   *
   * @returns A list of all account for this provider.
   */
  getAccounts: () => Account[];
};
