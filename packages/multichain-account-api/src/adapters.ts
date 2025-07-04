/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
// This rule seems to be triggering a false positive. Possibly eslint is not
// inferring the `InternalAccount` type correctly which causes issue with the
// union `| undefined`.

import type { EntropySourceId } from '@metamask/keyring-api';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import type { AccountId } from '@metamask/keyring-utils';
import { isScopeEqualToAny } from '@metamask/keyring-utils';

import type {
  AccountProvider,
  MultichainAccount,
  MultichainAccountId,
  MultichainAccountSelector,
  MultichainAccountWallet,
  MultichainAccountWalletId,
} from './api';
import { toMultichainAccountId, toMultichainAccountWalletId } from './api';

export class MultichainAccountAdapter implements MultichainAccount {
  readonly #id: MultichainAccountId;

  readonly #wallet: MultichainAccountWallet;

  readonly #index: number;

  readonly #providers: AccountProvider[];

  readonly #accounts: InternalAccount[];

  constructor({
    groupIndex,
    wallet,
    providers,
  }: {
    groupIndex: number;
    wallet: MultichainAccountWallet;
    providers: AccountProvider[];
  }) {
    this.#id = toMultichainAccountId(wallet.id, groupIndex);
    this.#index = groupIndex;
    this.#wallet = wallet;
    this.#providers = providers;
    this.#accounts = [];

    let accounts: InternalAccount[] = [];

    for (const provider of this.#providers) {
      accounts = accounts.concat(
        provider.getAccounts({
          entropySource: this.#wallet.entropySource,
          groupIndex: this.#index,
        }),
      );
    }

    this.#accounts = accounts;
  }

  get id(): MultichainAccountId {
    return this.#id;
  }

  get wallet(): MultichainAccountWallet {
    return this.#wallet;
  }

  get index(): number {
    return this.#index;
  }

  get accounts(): InternalAccount[] {
    return this.#accounts;
  }

  getAccount(id: AccountId): InternalAccount | undefined {
    return this.#accounts.find((account) => account.id === id);
  }

  get(selector: MultichainAccountSelector): InternalAccount | undefined {
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

  select(selector: MultichainAccountSelector): InternalAccount[] {
    return this.#accounts.filter((account) => {
      return (
        Boolean(selector.id && account.id === selector.id) ||
        Boolean(selector.address && account.address === selector.address) ||
        Boolean(selector.type && account.type === selector.type) ||
        Boolean(
          selector.methods?.some((method) => account.methods.includes(method)),
        ) ||
        Boolean(
          selector.scopes?.some(
            (scope) => isScopeEqualToAny(scope, account.scopes), // This will cover specific EVM EOA scopes as well.
          ),
        )
      );
    });
  }
}

export class MultichainAccountWalletAdapter implements MultichainAccountWallet {
  readonly #id: MultichainAccountWalletId;

  readonly #providers: AccountProvider[];

  readonly #entropySource: EntropySourceId;

  readonly #accounts: Map<number, MultichainAccount>;

  constructor({
    providers,
    entropySource,
  }: {
    providers: AccountProvider[];
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
      hasAccounts = multichainAccount.accounts.length > 0;
      if (hasAccounts) {
        this.#accounts.set(groupIndex, multichainAccount);
      }

      groupIndex += 1;
    } while (hasAccounts);
  }

  get id(): MultichainAccountWalletId {
    return this.#id;
  }

  get entropySource(): EntropySourceId {
    return this.#entropySource;
  }

  get accounts(): MultichainAccount[] {
    return Array.from(this.#accounts.values()); // TODO: Prevent copy here.
  }

  #createMultichainAccount(groupIndex: number): MultichainAccount {
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
  ): Promise<MultichainAccount> {
    const nextGroupIndex = this.getNextGroupIndex();
    if (groupIndex > nextGroupIndex) {
      throw new Error(
        `You cannot use an group index that is higher than the next available one: expect <${nextGroupIndex}, got ${groupIndex}`,
      );
    }

    for (const provider of this.#providers) {
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

  async createNextMultichainAccount(): Promise<MultichainAccount> {
    return this.createMultichainAccount(this.getNextGroupIndex());
  }

  async discoverAndCreateMultichainAccounts(): Promise<MultichainAccount[]> {
    const multichainAccounts: MultichainAccount[] = [];

    let accounts: InternalAccount[];
    let groupIndex = 0;

    do {
      // New index means new accounts.
      accounts = [];

      const missingProviders = [];
      for (const provider of this.#providers) {
        const discoveredAccounts = await provider.discoverAndCreateAccounts({
          entropySource: this.#entropySource,
          groupIndex,
        });

        if (discoveredAccounts.length) {
          // This provider has discovered and created accounts, meaning there might
          // be something to discover on the next index.
          accounts = discoveredAccounts;
        } else {
          // This provider did not discover or create any accounts. We mark it as
          // "missing", so we can create accounts on this index if other providers
          // did discover something.
          missingProviders.push(provider);
        }
      }

      if (accounts.length) {
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
    } while (accounts.length);

    return multichainAccounts;
  }
}
