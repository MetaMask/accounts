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
import type {
  AccountProvider,
  AccountProviderEventUnsubscriber,
} from '../provider';
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

  readonly #providers: AccountProvider<Account>[];

  readonly #unsubscribers: AccountProviderEventUnsubscriber[];

  readonly #entropySource: EntropySourceId;

  readonly #accounts: Map<number, MultichainAccount<Account>>;

  readonly #reverse: Map<Account['id'], MultichainAccount<Account>>;

  constructor({
    providers,
    entropySource,
  }: {
    providers: AccountProvider<Account>[];
    entropySource: EntropySourceId;
  }) {
    this.#id = toMultichainAccountWalletId(entropySource);
    this.#providers = providers;
    this.#unsubscribers = [];
    this.#entropySource = entropySource;
    this.#accounts = new Map();
    this.#reverse = new Map();

    this.#update();
    this.#subscribe();
  }

  /**
   * Destroy in-memory wallet.
   */
  destroy(): void {
    for (const unsubscribe of this.#unsubscribers) {
      unsubscribe();
    }
  }

  /**
   * Subscribe to account provider events.
   */
  #subscribe(): void {
    // Listen for account events and see if we need to update our content.
    for (const provider of this.#providers) {
      const unsubscribe = provider.subscribe(
        'AccountProvider:accountAdded',
        (account) => this.#handleOnAccountAdded(account),
      );
      this.#unsubscribers.push(unsubscribe);
    }
  }

  /**
   * Update internal multichain accounts.
   */
  #update(): void {
    // NOTE: We could have some gap for now, until we fully implement the
    // gap/alignment mechanisms to backfill all "missing accounts".
    for (const provider of this.#providers) {
      for (const account of provider.getAccounts()) {
        const multichainAccount = this.#getOrCreateMultichainAccount(
          account.options.entropy.groupIndex,
        );

        // Reverse-mapping for fast indexing.
        this.#reverse.set(account.id, multichainAccount);
      }
    }
  }

  /**
   * Callback when an account got added to the account provider.
   *
   * @param account - Account being added.
   */
  #handleOnAccountAdded(account: Bip44Account<Account>): void {
    // We call get or create, because this might be a new multichain account!
    const multichainAccount = this.#getOrCreateMultichainAccount(
      account.options.entropy.groupIndex,
    );

    // Reverse-mapping for fast indexing.
    this.#reverse.set(account.id, multichainAccount);
  }

  /**
   * Gets or create a multichain account for the given group index.
   *
   * @param groupIndex - Group index.
   * @returns The existing multichain account or create a new one for that group index
   * and returns it.
   */
  #getOrCreateMultichainAccount(
    groupIndex: number,
  ): MultichainAccount<Account> {
    let multichainAccount = this.#accounts.get(groupIndex);

    if (!multichainAccount) {
      multichainAccount = new MultichainAccount<Account>({
        groupIndex,
        wallet: this,
        providers: this.#providers,
      });

      // We assume this new multichain account has underlying accounts.
      this.#accounts.set(groupIndex, multichainAccount);
    }

    return multichainAccount;
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

  /**
   * Gets multichain accounts given an underlying account ID.
   *
   * @param id - Account ID.
   * @returns The multichain account or undefined if not found.
   */
  getMultichainAccountFromAccountId(
    id: Account['id'],
  ): MultichainAccount<Account> | undefined {
    return this.#reverse.get(id);
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
