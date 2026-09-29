import {
  EthAccountType,
  EthMethod,
  EthScope,
  KeyringAccountEntropyTypeOption,
} from '@metamask/keyring-api';
import type { KeyringAccount } from '@metamask/keyring-api';
import { KeyringType } from '@metamask/keyring-api/v2';
import type { KeyringCapabilities, Keyring } from '@metamask/keyring-api/v2';
import { EthKeyringMethod, EthKeyringWrapper } from '@metamask/keyring-sdk/v2';
import type { AccountId } from '@metamask/keyring-utils';
import { assert } from '@metamask/utils';
import type { Hex } from '@metamask/utils';

import type { MpcKeyringSetupParams, MpcKeyringV1 } from '../types';

/**
 * Methods supported by MPC keyring EOA accounts.
 * MPC keyrings support signing methods, but not encryption or app keys.
 */
const MPC_KEYRING_METHODS = [
  EthMethod.SignTransaction,
  EthMethod.PersonalSign,
  EthMethod.SignTypedDataV1,
  EthMethod.SignTypedDataV3,
  EthMethod.SignTypedDataV4,
  EthKeyringMethod.SignEip7702Authorization,
];

/**
 * Capabilities for the MPC keyring.
 */
const mpcKeyringCapabilities: KeyringCapabilities = {
  scopes: [EthScope.Eoa],
  custom: {
    createAccounts: true,
  },
};

/**
 * Options for creating an account in the MPC keyring.
 */
export type MpcCreateAccountOptions = {
  /**
   * The type of the options.
   */
  type: 'custom';

  /**
   * The MPC setup mode.
   */
  mode?: MpcKeyringSetupParams['mode'];
};

/**
 * Options for constructing the V2 {@link MpcKeyring}.
 */
export type MpcKeyringOptions = {
  /**
   * The underlying "old" keyring instance that this wrapper adapts.
   */
  legacyKeyring: MpcKeyringV1;
};

/**
 * Concrete {@link Keyring} adapter for a {@link MpcKeyringV1}
 * implementation.
 *
 * This wrapper exposes the accounts and signing capabilities of the legacy
 * MPC keyring via the unified V2 interface.
 */
export class MpcKeyring
  extends EthKeyringWrapper<MpcKeyringV1>
  implements Keyring
{
  constructor(options: MpcKeyringOptions) {
    super({
      type: KeyringType.Mpc,
      inner: options.legacyKeyring,
      capabilities: mpcKeyringCapabilities,
    });
  }

  /**
   * Return all accounts managed by this keyring.
   *
   * @returns The list of managed accounts.
   */
  async getAccounts(): Promise<KeyringAccount[]> {
    const addresses = await this.inner.getAccounts();

    assert(addresses.length <= 1, 'MpcKeyring: supports at most one account');

    return addresses.map((address) => {
      // Check if we already have this account in the registry
      const existingId = this.registry.getAccountId(address);
      if (existingId) {
        const cached = this.registry.get(existingId);
        if (cached) {
          return cached;
        }
      }

      return this.#createKeyringAccount(address);
    });
  }

  /**
   * Create the account according to the provided options.
   *
   * @param options - Options describing how to create the account.
   * @returns A promise that resolves to a list containing the created
   * account.
   */
  async createAccounts(
    options: MpcCreateAccountOptions,
  ): Promise<KeyringAccount[]> {
    return this.withLock(async () => {
      if (options.type !== 'custom') {
        throw new Error(
          `MpcKeyring: unsupported account creation type: ${String(
            options.type,
          )}. Use { type: 'custom', mode: 'create' | 'import' }.`,
        );
      }

      const { mode } = options;
      if (mode !== undefined && mode !== 'create' && mode !== 'import') {
        throw new Error(
          `MpcKeyring: invalid mode: ${String(
            mode,
          )}. Expected 'create' or 'import'.`,
        );
      }

      // If the account already exists, creation is idempotent.
      const existingAccounts = await this.getAccounts();
      if (existingAccounts.length > 0) {
        return existingAccounts;
      }

      await this.inner.init(mode);

      const accounts = await this.getAccounts();
      if (accounts.length === 0) {
        throw new Error(
          "MpcKeyring: account creation failed. Provide a 'mode' ('create' or 'import') or deserialize stored setup params first.",
        );
      }

      return accounts;
    });
  }

  /**
   * Deleting accounts is not supported.
   *
   * @param _accountId - The account ID to delete.
   */
  async deleteAccount(_accountId: AccountId): Promise<void> {
    throw new Error('MpcKeyring: deleting accounts is not supported');
  }

  /**
   * Rotate the MPC key shares.
   *
   * @returns Resolves when the rotation is complete.
   */
  async rotateKeyShares(): Promise<void> {
    return this.inner.rotateKeyShares();
  }

  /**
   * Check the MPC key share state.
   *
   * @returns Whether the key share is up to date.
   */
  async checkKeyShare(): Promise<boolean> {
    return this.inner.checkKeyShare();
  }

  /**
   * Synchronize the MPC key share.
   *
   * @returns Resolves when the key share is synchronized.
   */
  async syncKeyShare(): Promise<void> {
    return this.inner.syncKeyShare();
  }

  /**
   * Create a {@link KeyringAccount} for the given address.
   *
   * @param address - The account address.
   * @returns The created account.
   */
  #createKeyringAccount(address: Hex): KeyringAccount {
    const id = this.registry.register(address);

    const account: KeyringAccount = {
      id,
      type: EthAccountType.Eoa,
      address,
      scopes: [...this.capabilities.scopes],
      methods: [...MPC_KEYRING_METHODS],
      options: {
        entropy: {
          type: KeyringAccountEntropyTypeOption.Custom,
        },
      },
    };

    this.registry.set(account);

    return account;
  }
}
