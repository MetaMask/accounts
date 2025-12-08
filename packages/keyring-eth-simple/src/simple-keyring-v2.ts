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
import { add0x, type Hex } from '@metamask/utils';

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

  /**
   * Executes a transactional update on the inner keyring state.
   * If the callback throws, the state is automatically rolled back.
   *
   * @param callback - A function that receives the current private keys and performs the update.
   * Should return the result on success, or throw to trigger rollback.
   * @returns The result of the callback.
   * @throws Error if the callback throws (after rollback).
   */
  async #withRollback<Result>(
    callback: (currentPrivateKeys: string[]) => Promise<Result>,
  ): Promise<Result> {
    const originalPrivateKeys = await this.#getPrivateKeys();

    try {
      return await callback(originalPrivateKeys);
    } catch (error) {
      // Rollback on error
      await this.#setPrivateKeys(originalPrivateKeys);
      throw error;
    }
  }

  /**
   * Import a private key and return the new address.
   * If the import fails (no new address added), rolls back to the original state.
   *
   * @param privateKey - The private key to import in hexadecimal format.
   * @returns The address of the newly imported account.
   * @throws Error if the import fails or no new address is added.
   */
  async #importPrivateKeyOrRollback(privateKey: string): Promise<Hex> {
    return this.#withRollback(async (currentPrivateKeys) => {
      // Get current addresses before import
      const addressesBefore = new Set(await this.inner.getAccounts());

      // Import the new private key
      await this.#setPrivateKeys([...currentPrivateKeys, privateKey]);

      // Get addresses after import and find the newly added one
      const addressesAfter = await this.inner.getAccounts();

      // Find the new address by diffing the two sets
      const newAddresses = addressesAfter.filter(
        (addr) => !addressesBefore.has(addr),
      );

      if (newAddresses.length !== 1 || !newAddresses[0]) {
        throw new Error('Failed to import private key');
      }

      return newAddresses[0];
    });
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

  async createAccounts(
    options: CreateAccountOptions,
  ): Promise<KeyringAccount[]> {
    return this.withInnerKeyring(async () => {
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

      // Import the private key (with automatic rollback on failure)
      const newAddress = await this.#importPrivateKeyOrRollback(privateKey);

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
    await this.withInnerKeyring(async () => {
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
