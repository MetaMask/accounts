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
import type { AccountId, EthKeyring } from '@metamask/keyring-utils';
import type { Hex, Json } from '@metamask/utils';

import type { TrezorKeyring } from './trezor-keyring';

/**
 * Methods supported by Trezor keyring EOA accounts.
 * Trezor keyrings support a subset of signing methods (no encryption, app keys, or EIP-7702).
 */
const TREZOR_KEYRING_METHODS = [
  EthMethod.SignTransaction,
  EthMethod.PersonalSign,
  EthMethod.SignTypedDataV3,
  EthMethod.SignTypedDataV4,
];

const trezorKeyringV2Capabilities: KeyringCapabilities = {
  scopes: [EthScope.Eoa],
  bip44: {
    deriveIndex: true,
    derivePath: false,
    discover: false,
  },
};

/**
 * Concrete {@link KeyringV2} adapter for {@link TrezorKeyring}.
 *
 * This wrapper exposes the accounts and signing capabilities of the legacy
 * Trezor keyring via the unified V2 interface.
 *
 * All Trezor keyring accounts are BIP-44 derived from the device.
 */
export type TrezorKeyringV2Options = {
  legacyKeyring: TrezorKeyring;
  entropySource: EntropySourceId;
  type?: KeyringType.Trezor | KeyringType.OneKey;
};

// TrezorKeyring.signTransaction returns `TypedTransaction | OldEthJsTransaction` for
// backwards compatibility with old ethereumjs-tx, but EthKeyring expects `TypedTxData`.
// The runtime behavior is correct - we cast the type to satisfy the constraint.
type TrezorKeyringAsEthKeyring = TrezorKeyring & EthKeyring;

export class TrezorKeyringV2
  extends EthKeyringWrapper<
    TrezorKeyringAsEthKeyring,
    Bip44Account<KeyringAccount>
  >
  implements KeyringV2
{
  readonly entropySource: EntropySourceId;

  constructor(options: TrezorKeyringV2Options) {
    super({
      type: options.type ?? KeyringType.Trezor,
      inner: options.legacyKeyring as TrezorKeyringAsEthKeyring,
      capabilities: trezorKeyringV2Capabilities,
    });
    this.entropySource = options.entropySource;
  }

  /**
   * Hydrate the underlying keyring from a previously serialized state.
   *
   * Overrides the base class implementation to avoid calling `getAccounts()`
   * when the Trezor device is locked. The base class calls `getAccounts()` to
   * rebuild the registry, but for Trezor keyrings this requires the HDKey to
   * be initialized (via `unlock()`). Since the device may not be connected
   * during deserialization, we skip the registry rebuild here. The registry
   * will be populated on the first call to `getAccounts()` after the device
   * is unlocked.
   *
   * @param state - The serialized keyring state.
   */
  async deserialize(state: Json): Promise<void> {
    await this.withLock(async () => {
      // Clear the registry when deserializing
      this.registry.clear();

      // Deserialize the legacy keyring state only.
      // We intentionally skip calling getAccounts() here because the Trezor
      // device may be locked (HDKey not initialized). The TrezorKeyring's
      // deserialize restores the accounts array, but not the paths map, so
      // getIndexForAddress would need to derive addresses which requires an
      // initialized HDKey. The registry will be populated lazily when
      // getAccounts() is called after the device is unlocked.
      await this.inner.deserialize(state);
    });
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

    const account: Bip44Account<KeyringAccount> = {
      id,
      type: EthAccountType.Eoa,
      address,
      scopes: [...this.capabilities.scopes],
      methods: [...TREZOR_KEYRING_METHODS],
      options: {
        entropy: {
          type: KeyringAccountEntropyTypeOption.Mnemonic,
          id: this.entropySource,
          groupIndex: addressIndex,
          derivationPath: `${this.inner.hdPath}/${addressIndex}`,
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

      const addressIndex = this.inner.getIndexForAddress(address);
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
          `Unsupported account creation type for TrezorKeyring: ${options.type}`,
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
