import {
  type CreateAccountOptions,
  EthAccountType,
  EthKeyringMethod,
  EthKeyringWrapper,
  EthMethod,
  EthScope,
  type ExportAccountOptions,
  type ExportedAccount,
  type KeyringAccount,
  KeyringAccountEntropyTypeOption,
  type KeyringCapabilities,
  type KeyringV2,
  KeyringType,
  PrivateKeyEncoding,
} from '@metamask/keyring-api';
import type { AccountId } from '@metamask/keyring-utils';
import { add0x, type Hex, type Json } from '@metamask/utils';
import { Mutex } from 'async-mutex';

// eslint-disable-next-line @typescript-eslint/naming-convention
import type SimpleKeyring from './simple-keyring';

/**
 * Methods supported by SimpleKeyring EOA accounts.
 * SimpleKeyring supports all standard signing methods plus encryption and app keys.
 */
const SIMPLE_KEYRING_METHODS = [
  EthMethod.SignTransaction,
  EthMethod.Sign,
  EthMethod.PersonalSign,
  EthMethod.SignTypedDataV1,
  EthMethod.SignTypedDataV3,
  EthMethod.SignTypedDataV4,
  EthKeyringMethod.Decrypt,
  EthKeyringMethod.GetEncryptionPublicKey,
  EthKeyringMethod.GetAppKeyAddress,
  EthKeyringMethod.SignEip7702Authorization,
];

const simpleKeyringV2Capabilities: KeyringCapabilities = {
  scopes: [EthScope.Eoa],
  privateKey: {
    importFormats: [
      { encoding: PrivateKeyEncoding.Hexadecimal, type: EthAccountType.Eoa },
    ],
    exportFormats: [{ encoding: PrivateKeyEncoding.Hexadecimal }],
  },
};

/**
 * Concrete {@link KeyringV2} adapter for {@link SimpleKeyring}.
 *
 * This wrapper exposes the accounts and signing capabilities of the legacy
 * SimpleKeyring via the unified V2 interface.
 */
export type SimpleKeyringV2Options = {
  legacyKeyring: SimpleKeyring;
};

