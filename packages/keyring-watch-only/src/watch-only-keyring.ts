import {
  AccountCreationType,
  EthAccountType,
  EthScope,
  isEvmAccountType,
  KeyringAccountTypeStruct,
} from '@metamask/keyring-api';
import type {
  KeyringAccount,
  KeyringAccountType,
  KeyringRequest,
} from '@metamask/keyring-api';
import {
  assertCreateAccountOptionIsSupported,
  KeyringType,
} from '@metamask/keyring-api/v2';
import type {
  CreateAccountOptions,
  Keyring,
  KeyringCapabilities,
} from '@metamask/keyring-api/v2';
import {
  generateEthAccountId,
  KeyringAccountRegistry,
} from '@metamask/keyring-sdk';
import type { AccountId } from '@metamask/keyring-utils';
import { array, assert, object, string } from '@metamask/superstruct';
import type { Infer } from '@metamask/superstruct';
import { add0x, getChecksumAddress, isValidHexAddress } from '@metamask/utils';
import type { Json } from '@metamask/utils';
import { Mutex } from 'async-mutex';

/**
 * Capabilities for the WatchOnlyKeyring.
 *
 * Watch-only accounts hold no secret material, so the keyring exposes no
 * signing or export capabilities. Accounts declare no methods, meaning any
 * signing request targeting them fails.
 */
const WATCH_ONLY_KEYRING_CAPABILITIES: KeyringCapabilities = {
  scopes: [EthScope.Eoa],
  address: {
    import: true,
  },
};

/**
 * Struct for a serialized watch-only account state entry.
 *
 * The entry is self-describing: the account type is always stored, so
 * persisted state never relies on implicit defaults.
 */
const WatchOnlyAccountStateStruct = object({
  /**
   * The account type, matching {@link KeyringAccount.type}.
   */
  type: KeyringAccountTypeStruct,

  /**
   * The account address.
   */
  address: string(),
});

/**
 * Serialized state entry of a single watch-only account.
 */
export type WatchOnlyAccountState = Infer<typeof WatchOnlyAccountStateStruct>;

/**
 * Struct for {@link WatchOnlyKeyringState}.
 */
const WatchOnlyKeyringStateStruct = object({
  /**
   * The watch-only accounts held by the keyring.
   */
  accounts: array(WatchOnlyAccountStateStruct),
});

/**
 * Serialized state of the WatchOnlyKeyring.
 *
 * Only the source of truth (the imported addresses) is persisted; account
 * objects are rebuilt from it on `deserialize`.
 */
export type WatchOnlyKeyringState = Infer<typeof WatchOnlyKeyringStateStruct>;

/**
 * Check if a given keyring is a watch-only keyring.
 *
 * @param keyring - The keyring to check.
 * @returns True if the keyring is a watch-only keyring, false otherwise.
 */
export function isWatchOnlyKeyring(
  keyring: Keyring,
): keyring is WatchOnlyKeyring {
  return keyring.type === KeyringType.WatchOnly;
}

/**
 * A keyring that holds watch-only accounts imported by address.
 *
 * Watch-only accounts carry no secret material: the keyring cannot sign, and
 * `submitRequest` always throws. It exists so that addresses can be tracked
 * as first-class account objects without any signing capability.
 *
 * Account creation is only supported through the `address:import` option.
 * Creating an account from an address that is already held by the keyring is
 * idempotent: the existing account is returned.
 */
export class WatchOnlyKeyring implements Keyring {
  static readonly type = `${KeyringType.WatchOnly}` as const;

  readonly type = `${KeyringType.WatchOnly}` as const;

  readonly capabilities: KeyringCapabilities = WATCH_ONLY_KEYRING_CAPABILITIES;

