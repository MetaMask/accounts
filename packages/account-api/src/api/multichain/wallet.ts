import type { EntropySourceId, KeyringAccount } from '@metamask/keyring-api';

import {
  getGroupIndexFromAccountGroupId,
  MultichainAccountAdapter,
  type MultichainAccount,
} from './account';
import type { MultichainAccountProvider } from './provider';
import type { AccountGroupId } from '../group';
import { toDefaultAccountGroupId } from '../group';
import type { AccountWallet } from '../wallet';
import { AccountWalletCategory } from '../wallet';

export type MultichainAccountWalletId =
  `${AccountWalletCategory.Entropy}:${EntropySourceId}`;

export type MultichainAccountWallet<Account extends KeyringAccount> =
  AccountWallet<Account> & {
    get id(): MultichainAccountWalletId;

    get entropySource(): EntropySourceId;

    /**
     * Gets multichain account for a given index.
     *
     * @returns Multichain accounts.
     */
    getMultichainAccount(
      groupIndex: number,
    ): MultichainAccount<Account> | undefined;

    /**
     * Gets multichain accounts.
     *
     * @returns Multichain accounts.
     */
    getMultichainAccounts(): MultichainAccount<Account>[];
  };

export class MultichainAccountWalletAdapter<Account extends KeyringAccount>
  implements MultichainAccountWallet<Account>
{
  readonly #id: MultichainAccountWalletId;

  readonly #providers: MultichainAccountProvider<Account>[];

  readonly #entropySource: EntropySourceId;

  readonly #accounts: Map<number, MultichainAccount<Account>>;

  constructor({
    providers,
    entropySource,
  }: {
    providers: MultichainAccountProvider<Account>[];
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