export class SimpleKeyringV2
  extends EthKeyringWrapper<SimpleKeyring>
  implements KeyringV2
{
  readonly #lock = new Mutex();

  constructor(options: SimpleKeyringV2Options) {
    super({
      type: KeyringType.PrivateKey,
      inner: options.legacyKeyring,
      capabilities: simpleKeyringV2Capabilities,
    });
  }

  /**
   * Creates a KeyringAccount object for the given address and index.
   *
   * @param address - The account address.
   * @returns The created KeyringAccount.
   */
  #createKeyringAccount(address: Hex): KeyringAccount {
    const id = this.registry.register(address);

    const account: KeyringAccount = {
      id,
      type: EthAccountType.Eoa,
      address,
      scopes: [...this.capabilities.scopes],
      methods: [...SIMPLE_KEYRING_METHODS],
      options: {
        entropy: {
          type: KeyringAccountEntropyTypeOption.PrivateKey,
        },
      },
    };

    // Add the account to the registry
    this.registry.set(account);

    return account;
  }

  /**
   * Get all private keys from the inner SimpleKeyring.
   *
   * @returns An array of private keys in hexadecimal format.
   */
  async #getPrivateKeys(): Promise<string[]> {
    return await this.inner.serialize();
  }

  /**
   * Set private keys in the inner SimpleKeyring.
   *
   * @param privateKeys - An array of private keys in hexadecimal format.
   */
  async #setPrivateKeys(privateKeys: string[]): Promise<void> {
    await this.inner.deserialize(privateKeys);
  }

  async getAccounts(): Promise<KeyringAccount[]> {
    const addresses = await this.inner.getAccounts();

    return addresses.map((address) => {
      // Check if we already have this account in the registry
      const existingId = this.registry.getAccountId(address);
      if (existingId) {
        const cached = this.registry.get(existingId);
        if (cached) {
          return cached;
        }
      }

      // Create and register the account if not already cached
      return this.#createKeyringAccount(address);
    });
  }

  async deserialize(state: Json): Promise<void> {
    // Clear the registry when deserializing
    this.registry.clear();

    // Deserialize the legacy keyring
    await this.inner.deserialize(state as string[]);

    // Rebuild the registry by populating it with all accounts
    // We call getAccounts() which will repopulate the registry as a side effect
    await this.getAccounts();
  }

  async createAccounts(
    options: CreateAccountOptions,
  ): Promise<KeyringAccount[]> {
    return this.#lock.runExclusive(async () => {
      // For SimpleKeyring, we only support private key import
      if (options.type !== 'private-key:import') {
        throw new Error(
          `Unsupported account creation type for SimpleKeyring: ${options.type}`,
        );
      }

      // Validate account type
      if (options.accountType !== EthAccountType.Eoa) {
        throw new Error(
          `Unsupported account type for SimpleKeyring: ${options.accountType}. Only '${EthAccountType.Eoa}' is supported.`,
        );
      }

      const { encoding, privateKey } = options;

      // Validate encoding
      if (encoding !== PrivateKeyEncoding.Hexadecimal) {
        throw new Error(
          `Unsupported encoding for SimpleKeyring: ${encoding}. Only '${PrivateKeyEncoding.Hexadecimal}' is supported.`,
        );
      }

      // Get current addresses before import
      const addressesBefore = new Set(await this.inner.getAccounts());

      // Get current accounts to preserve them (also used for rollback)
      const currentAccounts = await this.#getPrivateKeys();

      // Import the new private key by deserializing with all accounts
      await this.#setPrivateKeys([...currentAccounts, privateKey]);

      // Get addresses after import and find the newly added one
      const addressesAfter = await this.inner.getAccounts();

      // Find the new address by diffing the two sets
      const newAddresses = addressesAfter.filter(
        (addr) => !addressesBefore.has(addr),
      );

      if (newAddresses.length !== 1 || !newAddresses[0]) {
        // Rollback the inner keyring state to prevent corruption
        await this.#setPrivateKeys(currentAccounts);
        throw new Error('Failed to import private key');
      }

      const newAddress = newAddresses[0];

      // Create and return the new KeyringAccount
      const newAccount = this.#createKeyringAccount(newAddress);
      return [newAccount];
    });
  }

  /**
   * Delete an account from the keyring.
   *
   * @param accountId - The account ID to delete.
   */
  async deleteAccount(accountId: AccountId): Promise<void> {
    await this.#lock.runExclusive(async () => {
      const account = await this.getAccount(accountId);

      // Remove from the legacy keyring
      this.inner.removeAccount(account.address);

      // Remove from the registry
      this.registry.delete(accountId);
    });
  }

  /**
   * Export the private key for an account in hexadecimal format.
   *
   * @param accountId - The ID of the account to export.
   * @param options - Export options (only hexadecimal encoding is supported).
   * @returns The exported account with private key.
   */
  async exportAccount(
    accountId: AccountId,
    options?: ExportAccountOptions,
  ): Promise<ExportedAccount> {
    const account = await this.getAccount(accountId);

    const requestedEncoding =
      options?.encoding ?? PrivateKeyEncoding.Hexadecimal;

    if (requestedEncoding !== PrivateKeyEncoding.Hexadecimal) {
      throw new Error(
        `Unsupported encoding for SimpleKeyring: ${requestedEncoding}. Only '${PrivateKeyEncoding.Hexadecimal}' is supported.`,
      );
    }

    const privateKeyHex = await this.inner.exportAccount(
      this.toHexAddress(account.address),
    );
    // Sanitize private key format
    const privateKey = add0x(privateKeyHex);

    const exported: ExportedAccount = {
      type: 'private-key',
      privateKey,
      encoding: PrivateKeyEncoding.Hexadecimal,
    };

    return exported;
  }
}
