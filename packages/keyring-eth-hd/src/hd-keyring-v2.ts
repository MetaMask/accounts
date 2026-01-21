import type { Bip44Account } from '@metamask/account-api';
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
  type EntropySourceId,
} from '@metamask/keyring-api';
import type { AccountId } from '@metamask/keyring-utils';
import { add0x, type Hex } from '@metamask/utils';

import type { HdKeyring } from './hd-keyring';

/**
 * Methods supported by HD keyring EOA accounts.
 * HD keyrings support all standard signing methods plus encryption and app keys.
 */
const HD_KEYRING_METHODS = [
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

const hdKeyringV2Capabilities: KeyringCapabilities = {
  scopes: [EthScope.Eoa],
  bip44: {
    deriveIndex: true,
    derivePath: false,
    discover: false,
  },
  privateKey: {
    exportFormats: [{ encoding: PrivateKeyEncoding.Hexadecimal }],
  },
};

/**
 * Concrete {@link KeyringV2} adapter for {@link HdKeyring}.
 *
 * This wrapper exposes the accounts and signing capabilities of the legacy
 * HD keyring via the unified V2 interface.
 */
export type HdKeyringV2Options = {
  legacyKeyring: HdKeyring;
  entropySource: EntropySourceId;
};

export class HdKeyringV2
  extends EthKeyringWrapper<HdKeyring, Bip44Account<KeyringAccount>>
  implements KeyringV2
{
  protected readonly entropySource: EntropySourceId;

  constructor(options: HdKeyringV2Options) {
    super({
      type: KeyringType.Hd,
      inner: options.legacyKeyring,
      capabilities: hdKeyringV2Capabilities,
    });
    this.entropySource = options.entropySource;
  }

  /**
   * Checks if the given address is the last account in the inner keyring.
   * This compares against the actual inner keyring state, not the registry,
   * to avoid issues with stale registry entries.
   *
   * @param address - The address to check.
   * @returns True if this is the last account in the inner keyring.
   */
  async #isLastAccount(address: string): Promise<boolean> {
    const innerAddresses = await this.inner.getAccounts();
    const lastAddress = innerAddresses[innerAddresses.length - 1];
    return address === lastAddress;
  }

  /**
   * Creates a KeyringAccount object for the given address and index.
   *
   * @param address - The account address.
   * @param addressIndex - The account index in the HD path.
   * @returns The created KeyringAccount.
   */
  #createKeyringAccount(
    address: Hex,
    addressIndex: number,
  ): Bip44Account<KeyringAccount> {
    const id = this.registry.register(address);

    const account: Bip44Account<KeyringAccount> = {
      id,
      type: EthAccountType.Eoa,
      address,
      scopes: [...this.capabilities.scopes],
      methods: [...HD_KEYRING_METHODS],
      options: {
        entropy: {
          type: KeyringAccountEntropyTypeOption.Mnemonic,
          id: this.entropySource,
          groupIndex: addressIndex,
          derivationPath: `${this.inner.hdPath}/${addressIndex}`,
        },
        exportable: true,
      },
    };

    // Add the account to the registry
    this.registry.set(account);

    return account;
  }

  async getAccounts(): Promise<Bip44Account<KeyringAccount>[]> {
    const addresses = await this.inner.getAccounts();

    return addresses.map((address, addressIndex) => {
      // Check if we already have this account in the registry
      const existingId = this.registry.getAccountId(address);
      if (existingId) {
        const cached = this.registry.get(existingId);
        if (cached) {
          return cached;
        }
      }

      // Create and register the account if not already cached
      return this.#createKeyringAccount(address, addressIndex);
    });
  }

  async createAccounts(
    options: CreateAccountOptions,
  ): Promise<Bip44Account<KeyringAccount>[]> {
    return this.withLock(async () => {
      // For HD keyring, we only support BIP-44 derive index
      if (options.type !== 'bip44:derive-index') {
        throw new Error(
          `Unsupported account creation type for HdKeyring: ${options.type}`,
        );
      }

      // Validate that the entropy source matches this keyring's entropy source
      if (options.entropySource !== this.entropySource) {
        throw new Error(
          `Entropy source mismatch: expected '${this.entropySource}', got '${options.entropySource}'`,
        );
      }

      // Sync with the inner keyring state in case it was modified externally
      // This ensures our cache is up-to-date before we make changes
      const currentAccounts = await this.getAccounts();
      const currentCount = currentAccounts.length;
      const targetIndex = options.groupIndex;

      // Check if an account at this index already exists
      // Since only the last account can be deleted, array position always equals groupIndex
      const existingAccount = currentAccounts[targetIndex];
      if (existingAccount) {
        return [existingAccount];
      }

      // Only allow derivation of the next account in sequence
      if (targetIndex !== currentCount) {
        throw new Error(
          `Can only create the next account in sequence. ` +
            `Expected groupIndex ${currentCount}, got ${targetIndex}.`,
        );
      }

      // Add the next account
      const [newAddress] = await this.inner.addAccounts(1);

      if (!newAddress) {
        throw new Error('Failed to create new account');
      }

      const newAccount = this.#createKeyringAccount(newAddress, targetIndex);

      return [newAccount];
    });
  }

  /**
   * Delete an account from the keyring.
   *
   * ⚠️ Warning: Only deleting the last account is possible.
   *
   * @param accountId - The account ID to delete.
   */
  async deleteAccount(accountId: AccountId): Promise<void> {
    await this.withLock(async () => {
      // Get the account first, before any registry operations
      const { address } = await this.getAccount(accountId);
      const hexAddress = this.toHexAddress(address);

      // Assert that the account to delete is the last one in the inner keyring
      // We check against the inner keyring directly to avoid stale registry issues
      if (!(await this.#isLastAccount(address))) {
        throw new Error(
          'Can only delete the last account in the HD keyring due to derivation index constraints.',
        );
      }

      // Remove from the legacy keyring
      this.inner.removeAccount(hexAddress);

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

    // Validate encoding - we only support hexadecimal for Ethereum keys
    const requestedEncoding =
      options?.encoding ?? PrivateKeyEncoding.Hexadecimal;

    if (requestedEncoding !== PrivateKeyEncoding.Hexadecimal) {
      throw new Error(
        `Unsupported encoding for Ethereum HD keyring: ${requestedEncoding}. Only '${PrivateKeyEncoding.Hexadecimal}' is supported.`,
      );
    }

    // The legacy HdKeyring returns a hex string without 0x prefix.
    const privateKeyWithout0x = await this.inner.exportAccount(
      this.toHexAddress(account.address),
    );
    const privateKey = add0x(privateKeyWithout0x);

    return {
      type: 'private-key',
      privateKey,
      encoding: PrivateKeyEncoding.Hexadecimal,
    };
  }
}
