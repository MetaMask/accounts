/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
// This rule seems to be triggering a false positive. Possibly eslint is not
// inferring the `InternalAccount` type correctly which causes issue with the
// union `| undefined`.

import type { EntropySourceId, KeyringAccount } from '@metamask/keyring-api';
import type { AccountId } from '@metamask/keyring-utils';
import { isScopeEqualToAny } from '@metamask/keyring-utils';

import {
  toMultichainAccountId,
  toMultichainAccountWalletId,
  getGroupIndexFromAccountGroupId,
} from './id';
import type {
  AccountGroupId,
  AccountProvider,
  MultichainAccount,
  MultichainAccountId,
  MultichainAccountSelector,
  MultichainAccountWallet,
  MultichainAccountWalletId,
} from '..';
import { toDefaultAccountGroupId } from '../group';
import { AccountWalletCategory } from '../wallet';

export class MultichainAccountAdapter<Account extends KeyringAccount>
  implements MultichainAccount<Account>
{
  readonly #id: MultichainAccountId;

  readonly #wallet: MultichainAccountWallet<Account>;

  readonly #index: number;

  readonly #providers: AccountProvider<Account>[];

  readonly #providersByAccountId: Map<AccountId, AccountProvider<Account>>;

  readonly #accounts: Map<AccountProvider<Account>, AccountId[]>;

  constructor({
    groupIndex,
    wallet,
    providers,
  }: {
    groupIndex: number;
    wallet: MultichainAccountWallet<Account>;
    providers: AccountProvider<Account>[];
  }) {
    this.#id = toMultichainAccountId(wallet.id, groupIndex);
    this.#index = groupIndex;
    this.#wallet = wallet;
    this.#providers = providers;
    this.#accounts = new Map();
    this.#providersByAccountId = new Map();

    for (const provider of this.#providers) {
      const accounts = provider.getAccounts({
        entropySource: this.#wallet.entropySource,
        groupIndex: this.#index,
      });

      this.#accounts.set(provider, accounts);
      for (const id of accounts) {
        this.#providersByAccountId.set(id, provider);
      }
    }
  }

  get id(): MultichainAccountId {
    return this.#id;
  }

  get wallet(): MultichainAccountWallet<Account> {
    return this.#wallet;
  }

  get index(): number {
    return this.#index;
  }

  hasAccounts(): boolean {
    // Use this map, cause if there's no accounts, then this map will also
    // be empty.
    return this.#providersByAccountId.size > 0;
  }

  getAccounts(): Account[] {
    let allAccounts: Account[] = [];

    for (const [provider, accounts] of this.#accounts.entries()) {
      allAccounts = allAccounts.concat(
        accounts.map((id) => provider.getAccount(id)),
      );
    }

    return allAccounts;
  }

  getAccount(id: AccountId): Account | undefined {
    const provider = this.#providersByAccountId.get(id);

    return provider?.getAccount(id);
  }

  get(selector: MultichainAccountSelector): Account | undefined {
    const accounts = this.select(selector);

    if (accounts.length > 1) {
      throw new Error(
        `Too many account candidates, expected 1, got: ${accounts.length}`,
      );
    }

    if (accounts.length === 0) {
      return undefined;
    }

    return accounts[0]; // This is safe, see checks above.
  }

  select(selector: MultichainAccountSelector): Account[] {
    return this.getAccounts().filter((account) => {
      let selected = true;

      if (selector.id) {
        selected &&= account.id === selector.id;
      }
      if (selector.address) {
        selected &&= account.address === selector.address;
      }
      if (selector.type) {
        selected &&= account.type === selector.type;
      }
      if (selector.methods !== undefined) {
        selected &&= selector.methods.some((method) =>
          account.methods.includes(method),
        );
      }
      if (selector.scopes !== undefined) {
        selected &&= selector.scopes.some((scope) => {
          return (
            // This will cover specific EVM EOA scopes as well.
            isScopeEqualToAny(scope, account.scopes)
          );
        });
      }

      return selected;
    });
  }
}

export class MultichainAccountWalletAdapter<Account extends KeyringAccount>
  implements MultichainAccountWallet<Account>
{
  readonly #id: MultichainAccountWalletId;

  readonly #providers: AccountProvider<Account>[];

  readonly #entropySource: EntropySourceId;

  readonly #accounts: Map<number, MultichainAccount<Account>>;

  constructor({
    providers,
    entropySource,
  }: {
    providers: AccountProvider<Account>[];
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
        `You cannot use an group index that is higher than the next available one: expect <${nextGroupIndex}, got ${groupIndex}`,
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
