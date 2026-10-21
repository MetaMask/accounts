import type { MpcAccount } from '@metamask/account-api';
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

import { MpcMoneyKeyringSetupMode } from '../types.js';
import type { MpcMoneyKeyring as MpcMoneyKeyringV1 } from '../types.js';

/**
 * Methods supported by MPC money keyring EOA accounts.
 * MPC money keyrings support message signing, but not transactions,
 * encryption, or app keys.
 */
export const MPC_MONEY_KEYRING_METHODS = [
  EthMethod.PersonalSign,
  EthMethod.SignTypedDataV1,
  EthMethod.SignTypedDataV3,
  EthMethod.SignTypedDataV4,
  EthKeyringMethod.SignEip7702Authorization,
];

/**
 * Capabilities for the MPC money keyring.
 */
const mpcMoneyKeyringCapabilities: KeyringCapabilities = {
  scopes: [EthScope.Eoa],
  custom: {
    createAccounts: true,
  },
};

/**
 * Options for creating an account in the MPC money keyring.
 */
export type MpcMoneyCreateAccountOptions = {
  /**
   * The type of the options.
   */
  type: 'custom';

  /**
   * The MPC setup mode. Defaults to inferring the mode from the backend:
   * `import` when a key share or backup exists for the profile, `create`
   * otherwise.
   */
  mode?: MpcMoneyKeyringSetupMode;
};

/**
 * Options for constructing the V2 {@link MpcMoneyKeyring}.
 */
export type MpcMoneyKeyringOptions = {
  /**
   * The underlying "old" keyring instance that this wrapper adapts.
   */
  legacyKeyring: MpcMoneyKeyringV1;
};

/**
 * Concrete {@link Keyring} adapter for a {@link MpcMoneyKeyringV1}
 * implementation.
 *
 * This wrapper exposes the accounts and signing capabilities of the legacy
 * MPC money keyring via the unified V2 interface.
 */
export class MpcMoneyKeyring
  extends EthKeyringWrapper<MpcMoneyKeyringV1, MpcAccount<KeyringAccount>>
  implements Keyring
{
  constructor(options: MpcMoneyKeyringOptions) {
    super({
      type: KeyringType.MpcMoney,
      inner: options.legacyKeyring,
      capabilities: mpcMoneyKeyringCapabilities,
    });
  }

  /**
   * Return all accounts managed by this keyring.
   *
   * @returns The list of managed accounts.
   */
  async getAccounts(): Promise<MpcAccount<KeyringAccount>[]> {
    const addresses = await this.inner.getAccounts();

    if (addresses.length > 1) {
      throw new Error('MpcMoneyKeyring: supports at most one account');
    }

    const [address] = addresses;
    if (address) {
      return [this.#getOrCreateAccount(address)];
    }
    return [];
  }

  /**
   * Build a valid {@link MpcAccount} from an address.
   *
   * @param address - The account address.
   * @returns The account.
   */
  #toAccount(address: Hex): MpcAccount<KeyringAccount> {
    return {
      id: this.registry.register(address),
      type: EthAccountType.Eoa,
      address,
      scopes: [...this.capabilities.scopes],
      methods: [...MPC_MONEY_KEYRING_METHODS],
      options: {
        entropy: {
          type: KeyringAccountEntropyTypeOption.Mpc,
        },
        exportable: false,
      },
    };
  }

  /**
   * Get or create the account for the given address.
   *
   * @param address - The account address.
   * @returns The account.
   */
  #getOrCreateAccount(address: Hex): MpcAccount<KeyringAccount> {
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
    options: MpcMoneyCreateAccountOptions,
  ): Promise<MpcAccount<KeyringAccount>[]> {
    return this.withLock(async () => {
      if (options.type !== 'custom') {
        throw new Error(
          `MpcMoneyKeyring: unsupported account creation type: ${String(
            options.type,
          )}`,
        );
      }

      const { mode } = options;
      if (
        mode !== undefined &&
        mode !== MpcMoneyKeyringSetupMode.Create &&
        mode !== MpcMoneyKeyringSetupMode.Import
      ) {
        throw new Error(`MpcMoneyKeyring: invalid mode: ${String(mode)}`);
      }

      const accounts = await this.getAccounts();
      if (accounts.length > 0) {
        return accounts;
      }

      await this.inner.setup(mode);

      const [createdAccount] = await this.getAccounts();
      if (!createdAccount) {
        throw new Error('MpcMoneyKeyring: account creation failed');
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
    throw new Error('MpcMoneyKeyring: deleting accounts is not supported');
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
