import type { EntropySourceId, KeyringAccount } from '@metamask/keyring-api';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import type { AccountId } from '@metamask/keyring-utils';
import { isScopeEqualToAny } from '@metamask/keyring-utils';
import type { CaipChainId } from '@metamask/utils';

type GetAccountFunction = (id: string) => InternalAccount;

export type AccountType = string;

export type AccountMethod = string;

export type AccountProvider = {
  createAccounts: (opts: {
    entropySource: EntropySourceId;
    groupIndex: number;
  }) => Promise<KeyringAccount[]>;

  discoverAndCreateAccounts: (opts: {
    entropySource: EntropySourceId;
    groupIndex: number;
  }) => Promise<KeyringAccount[]>;
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

export type MultichainAccountGroupObject = {
  id: MultichainAccountId;
  accounts: AccountId[];
};

export type MultichainAccountWalletObject = {
  id: MultichainAccountWalletId;
  groups: MultichainAccountGroupObject[];
};

export type MultichainAccount = {
  get id(): MultichainAccountId;
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
  readonly #group: MultichainAccountGroupObject;

  readonly #index: number;

  readonly #accounts: InternalAccount[];

  constructor({
    group,
    groupIndex,
    getAccount,
  }: {
    group: MultichainAccountGroupObject;
    groupIndex: number;
    getAccount: GetAccountFunction;
  }) {
    this.#group = group;
    this.#index = groupIndex;
    this.#accounts = this.#group.accounts.map(getAccount);
  }

  get id(): MultichainAccountId {
    return this.#group.id;
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

  readonly #getAccount: GetAccountFunction;

  readonly #accounts: Map<number, MultichainAccount>;

  constructor({
    wallet,
    providers,
    entropySource,
    getAccount,
  }: {
    wallet: MultichainAccountWalletObject;
    providers: AccountProvider[];
    entropySource: EntropySourceId;
    getAccount: GetAccountFunction;
  }) {
    this.#id = toMultichainAccountWalletId(entropySource);
    this.#providers = providers;
    this.#entropySource = entropySource;

    this.#getAccount = getAccount;

    this.#accounts = new Map();
    for (const [groupIndex, group] of wallet.groups.entries()) {
      this.#createMultichainAccount(groupIndex, group.accounts);
    }
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

  #createMultichainAccount(
    groupIndex: number,
    accounts: AccountId[],
  ): MultichainAccount {
    const multichainAccountId = toMultichainAccountId(this.id, groupIndex);
    const multichainAccount = new MultichainAccountAdapter({
      group: {
        id: multichainAccountId,
        accounts,
      },
      groupIndex,
      getAccount: this.#getAccount,
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

    const accounts: AccountId[] = [];
    for (const provider of this.#providers) {
      for (const account of await provider.createAccounts({
        entropySource: this.#entropySource,
        groupIndex,
      })) {
        accounts.push(account.id);
      }
    }

    // Re-create and "refresh" the multichain account (we assume all account creations are
    // idempotent, so we should get the same accounts and potentially some new accounts (if
    // some account providers decide to return more of them this time).
    return this.#createMultichainAccount(groupIndex, accounts);
  }

  async createNextMultichainAccount(): Promise<MultichainAccount> {
    return this.createMultichainAccount(this.getNextGroupIndex());
  }

  async discoverAndCreateMultichainAccounts(): Promise<MultichainAccount[]> {
    const multichainAccounts: MultichainAccount[] = [];

    let accounts: KeyringAccount[];
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
          const missingAccounts = await provider.createAccounts({
            entropySource: this.#entropySource,
            groupIndex,
          });

          accounts = accounts.concat(missingAccounts);
        }

        // We've got all the accounts now, we can create our multichain account.
        multichainAccounts.push(
          this.#createMultichainAccount(
            groupIndex,
            accounts.map((account) => account.id),
          ),
        );

        // We have accounts, we need to check the next index.
        groupIndex += 1;
      }
    } while (accounts.length);

    return multichainAccounts;
  }
}
