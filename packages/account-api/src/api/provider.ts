import type { EntropySourceId, KeyringAccount } from '@metamask/keyring-api';

/**
 * A account provider is reponsible of providing "blockchain" accounts to a account group.
 */
export type AccountGroupProvider<Account extends KeyringAccount> = {
  /**
   * Gets a "blockchain" account from its ID.
   *
   * NOTE: Assuming getting an account can never fail and will always be
   * invoked with a valid account ID coming from a `getAccounts` response.
   *
   * @param id - The "blochain" account ID.
   * @returns The "blockchain" account.
   */
  getAccount: (id: Account['id']) => Account;

  /**
   * Gets all "blockchain" accounts for a given entropy source and group index.
   *
   * @param opts - Options.
   * @param opts.entropySource - Entropy source to filter on.
   * @param opts.groupIndex - Group index to filter on.
   * @returns A list of all "blockchain" matching the given options.
   */
  getAccounts: (opts: {
    entropySource: EntropySourceId;
    groupIndex: number;
  }) => Account['id'][];
};
