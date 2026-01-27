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
  type CreateAccountBip44DeriveIndexOptions,
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

/**
 * Capabilities for HD mode devices (index-based derivation supported).
 */
const HD_MODE_CAPABILITIES: KeyringCapabilities = {
  scopes: [EthScope.Eoa],
  bip44: {
    deriveIndex: true,
    derivePath: false,
    discover: false,
  },
};

/**
 * Capabilities for Account mode devices (custom account selection).
 */
const ACCOUNT_MODE_CAPABILITIES: KeyringCapabilities = {
  scopes: [EthScope.Eoa],
  custom: {
    createAccounts: true,
  },
};

/**
 * Custom options for creating accounts on Account mode QR devices.
 * Account mode devices provide pre-defined addresses that must be selected by index.
 */
export type QrAccountModeCreateOptions = {
  type: 'custom';
  /**
   * The entropy source ID (device fingerprint) to verify we're targeting the correct device.
   */
  entropySource: EntropySourceId;
  /**
   * The index of the pre-defined address to add from the device.
   * This refers to the position in the device's address list, not a BIP-44 derivation index.
   */
  addressIndex: number;
};

/**
 * Account creation options for QR keyring.
 * Excludes unsupported types (custom, private-key:import) and adds our specific QrAccountModeCreateOptions.
 */
export type QrKeyringCreateAccountOptions =
  | CreateAccountBip44DeriveIndexOptions
  | QrAccountModeCreateOptions;

/**
 * Concrete {@link KeyringV2} adapter for {@link QrKeyring}.
 *
 * This wrapper exposes the accounts and signing capabilities of the legacy
 * QR keyring via the unified V2 interface.
 *
 * Account handling differs by device mode:
 * - **HD mode**: Accounts are derived by index with `groupIndex` values.
 * Supports `bip44:derive-index` for index-based derivation.
 * - **Account mode**: Accounts are treated as private key imports since the
 * device provides pre-defined addresses with arbitrary paths. Uses `custom`
 * account creation type to select addresses by their position in the device.
 */
export type QrKeyringV2Options = {
  legacyKeyring: QrKeyring;
  entropySource: EntropySourceId;
};