  readonly #registry: KeyringAccountRegistry = new KeyringAccountRegistry({
    generateId: generateEthAccountId,
  });

  /**
   * Mutex to ensure exclusive access to the keyring state during operations
   * that mutate it.
   */
  readonly #lock = new Mutex();

  /**
   * Get or create the account for the given address.
   *
   * The address is validated as an EVM address and normalized to its EIP-55
   * checksum representation. Creating an account for an already-held address
   * returns the existing account (idempotency).
   *
   * @param address - The address to import.
   * @param accountType - The account type to use, defaulting to `eip155:eoa`.
   * @returns The account for the given address.
   * @throws If the address is not a valid EVM address or the account type is
   * not an EVM account type.
   */
  #getOrCreateAccount(
    address: string,
    accountType: KeyringAccountType | undefined,
  ): KeyringAccount {
    const hexAddress = add0x(address);

    if (!isValidHexAddress(hexAddress)) {
      throw new Error(`Invalid EVM address: ${address}`);
    }

    const checksumAddress = getChecksumAddress(hexAddress);

    const resolvedAccountType = accountType ?? EthAccountType.Eoa;

    if (!isEvmAccountType(resolvedAccountType)) {
      throw new Error(
        `Unsupported account type for WatchOnlyKeyring: ${resolvedAccountType}. Only '${EthAccountType.Eoa}' and '${EthAccountType.Erc4337}' are supported.`,
      );
    }

    // Registering an already-held address is idempotent: `register` returns
    // the existing account ID.
    const id = this.#registry.register(checksumAddress);

    const existingAccount = this.#registry.get(id);
    if (existingAccount) {
      return existingAccount;
    }

    const account: KeyringAccount = {
      id,
      type: resolvedAccountType,
      address: checksumAddress,
      scopes: [...this.capabilities.scopes],
      methods: [],
      options: {},
    };

    this.#registry.set(account);

    return account;
  }

  /**
   * Returns all accounts managed by the keyring.
   *
   * @returns A promise that resolves to an array of all accounts managed by
   * this keyring.
   */
  async getAccounts(): Promise<KeyringAccount[]> {
    return this.#registry.values();
  }

  /**
   * Returns the account with the specified ID.
   *
   * @param accountId - ID of the account to retrieve.
   * @returns A promise that resolves to the account with the given ID.
   * @throws If no account matches the given ID.
   */
  async getAccount(accountId: AccountId): Promise<KeyringAccount> {
    const account = this.lookupAccount(accountId);

    if (!account) {
      throw new Error(`Account not found for id: ${accountId}`);
    }

    return account;
  }

  /**
   * Creates a new watch-only account from an imported address.
   *
   * Importing an address that is already held by the keyring is idempotent:
   * the existing account is returned.
   *
   * @param options - Options describing how to create the account.
   * @returns A promise that resolves to an array with the created account.
   * @throws If the creation options are unsupported, the address is not a
   * valid EVM address, or the account type is not an EVM account type.
   */
  async createAccounts(
    options: CreateAccountOptions,
  ): Promise<KeyringAccount[]> {
    assertCreateAccountOptionIsSupported(options, [
      `${AccountCreationType.AddressImport}`,
    ] as const);

    const { address, accountType } = options;

    return this.#withLock(async () => {
      return [this.#getOrCreateAccount(address, accountType)];
    });
  }

  /**
   * Deletes the account with the specified ID.
   *
   * @param accountId - ID of the account to delete.
   * @returns A promise that resolves when the account has been deleted.
   * @throws If no account matches the given ID.
   */
  async deleteAccount(accountId: AccountId): Promise<void> {
    return this.#withLock(async () => {
      const account = this.#registry.get(accountId);

      if (!account) {
        throw new Error(`Account not found for id: ${accountId}`);
      }

      this.#registry.delete(accountId);
    });
  }

  /**
   * Serializes the keyring state to a JSON object.
   *
   * @returns A promise that resolves to a JSON-serializable representation of
   * the keyring state.
   */
  async serialize(): Promise<Json> {
    const state: WatchOnlyKeyringState = {
      accounts: this.#registry.values().map((account) => ({
        type: account.type,
        address: account.address,
      })),
    };

    return state;
  }

  /**
   * Restores the keyring state from a serialized JSON object.
   *
   * Replaces any existing state with the deserialized accounts.
   *
   * @param state - A JSON object representing a serialized keyring state.
   * @returns A promise that resolves when the keyring state has been restored.
   * @throws If the state is invalid, contains an invalid EVM address, or
   * contains a non-EVM account type.
   */
  async deserialize(state: Json): Promise<void> {
    return this.#withLock(async () => {
      assert(state, WatchOnlyKeyringStateStruct);

      this.#registry.clear();

      for (const { type, address } of state.accounts) {
        this.#getOrCreateAccount(address, type);
      }
    });
  }

  /**
   * Submits a request to the keyring.
   *
   * Watch-only accounts cannot handle requests: the keyring holds no secret
   * material and has no signing capability.
   *
   * @param _request - The `KeyringRequest` object to submit.
   * @returns This method always throws.
   * @throws Always, since watch-only accounts cannot handle requests.
   */
  async submitRequest(_request: KeyringRequest): Promise<Json> {
    throw new Error(
      'WatchOnlyKeyring cannot handle requests: watch-only accounts have no signing capability',
    );
  }

  // ──────────────────────────────────────────────
  // Synchronous lookup API
  // ──────────────────────────────────────────────

  /**
   * Get an account by its ID, synchronously.
   *
   * @param accountId - The account ID to look up.
   * @returns The account, or `undefined` if not found.
   */
  lookupAccount(accountId: AccountId): KeyringAccount | undefined {
    return this.#registry.get(accountId);
  }

  /**
   * Get an account by its address (case-insensitive), synchronously.
   *
   * Performs an O(1) exact lookup first; falls back to a linear scan to
   * handle addresses passed with a different casing (e.g. lowercase vs
   * EIP-55 checksummed). All addresses held by the keyring are valid EVM
   * addresses, so the fallback comparison is safe.
   *
   * @param address - The address to look up.
   * @returns The account, or `undefined` if not found.
   */
  lookupByAddress(address: string): KeyringAccount | undefined {
    const accountId = this.#registry.getAccountId(address);

    if (accountId !== undefined) {
      return this.#registry.get(accountId);
    }

    return this.#registry
      .values()
      .find(
        (account) => account.address.toLowerCase() === address.toLowerCase(),
      );
  }

  /**
   * Execute an operation with exclusive access to the keyring state.
   *
   * @param callback - A function that performs the operation.
   * @returns The result of the callback.
   */
  async #withLock<Result>(callback: () => Promise<Result>): Promise<Result> {
    return this.#lock.runExclusive(callback);
  }
}
