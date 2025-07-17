import type { EntropySourceId, KeyringAccount } from '@metamask/keyring-api';

import {
  getGroupIndexFromMultichainAccountId,
  isMultichainAccountId,
  MultichainAccount,
} from './account';
import type { AccountGroupId } from '../group';
import { toDefaultAccountGroupId } from '../group';
import type { AccountGroupProvider } from '../provider';
import type { AccountWallet } from '../wallet';
import { AccountWalletCategory } from '../wallet';

/**
 * Multichain account wallet ID.
 */
export type MultichainAccountWalletId =
  `${AccountWalletCategory.Entropy}:${EntropySourceId}`;

/**
 * A multichain account wallet that holds multiple multichain accounts (one multichain account per
 * group index).
 */
export class MultichainAccountWallet<Account extends KeyringAccount>
  implements AccountWallet<Account>
{
  readonly #id: MultichainAccountWalletId;

  readonly #providers: AccountGroupProvider<Account>[];

  readonly #entropySource: EntropySourceId;

  readonly #accounts: Map<number, MultichainAccount<Account>>;

  constructor({
    providers,
    entropySource,
  }: {
    providers: AccountGroupProvider<Account>[];
    entropySource: EntropySourceId;
  }) {
    this.#id = toMultichainAccountWalletId(entropySource);
    this.#providers = providers;
    this.#entropySource = entropySource;
    this.#accounts = new Map();

    let groupIndex = 0;
    let hasAccounts = false;

    // NOTE: We do not allow any gap for now. So if we have accounts for index 0 and index 2,
    // then this logic will stop at index 1, given that no account will be "provided".
    //
    // QUESTION: Should we a hard limit to the `groupIndex` to avoid having an infinite
    // loop here in case one of the provider is buggy?
    do {
      const multichainAccount = new MultichainAccount<Account>({
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

  /**
   * Gets the multichain account wallet ID.
   *
   * @returns The multichain account wallet ID.
   */
  get id(): MultichainAccountWalletId {
    return this.#id;
  }

  /**
   * Gets the multichain account wallet category, which is always {@link AccountWalletCategory.Entropy}.
   *
   * @returns The multichain account wallet category.
   */
  get category(): AccountWalletCategory.Entropy {
    return AccountWalletCategory.Entropy;
  }

  /**
   * Gets the multichain account wallet entropy source.
   *
   * @returns The multichain account wallet entropy source.
   */
  get entropySource(): EntropySourceId {
    return this.#entropySource;
  }

  /**
   * Gets multichain account for a given ID.
   * The default group ID will default to the multichain account with index 0.
   *
   * @param id - Account group ID.
   * @returns Account group.
   */
  getAccountGroup(id: AccountGroupId): MultichainAccount<Account> | undefined {
    // We consider the "default case" to be mapped to index 0.
    if (id === toDefaultAccountGroupId(this.id)) {
      return this.#accounts.get(0);
    }

    // If it is not a valid ID, we cannot extract the group index
    // from it, so we fail fast.
    if (!isMultichainAccountId(id)) {
      return undefined;
    }

    const groupIndex = getGroupIndexFromMultichainAccountId(id);
    return this.#accounts.get(groupIndex);
  }

  /**
   * Gets all multichain accounts. Similar to {@link MultichainAccountWallet.getMultichainAccounts}.
   *
   * @returns The multichain accounts.
   */
  getAccountGroups(): MultichainAccount<Account>[] {
    return this.getMultichainAccounts();
  }

  /**
   * Gets multichain account for a given index.
   *
   * @param groupIndex - Multichain account index.
   * @returns The multichain account associated with the given index.
   */
  getMultichainAccount(
    groupIndex: number,
  ): MultichainAccount<Account> | undefined {
    return this.#accounts.get(groupIndex);
  }

  /**
   * Gets all multichain accounts.
   *
   * @returns The multichain accounts.
   */
  getMultichainAccounts(): MultichainAccount<Account>[] {
    return Array.from(this.#accounts.values()); // TODO: Prevent copy here.
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
