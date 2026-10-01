import {
  AccountCreationType,
  CaipChainIdStruct,
  EthAccountType,
  EthScope,
  isEvmAccountType,
  KeyringAccountTypeStruct,
} from '@metamask/keyring-api';
import type {
  CaipChainId,
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
import { isScopeEqualToAny } from '@metamask/keyring-utils';
import type { AccountId } from '@metamask/keyring-utils';
import { array, assert, nonempty, object, string } from '@metamask/superstruct';
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
 * The entry is self-describing: the account type and scopes are always
 * stored, so persisted state never relies on implicit defaults.
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

  /**
   * The account scopes (CAIP-2 chain IDs), matching
   * {@link KeyringAccount.scopes}.
   */
  scopes: nonempty(array(CaipChainIdStruct)),
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
 * Only the source of truth (the imported addresses and their scopes) is
 * persisted; account objects are rebuilt from it on `deserialize`.
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
   * Resolve the scopes of an imported account.
   *
   * When no scopes are provided, the keyring's own scopes are used: the scope
   * cannot always be detected from the address alone (an EVM address is valid
   * on every EVM chain). Provided scopes must be non-empty and supported by
   * the keyring, where the special `eip155:0` scope (any EVM chain) matches
   * any `eip155:*` chain ID.
   *
   * @param scopes - The scopes to resolve, if any.
   * @returns The resolved scopes.
   * @throws If the provided scopes are empty or unsupported by the keyring.
   */
  #resolveScopes(scopes: readonly CaipChainId[] | undefined): CaipChainId[] {
    if (scopes === undefined) {
      return [...this.capabilities.scopes];
    }

    if (scopes.length === 0) {
      throw new Error('Scopes must not be empty');
    }

    const supportedScopes = this.capabilities.scopes;
    const unsupportedScopes = scopes.filter(
      (scope) => !isScopeEqualToAny(scope, supportedScopes),
    );

    if (unsupportedScopes.length > 0) {
      throw new Error(
        `Unsupported scopes for WatchOnlyKeyring: ${unsupportedScopes.join(', ')}. Supported scopes: ${supportedScopes.join(', ')}.`,
      );
    }

    return [...scopes];
  }

  /**
   * Get or create the account for the given address.
   *
   * The address is validated as an EVM address and normalized to its EIP-55
   * checksum representation. Creating an account for an already-held address
   * returns the existing account (idempotency).
   *
   * @param address - The address to import.
   * @param accountType - The account type to use, defaulting to `eip155:eoa`.
   * @param scopes - The scopes to use, defaulting to the keyring's scopes.
   * @returns The account for the given address.
   * @throws If the address is not a valid EVM address, the account type is
   * not an EVM account type, or the scopes are unsupported.
   */
  #getOrCreateAccount(
    address: string,
    accountType: KeyringAccountType | undefined,
    scopes: readonly CaipChainId[] | undefined,
  ): KeyringAccount {
    const hexAddress = add0x(address);

    if (!isValidHexAddress(hexAddress)) {
      throw new Error(`Invalid EVM address: ${address}`);
    }

    const checksumAddress = getChecksumAddress(hexAddress);

    const resolvedAccountType = accountType ?? EthAccountType.Eoa;
    const resolvedScopes = this.#resolveScopes(scopes);

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
      if (existingAccount.type !== resolvedAccountType) {
        throw new Error(
          'Account already exists with a different type.',
        );
      }

      // Every requested scope must be covered by the existing account's scopes.
      // `isScopeEqualToAny` handles the `eip155:0` wildcard: an existing
      // account with `eip155:0` covers any `eip155:<N>` request.
      const hasIncompatibleScopes = resolvedScopes.some(
        (scope) => !isScopeEqualToAny(scope, existingAccount.scopes),
      );
      if (hasIncompatibleScopes) {
        throw new Error(
          'Account already exists with incompatible scopes.',
        );
      }

      return existingAccount;
    }

    const account: KeyringAccount = {
      id,
      type: resolvedAccountType,
      address: checksumAddress,
      scopes: resolvedScopes,
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
   * valid EVM address, the account type is not an EVM account type, or the
   * scopes are unsupported.
   */
  async createAccounts(
    options: CreateAccountOptions,
  ): Promise<KeyringAccount[]> {
    assertCreateAccountOptionIsSupported(options, [
      `${AccountCreationType.AddressImport}`,
    ] as const);

    const { address, accountType, scopes } = options;

    return this.#withLock(async () => {
      return [this.#getOrCreateAccount(address, accountType, scopes)];
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
        scopes: account.scopes,
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
   * @throws If the state is invalid, contains an invalid EVM address, a
   * non-EVM account type, or unsupported scopes.
   */
  async deserialize(state: Json): Promise<void> {
    return this.#withLock(async () => {
      assert(state, WatchOnlyKeyringStateStruct);

      this.#registry.clear();

      for (const { type, address, scopes } of state.accounts) {
        this.#getOrCreateAccount(address, type, scopes);
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
