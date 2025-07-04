import type { CaipChainId, EntropySourceId } from '@metamask/keyring-api';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import type { AccountId } from '@metamask/keyring-utils';

import type { MultichainAccountId, MultichainAccountWalletId } from './id';

export type AccountType = string;

export type AccountMethod = string;

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
