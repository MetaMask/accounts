import type { KeyringAccount } from '@metamask/keyring-api';
import { isScopeEqualToAny } from '@metamask/keyring-utils';

import type {
  MultichainAccountWallet,
  MultichainAccountWalletId,
} from './wallet';
import type { AccountGroup } from '../group';
import type { AccountGroupProvider } from '../provider';
import { AccountWalletCategory } from '../wallet';

const MULTICHAIN_ACCOUNT_ID_REGEX = new RegExp(
  `^${AccountWalletCategory.Entropy}:.*/(?<groupIndex>\\d+)$`,
  'u',
);

/**
 * Selector to query a specific account based on some criteria.
 */
export type MultichainAccountSelector<Account extends KeyringAccount> = {
  /**
   * Query by account ID.
   */
  id?: Account['id'];

  /**
   * Query by account address.
   */
  address?: Account['address'];

  /**
   * Query by account type.
   */
  type?: Account['type'];

  /**
   * Query by account methods.
   */
  methods?: Account['methods'];

  /**
   * Query by account scopes.
   */
  scopes?: Account['scopes'];
};

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

  readonly #providers: AccountGroupProvider<Account>[];

  constructor({
    groupIndex,
    wallet,
    providers,
  }: {
    groupIndex: number;
    wallet: MultichainAccountWallet<Account>;
    providers: AccountGroupProvider<Account>[];
  }) {
    this.#id = toMultichainAccountId(wallet.id, groupIndex);
    this.#index = groupIndex;
    this.#wallet = wallet;
    this.#providers = providers;
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
    return this.getAccounts().length > 0;
  }

  /**
   * Gets the accounts for this multichain account.
   *
   * @returns The accounts.
   */
  getAccounts(): Account[] {
    let allAccounts: Account[] = [];

    for (const provider of this.#providers) {
      allAccounts = allAccounts.concat(
        provider.getAccounts().filter(
          // NOTE: For now we always query the providers to get the latest
          // account list. If this becomes too "heavy" in terms of computation
          // we might wanna consider adding a state to that object and store
          // the list of account IDs here.
          (account) =>
            account.options.entropySource === this.wallet.entropySource &&
            account.options.groupIndex === this.index,
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
  getAccount(id: Account['id']): Account | undefined {
    // NOTE: Same remark here. We could keep a state to make this operation
    // faster.
    return this.getAccounts().find((account) => account.id === id);
  }

  /**
   * Query an account matching the selector.
   *
   * @param selector - Query selector.
   * @returns The account matching the selector or undefined if not matching.
   * @throws If multiple accounts match the selector.
   */
  get(selector: MultichainAccountSelector<Account>): Account | undefined {
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
  select(selector: MultichainAccountSelector<Account>): Account[] {
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
