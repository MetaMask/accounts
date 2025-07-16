import type { KeyringAccount } from '@metamask/keyring-api';
import { isScopeEqualToAny, type AccountId } from '@metamask/keyring-utils';
import type { CaipChainId } from '@metamask/utils';

import type { MultichainAccountProvider } from './provider';
import type {
  MultichainAccountWallet,
  MultichainAccountWalletId,
} from './wallet';
import type { AccountGroup, AccountGroupId } from '../group';
import { AccountWalletCategory } from '../wallet';

const MULTICHAIN_ACCOUNT_GROUP_INDEX_REGEX = new RegExp(
  `^${AccountWalletCategory.Entropy}:.*/(?<groupIndex>\\d+)$`,
  'u',
);

export type AccountType = string;

export type AccountMethod = string;

export type MultichainAccountSelector = {
  id?: AccountId;
  address?: string;
  type?: AccountType;
  methods?: AccountMethod[];
  scopes?: CaipChainId[];
};

export type MultichainAccountId = `${MultichainAccountWalletId}/${number}`; // Use number for the account group index.

export type MultichainAccount<Account extends KeyringAccount> =
  AccountGroup<Account> & {
    get id(): MultichainAccountId;

    get wallet(): MultichainAccountWallet<Account>;

    get index(): number;

    /**
     * Gets the "blockchain" accounts for this multichain account.
     *
     * @param id - Account ID.
     * @returns The "blockchain" accounts.
     */
    getAccounts(): Account[];

    /**
     * Gets the "blockchain" account for a given account ID.
     *
     * @param id - Account ID.
     * @returns The "blockchain" account or undefined if not found.
     */
    getAccount(id: AccountId): Account | undefined;

    /**
     * Query a "blockchain" account matching the selector.
     *
     * @param selector - Query selector.
     * @returns The "blockchain" account matching the selector or undefined if not matching.
     * @throws If multiple accounts match the selector.
     */
    get(selector: MultichainAccountSelector): Account | undefined;

    /**
     * Query "blockchain" accounts matching the selector.
     *
     * @param selector - Query selector.
     * @returns The "blockchain" accounts matching the selector.
     */
    select(selector: MultichainAccountSelector): Account[];
  };

export class MultichainAccountAdapter<Account extends KeyringAccount>
  implements MultichainAccount<Account>
{
  readonly #id: MultichainAccountId;

  readonly #wallet: MultichainAccountWallet<Account>;

  readonly #index: number;

  readonly #providers: MultichainAccountProvider<Account>[];

  readonly #providersByAccountId: Map<
    AccountId,
    MultichainAccountProvider<Account>
  >;

  readonly #accounts: Map<MultichainAccountProvider<Account>, AccountId[]>;

  constructor({
    groupIndex,
    wallet,
    providers,
  }: {
    groupIndex: number;
    wallet: MultichainAccountWallet<Account>;
    providers: MultichainAccountProvider<Account>[];
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
  return `${walletId}/${groupIndex}`;
}

/**
 * Gets the multichain account index from an account group ID.
 *
 * @param groupId - Account group ID.
 * @returns The multichain account index if extractable, undefined otherwise.
 */
export function getGroupIndexFromAccountGroupId(
  groupId: AccountGroupId,
): number | undefined {
  const matched = groupId.match(MULTICHAIN_ACCOUNT_GROUP_INDEX_REGEX);
  if (matched) {
    if (matched.groups?.groupIndex !== undefined) {
      return Number(matched.groups.groupIndex);
    }
  }

  // Unable to extract group index.
  return undefined;
}