export class QrKeyringV2
  extends EthKeyringWrapper<QrKeyring>
  implements KeyringV2
{
  readonly entropySource: EntropySourceId;

  constructor(options: QrKeyringV2Options) {
    super({
      type: KeyringType.Qr,
      inner: options.legacyKeyring,
      // Placeholder - will be overridden by getter below
      capabilities: HD_MODE_CAPABILITIES,
    });
    this.entropySource = options.entropySource;

    // Override the readonly capabilities property with a dynamic getter
    // that returns capabilities based on the current device mode.
    Object.defineProperty(this, 'capabilities', {
      get: (): KeyringCapabilities => {
        return this.inner.getMode() === DeviceMode.ACCOUNT
          ? ACCOUNT_MODE_CAPABILITIES
          : HD_MODE_CAPABILITIES;
      },
      enumerable: true,
      configurable: false,
    });
  }

  /**
   * Get the device state from the inner keyring.
   *
   * @returns The device state, or undefined if no device is paired.
   */
  async #getDeviceState(): Promise<
    | {
        mode: DeviceMode.HD;
        indexes: Record<Hex, number>;
      }
    | {
        mode: DeviceMode.ACCOUNT;
        indexes: Record<Hex, number>;
        paths: Record<Hex, string>;
      }
    | undefined
  > {
    const state = await this.inner.serialize();

    if (!state?.initialized) {
      return undefined;
    }

    if (state.keyringMode === DeviceMode.ACCOUNT) {
      return {
        mode: DeviceMode.ACCOUNT,
        indexes: state.indexes,
        paths: state.paths,
      };
    }

    return {
      mode: DeviceMode.HD,
      indexes: state.indexes,
    };
  }

  /**
   * Creates a Bip44Account for HD mode devices.
   *
   * @param address - The account address.
   * @param addressIndex - The account index in the derivation path.
   * @returns The created Bip44Account.
   */
  #createHdModeAccount(
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

  /**
   * Creates a KeyringAccount for Account mode devices.
   *
   * Account mode devices provide pre-defined addresses with arbitrary derivation
   * paths, so we treat them as private key imports rather than BIP-44 accounts.
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
          type: KeyringAccountEntropyTypeOption.Custom,
        },
      },
    };

    this.registry.set(account);
    return account;
  }

  async getAccounts(): Promise<KeyringAccount[]> {
    const addresses = await this.inner.getAccounts();
    const deviceState = await this.#getDeviceState();

    if (!deviceState) {
      // No device paired yet, return empty
      return [];
    }

    const { mode, indexes } = deviceState;

    return addresses.map((address) => {
      // Check if we already have this account in the registry
      const existingId = this.registry.getAccountId(address);
      if (existingId) {
        const cached = this.registry.get(existingId);
        if (cached) {
          return cached;
        }
      }

      if (mode === DeviceMode.HD) {
        // HD mode: index must be in the map
        const addressIndex = indexes[address];
        if (addressIndex === undefined) {
          throw new Error(
            `Address ${address} not found in device indexes. This indicates an inconsistent keyring state.`,
          );
        }
        return this.#createHdModeAccount(address, addressIndex);
      }

      // Account mode: validate address exists in paths map
      const { paths } = deviceState;
      if (paths[address] === undefined) {
        throw new Error(
          `Address ${address} not found in device paths. This indicates an inconsistent keyring state.`,
        );
      }
      return this.#createAccountModeAccount(address);
    });
  }

  async createAccounts(
    options: QrKeyringCreateAccountOptions,
  ): Promise<KeyringAccount[]> {
    return this.withLock(async () => {
      const deviceState = await this.#getDeviceState();

      if (!deviceState) {
        throw new Error('No device paired. Cannot create accounts.');
      }

      // Validate entropy source for all account creation types
      if (options.entropySource !== this.entropySource) {
        throw new Error(
          `Entropy source mismatch: expected '${this.entropySource}', got '${options.entropySource}'`,
        );
      }

      // Handle Account mode with custom account creation
      if (deviceState.mode === DeviceMode.ACCOUNT) {
        if (options.type !== 'custom') {
          throw new Error(
            `Account mode devices only support 'custom' account creation type, got '${options.type}'. ` +
              `Use { type: 'custom', entropySource, addressIndex } to select a pre-defined address.`,
          );
        }
        return this.#createAccountModeAccounts(options, deviceState);
      }

      // HD mode: support derive-index
      return this.#createHdModeAccounts(options, deviceState);
    });
  }

  /**
   * Creates accounts for Account mode devices using custom options.
   *
   * @param options - The account creation options.
   * @param deviceState - The current device state.
   * @param deviceState.mode - The device mode (ACCOUNT).
   * @param deviceState.paths - Map of addresses to derivation paths.
   * @param deviceState.indexes - Map of addresses to their indexes.
   * @returns The created accounts.
   */
  async #createAccountModeAccounts(
    options: QrAccountModeCreateOptions,
    deviceState: {
      mode: DeviceMode.ACCOUNT;
      paths: Record<Hex, string>;
      indexes: Record<Hex, number>;
    },
  ): Promise<KeyringAccount[]> {
    const { addressIndex } = options;

    if (!Number.isInteger(addressIndex) || addressIndex < 0) {
      throw new Error(
        `Invalid addressIndex: ${String(
          addressIndex,
        )}. Must be a non-negative integer.`,
      );
    }

    // Get available addresses from paths
    const availableAddresses = Object.keys(deviceState.paths) as Hex[];
    if (addressIndex >= availableAddresses.length) {
      throw new Error(
        `Address index ${addressIndex} is out of bounds. Device has ${availableAddresses.length} pre-defined address(es).`,
      );
    }

    const address = availableAddresses[addressIndex];

    // Check if already exists
    const currentAccounts = await this.getAccounts();
    const existingAccount = currentAccounts.find(
      (account) => account.address.toLowerCase() === address?.toLowerCase(),
    );
    if (existingAccount) {
      return [existingAccount];
    }

    // Add the account via the inner keyring
    this.inner.setAccountToUnlock(addressIndex);
    const [newAddress] = await this.inner.addAccounts(1);

    if (!newAddress) {
      throw new Error('Failed to create new account');
    }

    const newAccount = this.#createAccountModeAccount(newAddress);
    return [newAccount];
  }

  /**
   * Creates accounts for HD mode devices using index-based derivation.
   *
   * @param options - The account creation options.
   * @param _deviceState - The current device state (reserved for future use).
   * @param _deviceState.indexes - Map of addresses to their indexes.
   * @returns The created accounts.
   */
  async #createHdModeAccounts(
    options: CreateAccountOptions,
    _deviceState: { indexes: Record<Hex, number> },
  ): Promise<Bip44Account<KeyringAccount>[]> {
    if (options.type !== 'bip44:derive-index') {
      throw new Error(
        `Unsupported account creation type for HD mode QrKeyring: ${String(
          options.type,
        )}. Supported type: 'bip44:derive-index'.`,
      );
    }

    if (!Number.isInteger(options.groupIndex) || options.groupIndex < 0) {
      throw new Error(
        `Invalid groupIndex: ${options.groupIndex}. Must be a non-negative integer.`,
      );
    }

    const targetIndex = options.groupIndex;

    // Check if an account at this index already exists
    const currentAccounts = await this.getAccounts();
    const existingAccount = currentAccounts.find(
      (account) =>
        account.options.entropy?.type ===
          KeyringAccountEntropyTypeOption.Mnemonic &&
        account.options.entropy.groupIndex === targetIndex,
    );

    if (existingAccount) {
      return [existingAccount as Bip44Account<KeyringAccount>];
    }

    // Derive the account at the specified index
    this.inner.setAccountToUnlock(targetIndex);
    const [newAddress] = await this.inner.addAccounts(1);

    if (!newAddress) {
      throw new Error('Failed to create new account');
    }

    const newAccount = this.#createHdModeAccount(newAddress, targetIndex);
    return [newAccount];
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
