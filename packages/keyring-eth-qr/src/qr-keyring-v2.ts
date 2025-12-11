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
import type { Hex } from '@metamask/utils';

import { DeviceMode } from './device';
import type { QrKeyring } from './qr-keyring';

/**
 * Methods supported by QR keyring EOA accounts.
 * QR keyrings support a subset of signing methods (no encryption, app keys, or EIP-7702).
 */
const QR_KEYRING_METHODS = [
  EthMethod.SignTransaction,
  EthMethod.PersonalSign,
  EthMethod.SignTypedDataV4,
];

const qrKeyringV2Capabilities: KeyringCapabilities = {
  scopes: [EthScope.Eoa],
  bip44: {
    deriveIndex: true,
    derivePath: false,
    discover: false,
  },
};

/**
 * Concrete {@link KeyringV2} adapter for {@link QrKeyring}.
 *
 * This wrapper exposes the accounts and signing capabilities of the legacy
 * QR keyring via the unified V2 interface.
 *
 * All QR keyring accounts are BIP-44 derived (both HD and Account modes use
 * derivation paths from the hardware device).
 */
export type QrKeyringV2Options = {
  legacyKeyring: QrKeyring;
  entropySource: EntropySourceId;
};

export class QrKeyringV2
  extends EthKeyringWrapper<QrKeyring, Bip44Account<KeyringAccount>>
  implements KeyringV2
{
  readonly entropySource: EntropySourceId;

  constructor(options: QrKeyringV2Options) {
    super({
      type: KeyringType.Qr,
      inner: options.legacyKeyring,
      capabilities: qrKeyringV2Capabilities,
    });
    this.entropySource = options.entropySource;
  }

  /**
   * Get the device state from the inner keyring.
   *
   * @returns The device state, or undefined if no device is paired.
   */
  async #getDeviceState(): Promise<
    { mode: DeviceMode; indexes: Record<Hex, number> } | undefined
  > {
    const state = await this.inner.serialize();

    if (!state?.initialized) {
      return undefined;
    }

    return {
      mode: state.keyringMode,
      indexes: state.indexes,
    };
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

    const derivationPath = this.inner.getPathFromAddress(address);

    if (!derivationPath) {
      throw new Error(
        `Cannot create account for address ${address}: derivation path not found in keyring.`,
      );
    }

    const account: Bip44Account<KeyringAccount> = {
      id,
      type: EthAccountType.Eoa,
      address,
      scopes: [...this.capabilities.scopes],
      methods: [...QR_KEYRING_METHODS],
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
    const deviceState = await this.#getDeviceState();

    if (!deviceState) {
      // No device paired yet, return empty
      return [];
    }

    const { mode, indexes } = deviceState;

    return addresses.map((address, arrayIndex) => {
      // Check if we already have this account in the registry
      const existingId = this.registry.getAccountId(address);
      if (existingId) {
        const cached = this.registry.get(existingId);
        if (cached) {
          return cached;
        }
      }

      let addressIndex: number;
      if (mode === DeviceMode.HD) {
        // HD mode: index must be in the map
        const index = indexes[address];
        if (index === undefined) {
          throw new Error(
            `Address ${address} not found in device indexes. This indicates an inconsistent keyring state.`,
          );
        }
        addressIndex = index;
      } else {
        // Account mode: use array position (indexes map is not populated)
        addressIndex = arrayIndex;
      }

      return this.#createKeyringAccount(address, addressIndex);
    });
  }

  async createAccounts(
    options: CreateAccountOptions,
  ): Promise<Bip44Account<KeyringAccount>[]> {
    return this.withLock(async () => {
      const deviceState = await this.#getDeviceState();

      if (!deviceState) {
        throw new Error('No device paired. Cannot create accounts.');
      }

      // Only supports BIP-44 derive index
      if (options.type !== 'bip44:derive-index') {
        throw new Error(
          `Unsupported account creation type for QrKeyring: ${options.type}`,
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
