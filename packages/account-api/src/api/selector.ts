import type { KeyringAccount } from '@metamask/keyring-api';

/**
 * Selector to query a specific account based on some criteria.
 */
export type AccountSelector<Account extends KeyringAccount> = {
  /**
   * Query by account ID.
   */
  id?: Account['id'];

  /**
   * Query by account address.
   */
  address?: Account['address'];

  /**
   * Query by account type.
   */
  type?: Account['type'];

  /**
   * Query by account methods.
   */
  methods?: Account['methods'];

  /**
   * Query by account scopes.
   */
  scopes?: Account['scopes'];
};
