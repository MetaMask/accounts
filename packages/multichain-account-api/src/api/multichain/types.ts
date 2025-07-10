import type { EntropySourceId, KeyringAccount } from '@metamask/keyring-api';
import type { AccountId } from '@metamask/keyring-utils';
import type { CaipChainId } from '@metamask/utils';

import type { MultichainAccountId, MultichainAccountWalletId } from './id';
import type { AccountGroup } from '../group';
import type { AccountWallet } from '../wallet';

export type AccountType = string;

export type AccountMethod = string;

export type MultichainAccountSelector = {
  id?: AccountId;
  address?: string;
  type?: AccountType;
  methods?: AccountMethod[];
  scopes?: CaipChainId[];
};

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
    createMultichainAccount(
      groupIndex: number,
    ): Promise<MultichainAccount<Account>>;

    /**
     * Creates a new multichain account for the next available group index.
     *
     * @returns Next multichain account.
     */
    createNextMultichainAccount(): Promise<MultichainAccount<Account>>;

    /**
     * Discovers and automatically create multichain accounts for that wallet.
     *
     * @returns List of all multichain accounts that got discovered or automatically created.
     */
    discoverAndCreateMultichainAccounts(): Promise<
      MultichainAccount<Account>[]
    >;
  };
