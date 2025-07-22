import { type KeyringAccount } from '@metamask/keyring-api';
import { isScopeEqualToAny } from '@metamask/keyring-utils';

import type {
  MultichainAccountWallet,
  MultichainAccountWalletId,
} from './wallet';
import type { Bip44Account } from '../bip44';
import type { AccountGroup } from '../group';
import type { AccountProvider } from '../provider';
import type { AccountSelector } from '../selector';
import { AccountWalletCategory } from '../wallet';

const MULTICHAIN_ACCOUNT_ID_REGEX = new RegExp(
  `^${AccountWalletCategory.Entropy}:.*/(?<groupIndex>\\d+)$`,
  'u',
);

/**
 * Multichain account ID.
 */
export type MultichainAccountId = `${MultichainAccountWalletId}/${number}`; // Use number for the account group index.

/**
 * A multichain account that holds multiple accounts.
 */
export class MultichainAccount<Account extends KeyringAccount>
  implements AccountGroup<Account>
{
  readonly #id: MultichainAccountId;

  readonly #wallet: MultichainAccountWallet<Account>;

  readonly #index: number;

  readonly #accounts: {
    provider: AccountProvider<Account>;
    accounts: Account['id'][];
  }[];

  readonly #reverse: Map<Account['id'], AccountProvider<Account>>;

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
    this.#accounts = [];
    this.#reverse = new Map();

    for (const provider of providers) {
      // We only use IDs to always fetch the latest version of accounts.
      const accounts = provider.getAccounts().map((account) => account.id);

      this.#accounts.push({
        provider,
        accounts,
      });

      // Reverse-mapping for fast indexing.
      for (const id of accounts) {
        this.#reverse.set(id, provider);
      }
    }
  }

  /**
   * Gets the multichain account ID.
   *
   * @returns The multichain account ID.
   */
  get id(): MultichainAccountId {
    return this.#id;
  }

  /**
   * Gets the multichain account's wallet reference (parent).
   *
   * @returns The multichain account's wallet.
   */
  get wallet(): MultichainAccountWallet<Account> {
    return this.#wallet;
  }

  /**
   * Gets the multichain account group index.
   *
   * @returns The multichain account group index.
   */
  get index(): number {
    return this.#index;
  }

  /**
   * Checks if there's any underlying accounts for this multichain accounts.
   *
   * @returns True if there's any underlying accounts, false otherwise.
   */
  hasAccounts(): boolean {
    // If there's anything in the reverse-map, it means we have some accounts.
    return this.#reverse.size > 0;
  }

  /**
   * Gets the accounts for this multichain account.
   *
   * @returns The accounts.
   */
  getAccounts(): Bip44Account<Account>[] {
    let allAccounts: Bip44Account<Account>[] = [];

    for (const { provider, accounts } of this.#accounts) {
      allAccounts = allAccounts.concat(
        accounts
          .map((id) => provider.getAccount(id))
          .filter(
            (account) =>
              account.options.entropy.id === this.wallet.entropySource &&
              account.options.entropy.groupIndex === this.index,
          ),
      );
    }

    return allAccounts;
  }

  /**
   * Gets the account for a given account ID.
   *
   * @param id - Account ID.
   * @returns The account or undefined if not found.
   */
  getAccount(id: Account['id']): Bip44Account<Account> | undefined {
    const provider = this.#reverse.get(id);

    // If there's nothing in the map, it means we tried to get an account
    // that does not belong to this multichain account.
    if (!provider) {
      return undefined;
    }
    return provider.getAccount(id);
  }

  /**
   * Query an account matching the selector.
   *
   * @param selector - Query selector.
   * @returns The account matching the selector or undefined if not matching.
   * @throws If multiple accounts match the selector.
   */
  get(selector: AccountSelector<Account>): Bip44Account<Account> | undefined {
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

  /**
   * Query accounts matching the selector.
   *
   * @param selector - Query selector.
   * @returns The accounts matching the selector.
   */
  select(selector: AccountSelector<Account>): Bip44Account<Account>[] {
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
 * Checks if the given value is {@link MultichainAccountId}.
 *
 * @param value - The value to check.
 * @returns Whether the value is a {@link MultichainAccountId}.
 */
export function isMultichainAccountId(
  value: string,
): value is MultichainAccountId {
  return MULTICHAIN_ACCOUNT_ID_REGEX.test(value);
}

/**
 * Gets the multichain account index from an account group ID.
 *
 * @param id - Multichain account ID.
 * @returns The multichain account index if extractable, undefined otherwise.
 */
export function getGroupIndexFromMultichainAccountId(
  id: MultichainAccountId,
): number {
  const matched = id.match(MULTICHAIN_ACCOUNT_ID_REGEX);
  if (matched?.groups?.groupIndex === undefined) {
    // Unable to extract group index, even though, type wise, this should not
    // be possible!
    throw new Error('Unable to extract group index');
  }

  return Number(matched.groups.groupIndex);
}
