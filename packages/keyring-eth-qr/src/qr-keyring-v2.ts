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
} from '@metamask/keyring-api';
import type { AccountId } from '@metamask/keyring-utils';
import type { Hex } from '@metamask/utils';

import { DeviceMode } from './device';
import type { QrKeyring, SerializedQrKeyringState } from './qr-keyring';

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
 * Account type for QR keyring - can be either BIP-44 derived (HD mode) or imported (Account mode).
 */
type QrKeyringAccount = Bip44Account<KeyringAccount> | KeyringAccount;

/**
 * Concrete {@link KeyringV2} adapter for {@link QrKeyring}.
 *
 * This wrapper exposes the accounts and signing capabilities of the legacy
 * QR keyring via the unified V2 interface.
 *
 * QR keyrings support two modes:
 * - **HD Mode**: Derives accounts from an xpub using BIP-44 paths (Bip44Account)
 * - **Account Mode**: Uses pre-defined accounts from CryptoAccount (KeyringAccount with PrivateKey entropy)
 */
export type QrKeyringV2Options = {
  legacyKeyring: QrKeyring;
};

export class QrKeyringV2
  extends EthKeyringWrapper<QrKeyring, QrKeyringAccount>
  implements KeyringV2
{
  constructor(options: QrKeyringV2Options) {
    super({
      type: KeyringType.Qr,
      inner: options.legacyKeyring,
      capabilities: qrKeyringV2Capabilities,
    });
  }

  /**
   * Get the device state including mode and entropy source ID.
   * For QR keyrings, the entropy source ID is the device fingerprint (xfp).
   *
   * @returns The device state, or undefined if no device is paired.
   */
  async #getDeviceState(): Promise<
    | {
        mode: DeviceMode;
        entropySourceId: string;
        indexes: Record<Hex, number>;
      }
    | undefined
  > {
    const state =
      (await this.inner.serialize()) as SerializedQrKeyringState | null;
    if (!state?.initialized) {
      return undefined;
    }
    return {
      mode: state.keyringMode,
      entropySourceId: state.xfp,
      indexes: state.indexes,
    };
  }

  /**
   * Creates a KeyringAccount object for HD mode (BIP-44 derived).
   *
   * @param address - The account address.
   * @param addressIndex - The account index in the derivation path.
   * @param entropySourceId - The entropy source ID (device fingerprint).
   * @returns The created Bip44Account.
   */
  #createHdModeAccount(
    address: Hex,
    addressIndex: number,
    entropySourceId: string,
  ): Bip44Account<KeyringAccount> {
    const id = this.registry.register(address);

    const account: Bip44Account<KeyringAccount> = {
      id,
      type: EthAccountType.Eoa,
      address,
      scopes: [...this.capabilities.scopes],
      methods: [...QR_KEYRING_METHODS],
      options: {
        entropy: {
          type: KeyringAccountEntropyTypeOption.Mnemonic,
          id: entropySourceId,
          groupIndex: addressIndex,
          // QR keyrings don't expose the full derivation path
          derivationPath: `m/44'/60'/0'/0/${addressIndex}`,
        },
      },
    };

    this.registry.set(account);
    return account;
  }

  /**
   * Creates a KeyringAccount object for Account mode (pre-defined accounts).
   *
   * @param address - The account address.
   * @returns The created KeyringAccount.
   */
  #createAccountModeAccount(address: Hex): KeyringAccount {
    const id = this.registry.register(address);

    const account: KeyringAccount = {
      id,
      type: EthAccountType.Eoa,
      address,
      scopes: [...this.capabilities.scopes],
      methods: [...QR_KEYRING_METHODS],
      options: {
        entropy: {
          type: KeyringAccountEntropyTypeOption.PrivateKey,
        },
      },
    };

    this.registry.set(account);
    return account;
  }

  async getAccounts(): Promise<QrKeyringAccount[]> {
    const addresses = await this.inner.getAccounts();
    const deviceState = await this.#getDeviceState();

    if (!deviceState) {
      // No device paired yet, return empty
      return [];
    }

    const { mode, entropySourceId, indexes } = deviceState;

    return addresses.map((address) => {
      // Check if we already have this account in the registry
      const existingId = this.registry.getAccountId(address);
      if (existingId) {
        const cached = this.registry.get(existingId);
        if (cached) {
          return cached;
        }
      }

      // Create account based on device mode
      if (mode === DeviceMode.HD) {
        // HD mode: BIP-44 derived accounts
        const addressIndex = indexes[address] ?? 0;
        return this.#createHdModeAccount(
          address,
          addressIndex,
          entropySourceId,
        );
      }
      // Account mode: pre-defined accounts (like imported private keys)
      return this.#createAccountModeAccount(address);
    });
  }

  async createAccounts(
    options: CreateAccountOptions,
  ): Promise<QrKeyringAccount[]> {
    return this.withLock(async () => {
      const deviceState = await this.#getDeviceState();

      if (!deviceState) {
        throw new Error('No device paired. Cannot create accounts.');
      }

      const { mode, entropySourceId } = deviceState;

      // Account mode doesn't support creating new accounts - they're pre-defined
      if (mode === DeviceMode.ACCOUNT) {
        throw new Error(
          'Cannot create accounts in Account mode. Accounts are pre-defined by the device.',
        );
      }

      // HD mode: only supports BIP-44 derive index
      if (options.type !== 'bip44:derive-index') {
        throw new Error(
          `Unsupported account creation type for QrKeyring in HD mode: ${options.type}`,
        );
      }

      // Validate that the entropy source matches this keyring's entropy source
      if (options.entropySource !== entropySourceId) {
        throw new Error(
          `Entropy source mismatch: expected '${entropySourceId}', got '${options.entropySource}'`,
        );
      }

      // Sync with the inner keyring state in case it was modified externally
      const currentAccounts = await this.getAccounts();
      const currentCount = currentAccounts.length;
      const targetIndex = options.groupIndex;

      // Check if an account at this index already exists
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

      // Set the account index to unlock and add the account
      this.inner.setAccountToUnlock(targetIndex);
      const [newAddress] = await this.inner.addAccounts(1);

      if (!newAddress) {
        throw new Error('Failed to create new account');
      }

      const newAccount = this.#createHdModeAccount(
        newAddress,
        targetIndex,
        entropySourceId,
      );

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
