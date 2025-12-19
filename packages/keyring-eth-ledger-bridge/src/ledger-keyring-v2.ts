import type { Bip44Account } from '@metamask/account-api';
import {
  type CreateAccountOptions,
  EthAccountType,
  EthKeyringWrapper,
  EthMethod,
  EthScope,
  type KeyringAccount,
  KeyringAccountEntropyTypeOption,
  type KeyringCapabilities,
  type KeyringV2,
  KeyringType,
  type EntropySourceId,
} from '@metamask/keyring-api';
import type { AccountId } from '@metamask/keyring-utils';
import { add0x, getChecksumAddress, type Hex } from '@metamask/utils';

import type { LedgerKeyring } from './ledger-keyring';

/**
 * Methods supported by Ledger keyring EOA accounts.
 * Ledger keyrings support a subset of signing methods (no encryption, app keys, or EIP-7702).
 */
const LEDGER_KEYRING_METHODS = [
  EthMethod.SignTransaction,
  EthMethod.PersonalSign,
  EthMethod.SignTypedDataV4,
];

const ledgerKeyringV2Capabilities: KeyringCapabilities = {
  scopes: [EthScope.Eoa],
  bip44: {
    deriveIndex: true,
    derivePath: false,
    discover: false,
  },
};

/**
 * Concrete {@link KeyringV2} adapter for {@link LedgerKeyring}.
 *
 * This wrapper exposes the accounts and signing capabilities of the legacy
 * Ledger keyring via the unified V2 interface.
 *
 * All Ledger keyring accounts are BIP-44 derived from the device.
 */
export type LedgerKeyringV2Options = {
  legacyKeyring: LedgerKeyring;
  entropySource: EntropySourceId;
};

export class LedgerKeyringV2
  extends EthKeyringWrapper<LedgerKeyring, Bip44Account<KeyringAccount>>
  implements KeyringV2
{
  readonly entropySource: EntropySourceId;

  constructor(options: LedgerKeyringV2Options) {
    super({
      type: KeyringType.Ledger,
      inner: options.legacyKeyring,
      capabilities: ledgerKeyringV2Capabilities,
    });
    this.entropySource = options.entropySource;
  }

  /**
   * Normalizes an address to a checksummed hex address.
   *
   * @param address - The address to normalize.
   * @returns The checksummed hex address.
   */
  #getChecksumHexAddress(address: string): Hex {
    return getChecksumAddress(add0x(address));
  }

  /**
   * Gets the index for an address from the account details.
   *
   * @param address - The address to get the index for.
   * @returns The index for the address.
   * @throws If the address is not found in account details.
   */
  #getIndexForAddress(address: Hex): number {
    const checksummedAddress = this.#getChecksumHexAddress(address);
    const details = this.inner.accountDetails[checksummedAddress];

    if (!details) {
      throw new Error(
        `Address ${checksummedAddress} not found in account details`,
      );
    }

    // Extract index from hdPath
    // Ledger Live path: m/44'/60'/{index}'/0/0
    // Legacy path: m/44'/60'/0'/{index}
    const { hdPath } = details;
    if (!hdPath) {
      throw new Error(`No HD path found for address ${checksummedAddress}`);
    }

    // For Ledger Live path (bip44: true): m/44'/60'/{index}'/0/0
    // For Legacy path (bip44: false): {hdPath}/{index}
    if (details.bip44) {
      // Ledger Live path: m/44'/60'/{index}'/0/0
      const match = hdPath.match(/^m\/44'\/60'\/(\d+)'\/0\/0$/u);
      if (match?.[1]) {
        return parseInt(match[1], 10);
      }
    } else {
      // Legacy path: extract the last number from the path
      const match = hdPath.match(/\/(\d+)$/u);
      if (match?.[1]) {
        return parseInt(match[1], 10);
      }
    }

    throw new Error(`Could not extract index from HD path: ${hdPath}`);
  }

  /**
   * Creates a Bip44Account object for the given address.
   *
   * @param address - The account address.
   * @param addressIndex - The account index in the derivation path.
   * @returns The created Bip44Account.
   */
  #createKeyringAccount(
    address: Hex,
    addressIndex: number,
  ): Bip44Account<KeyringAccount> {
    const id = this.registry.register(address);

    const checksummedAddress = this.#getChecksumHexAddress(address);
    const details = this.inner.accountDetails[checksummedAddress];
    const derivationPath =
      details?.hdPath ?? `${this.inner.hdPath}/${addressIndex}`;

    const account: Bip44Account<KeyringAccount> = {
      id,
      type: EthAccountType.Eoa,
      address,
      scopes: [...this.capabilities.scopes],
      methods: [...LEDGER_KEYRING_METHODS],
      options: {
        entropy: {
          type: KeyringAccountEntropyTypeOption.Mnemonic,
          id: this.entropySource,
          groupIndex: addressIndex,
          derivationPath,
        },
      },
    };

    this.registry.set(account);
    return account;
  }

  async getAccounts(): Promise<Bip44Account<KeyringAccount>[]> {
    const addresses = await this.inner.getAccounts();

    if (addresses.length === 0) {
      return [];
    }

    return addresses.map((address) => {
      // Check if we already have this account in the registry
      const existingId = this.registry.getAccountId(address);
      if (existingId) {
        const cached = this.registry.get(existingId);
        if (cached) {
          return cached;
        }
      }

      const addressIndex = this.#getIndexForAddress(address);
      return this.#createKeyringAccount(address, addressIndex);
    });
  }

  async createAccounts(
    options: CreateAccountOptions,
  ): Promise<Bip44Account<KeyringAccount>[]> {
    return this.withLock(async () => {
      // Only supports BIP-44 derive index
      if (options.type !== 'bip44:derive-index') {
        throw new Error(
          `Unsupported account creation type for LedgerKeyring: ${options.type}`,
        );
      }

      // Validate that the entropy source matches this keyring's entropy source
      if (options.entropySource !== this.entropySource) {
        throw new Error(
          `Entropy source mismatch: expected '${this.entropySource}', got '${options.entropySource}'`,
        );
      }

      const targetIndex = options.groupIndex;

      // Check if an account at this index already exists
      const currentAccounts = await this.getAccounts();
      const existingAccount = currentAccounts.find(
        (account) => account.options.entropy.groupIndex === targetIndex,
      );
      if (existingAccount) {
        return [existingAccount];
      }

      // Derive the account at the specified index
      this.inner.setAccountToUnlock(targetIndex);
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
   * @param accountId - The account ID to delete.
   */
  async deleteAccount(accountId: AccountId): Promise<void> {
    await this.withLock(async () => {
      const { address } = await this.getAccount(accountId);
      const hexAddress = this.toHexAddress(address);

      // Remove from the legacy keyring
      this.inner.removeAccount(hexAddress);

      // Remove from the registry
      this.registry.delete(accountId);
    });
  }
}
