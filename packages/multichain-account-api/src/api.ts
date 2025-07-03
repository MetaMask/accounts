/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
// This rule seems to be triggering a false positive. Possibly eslint is not
// inferring the `InternalAccount` type correctly which causes issue with the
// union `| undefined`.

import type { EntropySourceId } from '@metamask/keyring-api';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import type { AccountId } from '@metamask/keyring-utils';
import { isScopeEqualToAny } from '@metamask/keyring-utils';
import type { CaipChainId } from '@metamask/utils';

export type AccountType = string;

export type AccountMethod = string;

export type AccountProvider = {
  getEntropySources: () => EntropySourceId[];

  getAccounts: (opts: {
    entropySource: EntropySourceId;
    groupIndex: number;
  }) => InternalAccount[];

  createAccounts: (opts: {
    entropySource: EntropySourceId;
    groupIndex: number;
  }) => Promise<InternalAccount[]>;

  discoverAndCreateAccounts: (opts: {
    entropySource: EntropySourceId;
    groupIndex: number;
  }) => Promise<InternalAccount[]>;
};

export type MultichainAccountWalletId = `multichain-account-wallet:${string}`;

export type MultichainAccountId = `${MultichainAccountWalletId}:${number}`; // Use number for the account group index.

export type MultichainAccountSelector = {
  id?: AccountId;
  address?: string;
  type?: AccountType;
  methods?: AccountMethod[];
  scopes?: CaipChainId[];
};

export type MultichainAccount = {
  get id(): MultichainAccountId;
  get wallet(): MultichainAccountWallet;
  get index(): number;
  get accounts(): InternalAccount[];

  /**
   * Gets the "blockchain" account for a given account ID.
   *
   * @param id - Account ID.
   * @returns The "blockchain" account or undefined if not found.
   */
  getAccount(id: AccountId): InternalAccount | undefined;

  /**
   * Query a "blockchain" account matching the selector.
   *
   * @param selector - Query selector.
   * @returns The "blockchain" account matching the selector or undefined if not matching.
   * @throws If multiple accounts match the selector.
   */
  get(selector: MultichainAccountSelector): InternalAccount | undefined;

  /**
   * Query "blockchain" accounts matching the selector.
   *
   * @param selector - Query selector.
   * @returns The "blockchain" accounts matching the selector.
   */
  select(selector: MultichainAccountSelector): InternalAccount[];
};

/**
 * Gets the multichain account wallet ID from its entropy source.
 *
 * @param entropySource - Entropy source ID of that wallet.
 * @returns The multichain account wallet ID.
 */
export function toMultichainAccountWalletId(
  entropySource: EntropySourceId,
): MultichainAccountWalletId {
  return `multichain-account-wallet:${entropySource}`;
}

/**
 * Gets the multichain account ID from its multichain account wallet ID and its index.
 *
 * @param walletId - Multichain account wallet ID.
 * @param groupIndex - Index of that multichain account.
 * @returns The multichain account ID.
 */
export function toMultichainAccountId(
  walletId: MultichainAccountWalletId,
  groupIndex: number,
): MultichainAccountId {
  return `${walletId}:${groupIndex}`;
}

export class MultichainAccountAdapter implements MultichainAccount {
  readonly #id: MultichainAccountId;

  readonly #wallet: MultichainAccountWallet;

  readonly #index: number;

  readonly #providers: AccountProvider[];

  #accounts: InternalAccount[];

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
  }

  async init(): Promise<void> {
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

  static async from(args: {
    groupIndex: number;
    wallet: MultichainAccountWallet;
    providers: AccountProvider[];
  }): Promise<MultichainAccount> {
    const multichainAccount = new MultichainAccountAdapter(args);

    await multichainAccount.init();

    return multichainAccount;
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

export type MultichainAccountWallet = {
  get id(): MultichainAccountWalletId;

  get entropySource(): EntropySourceId;

  get accounts(): MultichainAccount[];

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
  createMultichainAccount(groupIndex: number): Promise<MultichainAccount>;

  /**
   * Creates a new multichain account for the next available group index.
   *
   * @returns Next multichain account.
   */
  createNextMultichainAccount(): Promise<MultichainAccount>;

  /**
   * Discovers and automatically create multichain accounts for that wallet.
   *
   * @returns List of all multichain accounts that got discovered or automatically created.
   */
  discoverAndCreateMultichainAccounts(): Promise<MultichainAccount[]>;
};

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
  }

  async init(): Promise<void> {
    let index = 0;
    let hasAccounts = false;

    do {
      // Make an explicit const copy of that value, to avoid unsafe reference.
      // See: https://eslint.org/docs/latest/rules/no-loop-func
      const groupIndex = index;

      hasAccounts = this.#providers.some((provider) => {
        return Boolean(
          provider.getAccounts({
            entropySource: this.#entropySource,
            groupIndex,
          }).length,
        );
      });

      if (hasAccounts) {
        const multichainAccount = await MultichainAccountAdapter.from({
          groupIndex,
          wallet: this,
          providers: this.#providers,
        });

        this.#accounts.set(groupIndex, multichainAccount);
      }

      index += 1;
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

  async #createMultichainAccount(
    groupIndex: number,
  ): Promise<MultichainAccount> {
    const multichainAccount = await MultichainAccountAdapter.from({
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
    return await this.#createMultichainAccount(groupIndex);
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
        multichainAccounts.push(
          await this.#createMultichainAccount(groupIndex),
        );

        // We have accounts, we need to check the next index.
        groupIndex += 1;
      }
    } while (accounts.length);

    return multichainAccounts;
  }
}
