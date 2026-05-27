import type { KeyringAccount } from '@metamask/keyring-api';
import type { Keyring as KeyringV2 } from '@metamask/keyring-api/v2';
import type { BaseKeyring } from '@metamask/keyring-utils';
import type { Json } from '@metamask/utils';

/**
 * Generic adapter that wraps a v2 {@link KeyringV2} instance and exposes it
 * through the v1 {@link BaseKeyring} interface expected by `KeyringController`.
 *
 * ## Why this exists
 *
 * `KeyringController` interacts with all keyrings via the v1 `BaseKeyring`
 * interface — notably `getAccounts()` which must return `Promise<string[]>`
 * (addresses). The v2 `Keyring` interface returns `Promise<KeyringAccount[]>`
 * from `getAccounts()`, an incompatible signature.
 *
 * ## Architecture
 *
 * This class holds a v2 `Keyring` instance and exposes it via {@link unwrap}.
 * `KeyringController` stores this adapter as the v1 keyring entry; its
 * `KeyringV2Builder` calls `unwrap()` to retrieve the same inner instance for
 * the v2 entry — no state duplication.
 *
 * ```
 * KeyringEntry {
 *   keyring:   KeyringV1Adapter  ← v1 face (this class)
 *   keyringV2: InnerKeyring      ← v2 face (same instance via unwrap())
 * }
 * ```
 *
 * @typeParam InnerKeyring - The concrete v2 keyring type being wrapped.
 *   Defaults to the base {@link KeyringV2} interface. Specifying a concrete
 *   subtype preserves full type information through {@link unwrap}.
 */
export class KeyringV1Adapter<
  InnerKeyring extends KeyringV2 = KeyringV2,
> implements BaseKeyring {
  /**
   * Keyring type identifier, mirroring the inner v2 instance's type.
   */
  readonly type: string;

  readonly #inner: InnerKeyring;

  constructor(inner: InnerKeyring) {
    this.#inner = inner;
    this.type = inner.type;
  }

  /**
   * Returns the inner v2 {@link KeyringV2} instance.
   *
   * Intended for use by `KeyringController`'s `KeyringV2Builder` so that both
   * the v1 and v2 keyring entries in a `KeyringEntry` share the same object.
   *
   * @returns The inner v2 keyring instance.
   */
  unwrap(): InnerKeyring {
    return this.#inner;
  }

  /**
   * Returns the addresses of all accounts in this keyring.
   *
   * Adapts the v2 `getAccounts()` (which returns `KeyringAccount[]`) to the
   * v1 `BaseKeyring` interface (`string[]`).
   *
   * @returns A promise resolving to the list of account addresses.
   */
  async getAccounts(): Promise<string[]> {
    const accounts = await this.#inner.getAccounts();
    return accounts.map((account: KeyringAccount) => account.address);
  }

  /**
   * Serializes the keyring state.
   *
   * Delegates to the inner v2 instance.
   *
   * @returns A promise resolving to the serialized state.
   */
  async serialize(): Promise<Json> {
    return this.#inner.serialize();
  }

  /**
   * Restores keyring state from a serialized snapshot.
   *
   * Delegates to the inner v2 instance.
   *
   * @param state - The serialized state to restore.
   * @returns A promise that resolves when deserialization is complete.
   */
  async deserialize(state: Json): Promise<void> {
    return this.#inner.deserialize(state);
  }
}
