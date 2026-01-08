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
    derivePath: true,
    discover: false,
  },
};

/**
 * Allowed HD paths for Trezor keyring.
 * These must match the keys in ALLOWED_HD_PATHS from trezor-keyring.ts.
 */
type AllowedHdPath = `m/44'/60'/0'/0` | `m/44'/60'/0'` | `m/44'/1'/0'/0`;

/**
 * BIP-44 standard HD path prefix constant for Ethereum.
 * Used as default for derive-index operations.
 */
const BIP44_HD_PATH_PREFIX: AllowedHdPath = `m/44'/60'/0'/0`;

/**
 * Regex pattern for validating and parsing derivation paths.
 * Only matches the allowed Trezor HD paths from the V1 implementation:
 * - m/44'/60'/0'/0/{index} (BIP44 standard)
 * - m/44'/60'/0'/{index} (legacy MEW)
 * - m/44'/1'/0'/0/{index} (SLIP0044 testnet)
 * Captures: [1] = base path, [2] = index
 */
const DERIVATION_PATH_PATTERN =
  /^(m\/44'\/60'\/0'\/0|m\/44'\/60'\/0'|m\/44'\/1'\/0'\/0)\/(\d+)$/u;

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
   * Parses a derivation path to extract the base HD path and account index.
   *
   * @param derivationPath - The full derivation path (e.g., m/44'/60'/0'/0/5).
   * @returns The base HD path and account index.
   * @throws If the path format is invalid.
   */
  #parseDerivationPath(derivationPath: string): {
    basePath: AllowedHdPath;
    index: number;
  } {
    const match = derivationPath.match(DERIVATION_PATH_PATTERN);
    if (match) {
      return {
        basePath: match[1] as AllowedHdPath,
        index: parseInt(match[2] as string, 10),
      };
    }

    throw new Error(
      `Invalid derivation path: ${derivationPath}. ` +
        `Expected format: {base}/{index} where base is one of: ` +
        `m/44'/60'/0'/0, m/44'/60'/0', m/44'/1'/0'/0.`,
    );
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
    const derivationPath = `${this.inner.hdPath}/${addressIndex}`;

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

      const addressIndex = this.inner.getIndexForAddress(address);
      return this.#createKeyringAccount(address, addressIndex);
    });
  }

  async createAccounts(
    options: CreateAccountOptions,
  ): Promise<Bip44Account<KeyringAccount>[]> {
    return this.withLock(async () => {
      if (
        options.type === 'bip44:derive-path' ||
        options.type === 'bip44:derive-index'
      ) {
        // Validate that the entropy source matches this keyring's entropy source
        if (options.entropySource !== this.entropySource) {
          throw new Error(
            `Entropy source mismatch: expected '${this.entropySource}', got '${options.entropySource}'`,
          );
        }
      } else {
        throw new Error(
          `Unsupported account creation type for TrezorKeyring: ${String(
            options.type,
          )}`,
        );
      }

      // Check if an account at this index already exists with the same derivation path
      const currentAccounts = await this.getAccounts();

      let targetIndex: number;
      let basePath: AllowedHdPath;
      let derivationPath: string;

      if (options.type === 'bip44:derive-path') {
        // Parse the derivation path to extract base path and index
        const parsed = this.#parseDerivationPath(options.derivationPath);
        targetIndex = parsed.index;
        basePath = parsed.basePath;
        derivationPath = options.derivationPath;
      } else {
        // derive-index uses BIP-44 standard path by default
        targetIndex = options.groupIndex;
        basePath = BIP44_HD_PATH_PREFIX;
        derivationPath = `${basePath}/${targetIndex}`;
      }

      const existingAccount = currentAccounts.find((account) => {
        return (
          account.options.entropy.groupIndex === targetIndex &&
          account.options.entropy.derivationPath === derivationPath
        );
      });

      if (existingAccount) {
        return [existingAccount];
      }

      // Derive the account at the specified index
      this.inner.setHdPath(basePath);
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
