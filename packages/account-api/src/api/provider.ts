import {
  type CreateAccountOptions,
  type EntropySourceId,
  type KeyringAccount,
  type KeyringCapabilities,
} from '@metamask/keyring-api';

import type {
  Bip44Account,
  Bip44KeyringCapabilities,
  Bip44CreateAccountOptions,
} from './bip44';

/**
 * An account provider is reponsible of providing accounts to an account group.
 */
export type AccountProvider<Account extends KeyringAccount> = {
  /**
   * Capabilities supported by this provider.
   */
  get capabilities(): KeyringCapabilities;

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
   * Creates accounts according to the given options.
   *
   * @param options - Create accounts options.
   * @returns The list of created accounts.
   */
  createAccounts: (options: CreateAccountOptions) => Promise<Account[]>;

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
  discoverAccounts: (options: {
    entropySource: EntropySourceId;
    groupIndex: number;
  }) => Promise<Account[]>;
};

/**
 * A BIP-44 provider is a provider that can provide BIP-44 compatible accounts.
 *
 * NOTE: This acts as a type alias and does not really narrow the provider base
 * type. Use it only to be more explicit about your provider implementation.
 */
export type Bip44AccountProvider = AccountProvider<
  Bip44Account<KeyringAccount>
> & {
  /**
   * BIP-44 capabilities supported by this provider.
   */
  get capabilities(): Bip44KeyringCapabilities;

  /**
   * Creates BIP-44 compatible accounts according to the given options.
   *
   * @param options - Create accounts options.
   * @returns The list of created BIP-44 accounts.
   */
  createAccounts: (
    options: Bip44CreateAccountOptions,
  ) => Promise<Bip44Account<KeyringAccount>[]>;
};
