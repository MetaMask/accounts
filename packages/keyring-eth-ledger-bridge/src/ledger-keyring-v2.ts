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
  KeyringVersion,
  type EntropySourceId,
} from '@metamask/keyring-api';
import type { AccountId, EthKeyring } from '@metamask/keyring-utils';
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
  versions: [KeyringVersion.V2],
  scopes: [EthScope.Eoa],
  bip44: {
    deriveIndex: true,
    derivePath: true,
    discover: false,
  },
};

/**
 * Ledger Live HD path constant.
 */
const LEDGER_LIVE_HD_PATH = `m/44'/60'/0'/0/0`;

/**
 * BIP-44 standard HD path prefix constant for Ethereum.
 */
const BIP44_HD_PATH_PREFIX = `m/44'/60'/0'/0`;

/**
 * Regex pattern for validating and parsing Ledger Live derivation paths.
 * Format: m/44'/60'/{index}'/0/0
 */
const LEDGER_LIVE_PATH_PATTERN = /^m\/44'\/60'\/(\d+)'\/0\/0$/u;

/**
 * Regex pattern for validating and parsing non-Ledger-Live derivation paths.
 * Supports Legacy (m/44'/60'/0'/{index}), BIP44 (m/44'/60'/0'/0/{index}),
 * and custom paths that follow the m/44'/60'/... pattern.
 */
const INDEX_AT_END_PATH_PATTERN = /^(m\/44'\/60'(?:\/\d+'?)*)\/(\d+)$/u;

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

// LedgerKeyring.signTransaction returns `TypedTransaction | OldEthJsTransaction` for
// backwards compatibility with old ethereumjs-tx, but EthKeyring expects `TypedTxData`.
// The runtime behavior is correct - we cast the type to satisfy the constraint.
type LedgerKeyringAsEthKeyring = LedgerKeyring & EthKeyring;

export class LedgerKeyringV2
  extends EthKeyringWrapper<
    LedgerKeyringAsEthKeyring,
    Bip44Account<KeyringAccount>
  >
  implements KeyringV2
{
  readonly entropySource: EntropySourceId;

  constructor(options: LedgerKeyringV2Options) {
    super({
      type: KeyringType.Ledger,
      inner: options.legacyKeyring as LedgerKeyringAsEthKeyring,
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
   * Parses a derivation path to extract the base HD path and account index.
   *
   * Supports two path formats:
   * - Ledger Live: m/44'/60'/{index}'/0/0 → base: m/44'/60'/0'/0/0, index from position 3
   * - Index at end: m/44'/60'/.../{index} → base: m/44'/60'/..., index from last segment
   *
   * @param derivationPath - The full derivation path.
   * @returns The base HD path and account index.
   * @throws If the path format is invalid.
   */
  #parseDerivationPath(derivationPath: string): {
    basePath: string;
    index: number;
  } {
    // Try Ledger Live format first: m/44'/60'/{index}'/0/0
    const ledgerLiveMatch = derivationPath.match(LEDGER_LIVE_PATH_PATTERN);
    if (ledgerLiveMatch?.[1]) {
      return {
        // This constant is used by `inner.setHdPath` to determine which derivation
        // mode we should use (Ledger Live derivation mode here).
        basePath: LEDGER_LIVE_HD_PATH,
        index: parseInt(ledgerLiveMatch[1], 10),
      };
    }

    // Try index-at-end format: m/44'/60'/.../{index}
    const indexAtEndMatch = derivationPath.match(INDEX_AT_END_PATH_PATTERN);
    if (indexAtEndMatch) {
      // If the condition is true, indexAtEndMatch[1] and indexAtEndMatch[2] are defined, so
      // we can safely cast them to string.
      // This is necessary to get 100% code coverage.
      return {
        // Here, we use a derivation path prefix for `inner.setHdPath`
        // (prefix + index derivation mode).
        basePath: indexAtEndMatch[1] as string,
        index: parseInt(indexAtEndMatch[2] as string, 10),
      };
    }

    throw new Error(
      `Invalid derivation path format: ${derivationPath}. ` +
        `Expected Ledger Live (m/44'/60'/{index}'/0/0) or index-at-end (m/44'/60'/.../{index}) format.`,
    );
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
    const { hdPath } = details;
    if (!hdPath) {
      throw new Error(`No HD path found for address ${checksummedAddress}`);
    }

    // Ledger supports multiple derivation path formats:
    // - Ledger Live (bip44: true): m/44'/60'/{index}'/0/0 - index at position 3
    // - Other paths (bip44: false): {hdPath}/{index} - index at end
    //   - BIP44: m/44'/60'/0'/0/{index}
    //   - Legacy: m/44'/60'/0'/{index}
    //   - Custom paths via setHdPath
    //
    // We use the `bip44` flag to determine which extraction pattern to use.
    if (details.bip44) {
      // Ledger Live format: m/44'/60'/{index}'/0/0
      const match = hdPath.match(LEDGER_LIVE_PATH_PATTERN);
      if (match?.[1]) {
        return parseInt(match[1], 10);
      }
    } else {
      // Index-at-end format: m/44'/60'/.../{index}
      const match = hdPath.match(INDEX_AT_END_PATH_PATTERN);
      if (match?.[2]) {
        return parseInt(match[2], 10);
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

    if (!details?.hdPath) {
      throw new Error(
        `No HD path found for address ${checksummedAddress}. Cannot create account.`,
      );
    }

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
          derivationPath: details.hdPath,
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
          `Unsupported account creation type for LedgerKeyring: ${String(
            options.type,
          )}`,
        );
      }

      // Check if an account at this index already exists with the same derivation path
      const currentAccounts = await this.getAccounts();

      let targetIndex: number;
      let basePath: string;
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
