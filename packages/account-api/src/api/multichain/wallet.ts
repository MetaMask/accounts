import type { EntropySourceId, KeyringAccount } from '@metamask/keyring-api';

import {
  getGroupIndexFromAccountGroupId,
  MultichainAccountAdapter,
  type MultichainAccount,
} from './account';
import type { MultichainAccountProvider } from './provider';
import type { AccountGroupId } from '../group';
import { toDefaultAccountGroupId } from '../group';
import type { AccountWallet } from '../wallet';
import { AccountWalletCategory } from '../wallet';

export type MultichainAccountWalletId =
  `${AccountWalletCategory.Entropy}:${EntropySourceId}`;

export type MultichainAccountWallet<Account extends KeyringAccount> =
  AccountWallet<Account> & {
    get id(): MultichainAccountWalletId;

    get entropySource(): EntropySourceId;

    /**
     * Gets multichain account for a given index.
     *
     * @returns Multichain accounts.
     */
    getMultichainAccount(
      groupIndex: number,
    ): MultichainAccount<Account> | undefined;

    /**
     * Gets multichain accounts.
     *
     * @returns Multichain accounts.
     */
    getMultichainAccounts(): MultichainAccount<Account>[];

    /**
     * Gets the next available account index (named group index internally).
     *
     * @returns Next available group index.
     */
    getNextGroupIndex(): number;

    /**
     * Creates a new multichain account on a given group index.
     *
     * NOTE: This method is idempotent.
     *
     * @param groupIndex - Next available group index.
     * @returns New (or existing) multichain account for the given group index.
     */
    createMultichainAccount(
      groupIndex: number,
    ): Promise<MultichainAccount<Account>>;

    /**
     * Creates a new multichain account for the next available group index.
     *
     * @returns Next multichain account.
     */
    createNextMultichainAccount(): Promise<MultichainAccount<Account>>;

    /**
     * Discovers and automatically create multichain accounts for that wallet.
     *
     * @returns List of all multichain accounts that got discovered or automatically created.
     */
    discoverAndCreateMultichainAccounts(): Promise<
      MultichainAccount<Account>[]
    >;
  };

