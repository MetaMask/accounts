import {
  type EntropySourceId,
  type KeyringAccount,
} from '@metamask/keyring-api';

import {
  getGroupIndexFromMultichainAccountId,
  isMultichainAccountId,
  MultichainAccount,
} from './account';
import type { Bip44Account } from '../bip44';
import type { AccountGroupId } from '../group';
import { toDefaultAccountGroupId } from '../group';
import type { AccountProvider } from '../provider';
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
export class MultichainAccountWallet<
  Account extends Bip44Account<KeyringAccount>,
> implements AccountWallet<Account>
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

    // Initial synchronization.
    this.sync();
  }

  /**
   * Force wallet synchronization.
   *
   * This can be used if account providers got new accounts that the wallet
   * doesn't know about.
   */
  sync(): void {
    // We keep track of all existing indexes to see if some of them are no
    // longer in use after the sync.
    const outdatedIndexes = new Set(this.#accounts.keys());

    for (const provider of this.#providers) {
      for (const account of provider.getAccounts()) {
        const { entropy } = account.options;

        // Filter for this wallet only.
        if (entropy.id !== this.entropySource) {
          continue;
        }

        // We still got an account for this index, thus we can mark this index
        // as "in use" (to not clean it up later on).
        outdatedIndexes.delete(entropy.groupIndex);

        // This multichain account might exists already.
        let multichainAccount = this.#accounts.get(entropy.groupIndex);
        if (!multichainAccount) {
          multichainAccount = new MultichainAccount<Account>({
            groupIndex: entropy.groupIndex,
            wallet: this,
            providers: this.#providers,
          });

          this.#accounts.set(entropy.groupIndex, multichainAccount);
        }
      }
    }

    // Clean up old multichain accounts.
    for (const outdatedIndex of outdatedIndexes) {
      this.#accounts.delete(outdatedIndex);
    }
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
