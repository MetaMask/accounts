import type { EntropySourceId, KeyringAccount } from '@metamask/keyring-api';

/**
 * an account provider is reponsible of providing accounts to an account group.
 */
export type AccountGroupProvider<Account extends KeyringAccount> = {
  /**
   * Gets an account from its ID.
   *
   * NOTE: Assuming getting an account can never fail and will always be
   * invoked with a valid account ID coming from a `getAccounts` response.
   *
   * @param id - The account ID.
   * @returns The account.
   */
  getAccount: (id: Account['id']) => Account;

  /**
   * Gets all accounts for a given entropy source and group index.
   *
   * @param opts - Options.
   * @param opts.entropySource - Entropy source to filter on.
   * @param opts.groupIndex - Group index to filter on.
   * @returns A list of all accounts matching the given options.
   */
  getAccounts: (opts: {
    entropySource: EntropySourceId;
    groupIndex: number;
  }) => Account['id'][];
};
