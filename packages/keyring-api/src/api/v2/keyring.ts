import type { AccountId } from '@metamask/keyring-utils';
import type { Json } from '@metamask/utils';

import type { CreateAccountOptions } from './create-account';
import type { ExportedAccount, ExportAccountOptions } from './export-account';
import type { KeyringCapabilities } from './keyring-capabilities';
import type { KeyringType } from './keyring-type';
import type { KeyringAccount } from '../account';
import type { Keyring } from '../keyring';
import type { KeyringRequest } from '../request';

/**
 * The KeyringV2 interface defines methods for managing accounts and signing
 * requests. This interface unifies the existing EVM and Snap keyring interfaces
 * to provide a consistent API for all keyring type.
 *
 * This interface supports both EVM and non-EVM chains, and includes
 * account metadata needed for features like Multi-SRP and Backup and Sync.
 */
export type KeyringV2 = Keyring & {
  /**
   * Type of the keyring.
   */
  type: KeyringType;

  /**
   * List of capabilities supported by the keyring.
   */
  capabilities: KeyringCapabilities;

  /**
   * Serialize the keyring state to a JSON object.
   *
   * @returns A promise that resolves to a JSON-serializable representation of
   * the keyring state.
   */
  serialize(): Promise<Json>;

  /**
   * Restores the keyring state from a serialized JSON object.
   *
   * @param state - A JSON object representing a serialized keyring state.
   * @returns A promise that resolves when the keyring state has been restored.
   */
  deserialize(state: Json): Promise<void>;

  /**
   * Initialize the keyring.
   *
   * This method is called after the constructor to allow the keyring to
   * perform any necessary asynchronous initialization tasks.
   *
   * @returns A promise that resolves when initialization is complete.
   */
  init?(): Promise<void>;

  /**
   * Destroy the keyring.
   *
   * This method is called before the keyring is removed from the Keyring
   * Controller, allowing the keyring to perform any necessary cleanup tasks.
   *
   * @returns A promise that resolves when cleanup is complete.
   */
  destroy?(): Promise<void>;

  /**
   * Returns all accounts managed by the keyring.
   *
   * @returns A promise that resolves to an array of all accounts managed by
   * this keyring.
   */
  getAccounts(): Promise<KeyringAccount[]>;

  /**
   * Returns the account with the specified ID.
   *
   * @param accountId - ID of the account to retrieve.
   * @returns A promise that resolves to the account with the given ID.
   */
  getAccount(accountId: AccountId): Promise<KeyringAccount>;

  /**
   * Creates one or more new accounts according to the provided options.
   *
   * Deterministic account creation MUST be idempotent, meaning that for
   * deterministic algorithms, like BIP-44, calling this method with the same
   * options should always return the same accounts, even if the accounts
   * already exist in the keyring.
   *
   * @param options - Options describing how to create the account(s).
   * @returns A promise that resolves to an array of the created account objects.
   */
  createAccounts(options: CreateAccountOptions): Promise<KeyringAccount[]>;

  /**
   * Deletes the account with the specified ID.
   *
   * @param accountId - ID of the account to delete.
   * @returns A promise that resolves when the account has been deleted.
   */
  deleteAccount(accountId: AccountId): Promise<void>;

  /**
   * Exports the private key or secret material for the specified account.
   *
   * @param accountId - ID of the account to export.
   * @param options - Optional export options.
   * @returns A promise that resolves to the exported account data.
   */
  exportAccount?(
    accountId: AccountId,
    options?: ExportAccountOptions,
  ): Promise<ExportedAccount>;

  /**
   * Submits a request to the keyring.
   *
   * @param request - The `KeyringRequest` object to submit.
   * @returns A promise that resolves to the response for the request.
   */
  submitRequest(request: KeyringRequest): Promise<Json>;
};
