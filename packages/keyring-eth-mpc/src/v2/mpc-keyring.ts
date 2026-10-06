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
import type { Hex } from '@metamask/utils';

import { MpcKeyringSetupMode } from '../types';
import type { MpcKeyring as MpcKeyringV1 } from '../types';

/**
 * Methods supported by MPC keyring EOA accounts.
 * MPC keyrings support signing methods, but not encryption or app keys.
 */
export const MPC_KEYRING_METHODS = [
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
  mode?: MpcKeyringSetupMode;
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

    if (addresses.length > 1) {
      throw new Error('MpcKeyring: supports at most one account');
    }

    const [address] = addresses;
    if (address) {
      return [this.#getOrCreateAccount(address)];
    }
    return [];
  }

  /**
   * Build a valid {@link KeyringAccount} from an address.
   *
   * @param address - The account address.
   * @returns The account.
   */
  #toAccount(address: Hex): KeyringAccount {
    return {
      id: this.registry.register(address),
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
  }

  /**
   * Get or create the account for the given address.
   *
   * @param address - The account address.
   * @returns The account.
   */
  #getOrCreateAccount(address: Hex): KeyringAccount {
    const account = this.#toAccount(address);
    const existingAccount = this.registry.get(account.id);

    if (existingAccount) {
      return existingAccount;
    }

    this.registry.set(account);
    return account;
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
          )}`,
        );
      }

      const { mode } = options;
      if (
        mode !== undefined &&
        mode !== MpcKeyringSetupMode.Create &&
        mode !== MpcKeyringSetupMode.Import
      ) {
        throw new Error(`MpcKeyring: invalid mode: ${String(mode)}`);
      }

      const accounts = await this.getAccounts();
      if (accounts.length > 0) {
        return accounts;
      }

      await this.inner.init(mode);

      const [createdAccount] = await this.getAccounts();
      if (!createdAccount) {
        throw new Error('MpcKeyring: account creation failed');
      }

      return [createdAccount];
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
}