export class MultichainAccountWalletAdapter<Account extends KeyringAccount>
  implements MultichainAccountWallet<Account>
{
  readonly #id: MultichainAccountWalletId;

  readonly #providers: MultichainAccountProvider<Account>[];

  readonly #entropySource: EntropySourceId;

  readonly #accounts: Map<number, MultichainAccount<Account>>;

  constructor({
    providers,
    entropySource,
  }: {
    providers: MultichainAccountProvider<Account>[];
    entropySource: EntropySourceId;
  }) {
    this.#id = toMultichainAccountWalletId(entropySource);
    this.#providers = providers;
    this.#entropySource = entropySource;
    this.#accounts = new Map();

    let groupIndex = 0;
    let hasAccounts = false;

    do {
      const multichainAccount = new MultichainAccountAdapter({
        groupIndex,
        wallet: this,
        providers: this.#providers,
      });

      // We only add multichain account that has underlying accounts.
      hasAccounts = multichainAccount.hasAccounts();
      if (hasAccounts) {
        this.#accounts.set(groupIndex, multichainAccount);
      }

      groupIndex += 1;
    } while (hasAccounts);
  }

  get id(): MultichainAccountWalletId {
    return this.#id;
  }

  get category(): AccountWalletCategory.Entropy {
    return AccountWalletCategory.Entropy;
  }

  get entropySource(): EntropySourceId {
    return this.#entropySource;
  }

  getAccountGroup(
    groupId: AccountGroupId,
  ): MultichainAccount<Account> | undefined {
    // We consider the "default case" to be mapped to index 0.
    if (groupId === toDefaultAccountGroupId(this.id)) {
      return this.#accounts.get(0);
    }

    const groupIndex = getGroupIndexFromAccountGroupId(groupId);
    if (groupIndex === undefined) {
      return undefined;
    }
    return this.#accounts.get(groupIndex);
  }

  getAccountGroups(): MultichainAccount<Account>[] {
    return this.getMultichainAccounts();
  }

  getMultichainAccount(
    groupIndex: number,
  ): MultichainAccount<Account> | undefined {
    return this.#accounts.get(groupIndex);
  }

  getMultichainAccounts(): MultichainAccount<Account>[] {
    return Array.from(this.#accounts.values()); // TODO: Prevent copy here.
  }

  #createMultichainAccount(groupIndex: number): MultichainAccount<Account> {
    const multichainAccount = new MultichainAccountAdapter({
      wallet: this,
      providers: this.#providers,
      groupIndex,
    });

    // Register the account to our internal map.
    this.#accounts.set(groupIndex, multichainAccount);

    return multichainAccount;
  }

  getNextGroupIndex(): number {
    // Assuming we cannot have indexes gaps.
    return this.#accounts.size; // No +1 here, group indexes starts at 0.
  }

  async createMultichainAccount(
    groupIndex: number,
  ): Promise<MultichainAccount<Account>> {
    const nextGroupIndex = this.getNextGroupIndex();
    if (groupIndex > nextGroupIndex) {
      throw new Error(
        `You cannot use a group index that is higher than the next available one: expected <=${nextGroupIndex}, got ${groupIndex}`,
      );
    }

    // TODO: Make this parallel.
    for (const provider of this.#providers) {
      // FIXME: What to do if any provider fails to create accounts?
      await provider.createAccounts({
        entropySource: this.#entropySource,
        groupIndex,
      });
    }

    // Re-create and "refresh" the multichain account (we assume all account creations are
    // idempotent, so we should get the same accounts and potentially some new accounts (if
    // some account providers decide to return more of them this time).
    return this.#createMultichainAccount(groupIndex);
  }

  async createNextMultichainAccount(): Promise<MultichainAccount<Account>> {
    return this.createMultichainAccount(this.getNextGroupIndex());
  }

  async discoverAndCreateMultichainAccounts(): Promise<
    MultichainAccount<Account>[]
  > {
    const multichainAccounts: MultichainAccount<Account>[] = [];

    let discovered: boolean;
    let groupIndex = 0;

    do {
      // Keep track if any accounts got discovered for that new index.
      discovered = false;

      const missingProviders = [];
      // TODO: Make this parallel.
      for (const provider of this.#providers) {
        // FIXME: What to do if any provider fails to discover accounts?
        const discoveredAccounts = await provider.discoverAndCreateAccounts({
          entropySource: this.#entropySource,
          groupIndex,
        });

        if (discoveredAccounts.length) {
          // This provider has discovered and created accounts, meaning there might
          // be something to discover on the next index.
          discovered = true;
        } else {
          // This provider did not discover or create any accounts. We mark it as
          // "missing", so we can create accounts on this index if other providers
          // did discover something.
          missingProviders.push(provider);
        }
      }

      if (discovered) {
        // We only create missing accounts if one of the provider has discovered
        // and created accounts.
        for (const provider of missingProviders) {
          await provider.createAccounts({
            entropySource: this.#entropySource,
            groupIndex,
          });
        }

        // We've got all the accounts now, we can create our multichain account.
        multichainAccounts.push(this.#createMultichainAccount(groupIndex));

        // We have accounts, we need to check the next index.
        groupIndex += 1;
      }
    } while (discovered);

    return multichainAccounts;
  }
}

/**
 * Gets the multichain account wallet ID from its entropy source.
 *
 * @param entropySource - Entropy source ID of that wallet.
 * @returns The multichain account wallet ID.
 */
export function toMultichainAccountWalletId(
  entropySource: EntropySourceId,
): MultichainAccountWalletId {
  return `${AccountWalletCategory.Entropy}:${entropySource}`;
}
