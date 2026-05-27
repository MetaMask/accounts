import type { Bip44Account } from '@metamask/account-api';
import {
  EthAccountType,
  EthMethod,
  EthScope,
  KeyringAccountEntropyTypeOption,
} from '@metamask/keyring-api';
import type {
  CreateAccountOptions,
  EntropySourceId,
  KeyringAccount,
} from '@metamask/keyring-api';
import { KeyringType } from '@metamask/keyring-api/v2';
import type { KeyringCapabilities, Keyring } from '@metamask/keyring-api/v2';
import { EthKeyringMethod, EthKeyringWrapper } from '@metamask/keyring-sdk/v2';
import { AccountId } from '@metamask/keyring-utils';
import { assert, Hex } from '@metamask/utils';

import { MONEY_DERIVATION_PATH } from '../money-keyring';
import type { MoneyKeyring as LegacyMoneyKeyring } from '../money-keyring';

/**
 * Capabilities for the MoneyKeyring.
 */
const moneyKeyringCapabilities: KeyringCapabilities = {
  scopes: [EthScope.Eoa],
  bip44: {
    deriveIndex: true,
  },
};

/**
 * Methods supported by MoneyKeyring EOA accounts.
 * MoneyKeyring supports a subset of signing methods.
 */
const MONEY_KEYRING_METHODS = [
  EthMethod.PersonalSign,
  EthMethod.SignTypedDataV1,
  EthMethod.SignTypedDataV3,
  EthMethod.SignTypedDataV4,
  EthKeyringMethod.SignEip7702Authorization,
];

/**
 * Concrete {@link Keyring} adapter for {@link MoneyKeyring}.
 *
 * This wrapper exposes the accounts and signing capabilities of the legacy
 * MoneyKeyring via the unified V2 interface.
 */
export class MoneyKeyring
  extends EthKeyringWrapper<LegacyMoneyKeyring, Bip44Account<KeyringAccount>>
  implements Keyring
{
  constructor(inner: LegacyMoneyKeyring) {
    super({
      inner,
      type: KeyringType.Money,
      capabilities: moneyKeyringCapabilities,
    });
  }

  /**
   * The entropy source ID for the MoneyKeyring.
   *
   * @returns The entropy source ID.
   */
  get entropySource(): string | undefined {
    return this.inner.entropySource;
  }

  /**
   * Creates a KeyringAccount object for the given address and index.
   *
   * @param address - The account address.
   * @param addressIndex - The account index in the derivation path.
   * @param entropySource - The entropy source ID.
   * @returns The created KeyringAccount.
   */
  #createKeyringAccount(
    address: Hex,
    addressIndex: number,
    entropySource: EntropySourceId,
  ): Bip44Account<KeyringAccount> {
    const id = this.registry.register(address);

    const account: Bip44Account<KeyringAccount> = {
      id,
      type: EthAccountType.Eoa,
      address,
      scopes: [...this.capabilities.scopes],
      methods: [...MONEY_KEYRING_METHODS],
      options: {
        entropy: {
          type: KeyringAccountEntropyTypeOption.Mnemonic,
          id: entropySource,
          groupIndex: addressIndex,
          derivationPath: `${MONEY_DERIVATION_PATH}/${addressIndex}`,
        },
      },
    };

    this.registry.set(account);

    return account;
  }

  /**
   * Returns all accounts managed by the MoneyKeyring.
   *
   * @returns A promise that resolves to an array of all accounts managed by
   * this keyring.
   */
  async getAccounts(): Promise<Bip44Account<KeyringAccount>[]> {
    const { entropySource } = this.inner;

    assert(entropySource, 'MoneyKeyring: not yet deserialized');

    const addresses = await this.inner.getAccounts();

    // The legitimate states are "no account yet" (empty) and "the single
    // Money account". Anything beyond that means the inner keyring has been
    // mutated in a way the wrapper does not support.
    assert(addresses.length <= 1, 'MoneyKeyring: supports at most one account');

    return addresses.map((address) => {
      const existingId = this.registry.getAccountId(address);
      if (existingId) {
        const cached = this.registry.get(existingId);
        if (cached) {
          return cached;
        }
      }

      return this.#createKeyringAccount(address, 0, entropySource);
    });
  }

  /**
   * Creates a new account according to the provided options.
   *
   * @param options - Options describing how to create the account.
   * @returns A promise that resolves to the created account.
   */
  async createAccounts(
    options: CreateAccountOptions,
  ): Promise<Bip44Account<KeyringAccount>[]> {
    return this.withLock(async () => {
      if (options.type !== 'bip44:derive-index') {
        throw new Error(
          `MoneyKeyring: unsupported account creation type: ${options.type}`,
        );
      }

      const { entropySource } = this.inner;

      if (!entropySource) {
        throw new Error('MoneyKeyring: not yet deserialized');
      }

      if (options.entropySource !== entropySource) {
        throw new Error(
          `MoneyKeyring: entropy source mismatch: expected '${entropySource}', got '${options.entropySource}'`,
        );
      }

      if (options.groupIndex !== 0) {
        throw new Error(
          'MoneyKeyring: supports only creating the first account, groupIndex must be 0',
        );
      }

      const currentAccounts = await this.getAccounts();

      if (currentAccounts.length > 0) {
        return currentAccounts;
      }

      const [newAddress] = await this.inner.addAccounts(1);

      if (!newAddress) {
        throw new Error('MoneyKeyring: failed to add account');
      }

      return [this.#createKeyringAccount(newAddress, 0, entropySource)];
    });
  }

  /**
   * Deletes the account with the specified ID.
   *
   * NOTE: MoneyKeyring does not currently support deleting accounts
   *
   * @param accountId - The account ID to delete.
   * @returns A promise that resolves when the account has been deleted.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async deleteAccount(accountId: AccountId): Promise<void> {
    /**
     * NOOP: MoneyKeyring does not support deleting accounts
     */
  }
}
