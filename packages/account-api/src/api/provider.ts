import type { EntropySourceId, KeyringAccount } from '@metamask/keyring-api';

export enum AccountProviderType {
  Evm = 'Evm',
  Solana = 'Solana',
  Btc = 'Btc',
};

/**
 * An account provider is reponsible of providing accounts to an account group.
 */
export type AccountProvider<Account extends KeyringAccount> = {
  /**
   * The type of the provider.
   */
  providerType: AccountProviderType;
  /**
   * Gets an account for a given ID.
   *
   * @returns An account, or undefined if not found.
   */
  getAccount: (id: Account['id']) => Account | undefined;

  /**
   * Gets all accounts for this provider.
   *
   * @returns A list of all account for this provider.
   */
  getAccounts: () => Account[];

  /**
   * Creates accounts for a given entropy source and a given group
   * index.
   *
   * @param options - Options.
   * @param options.entropySource - Entropy source to use.
   * @param options.groupIndex - Group index to use.
   * @returns The list of created accounts.
   */
  createAccounts: (options: {
    entropySource: EntropySourceId;
    groupIndex: number;
  }) => Promise<Account[]>;

  /**
   * Discover accounts for a given entropy source and a given group
   * index.
   *
   * NOTE: This method needs to also create the discovered accounts.
   *
   * @param options - Options.
   * @param options.entropySource - Entropy source to use.
   * @param options.groupIndex - Group index to use.
   * @returns The list of discovered and created accounts.
   */
  discoverAndCreateAccounts: (options: {
    entropySource: EntropySourceId;
  }) => Promise<Account[]>;
};
