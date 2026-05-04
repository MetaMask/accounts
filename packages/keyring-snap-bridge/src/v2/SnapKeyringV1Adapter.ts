import { KeyringType } from '@metamask/keyring-api/v2';
import type { SnapId } from '@metamask/snaps-sdk';

import { normalizeAccountAddress } from '../util';
import { SnapKeyring } from './SnapKeyring';
import type { SnapKeyringOptions, SnapKeyringState } from './SnapKeyring';

/**
 * V1-compatible wrapper for a per-snap {@link SnapKeyring} (v2) instance.
 *
 * ## Why this exists
 *
 * `KeyringController` uses the v1 `EthKeyring` interface to interact with all
 * keyrings — notably `getAccounts()` which must return `Promise<string[]>`
 * (addresses). `SnapKeyring` implements the v2 `Keyring` interface where
 * `getAccounts()` returns `Promise<KeyringAccount[]>`. The signatures are
 * irreconcilable in a single class.
 *
 * ## Architecture
 *
 * This class owns one {@link SnapKeyring} (v2) instance and exposes it via
 * {@link asV2}. The `KeyringController` registers this wrapper as the v1
 * keyring entry, while its `KeyringV2Builder` retrieves the same
 * {@link SnapKeyring} instance through {@link asV2} and stores it as the v2
 * entry — so both entries share the same underlying object with no state
 * duplication.
 *
 * ```
 * KeyringEntry {
 *   keyring:   SnapKeyringV1Adapter  ← v1 face (this class)
 *   keyringV2: SnapKeyring    ← v2 face (same inner instance via asV2())
 * }
 * ```
 */
export class SnapKeyringV1Adapter {
  /**
   * Keyring type identifier.
   *
   * Uses the v2 {@link KeyringType.Snap} enum value — NOT the legacy
   * `SNAP_KEYRING_TYPE` constant used by the old single-instance aggregator.
   * Using the aggregator's type string here would cause conflicts in consumers
   * that look up snap keyrings by type, since the new design registers one
   * `SnapKeyringV1Adapter` per snap rather than one aggregator for all snaps.
   */
  static readonly type = `${KeyringType.Snap}` as const;

  /** @see {@link SnapKeyringV1Adapter.type} */
  readonly type = SnapKeyringV1Adapter.type;

  readonly #v2: SnapKeyring;

  constructor(options: SnapKeyringOptions) {
    this.#v2 = new SnapKeyring(options);
  }

  /**
   * Returns the inner {@link SnapKeyring} (v2) instance.
   *
   * Intended for use by the `KeyringController`'s `KeyringV2Builder` so that
   * the v1 and v2 keyring entries in a `KeyringEntry` share the same object.
   *
   * @returns The inner v2 instance.
   */
  asV2(): SnapKeyring {
    return this.#v2;
  }

  // ── V1 compatibility ──────────────────────────────────────────────────

  /**
   * Returns the addresses of all accounts managed by this keyring.
   *
   * Adapts the v2 `getAccounts()` (which returns `KeyringAccount[]`) to the
   * v1 interface expected by `KeyringController` (`string[]` of addresses).
   *
   * @returns A promise resolving to the list of account addresses.
   */
  async getAccounts(): Promise<string[]> {
    const accounts = await this.#v2.getAccounts();
    return accounts.map((account) => normalizeAccountAddress(account));
  }

  /**
   * Serializes the keyring state.
   *
   * Delegates to the inner v2 instance.
   *
   * @returns A promise resolving to the serialized keyring state.
   */
  async serialize(): Promise<SnapKeyringState> {
    return this.#v2.serialize();
  }

  /**
   * Restores keyring state from a serialized snapshot.
   *
   * Delegates to the inner v2 instance.
   *
   * @param state - The serialized state to restore.
   * @returns A promise that resolves when deserialization is complete.
   */
  async deserialize(state: SnapKeyringState): Promise<void> {
    return this.#v2.deserialize(state);
  }

  // ── Delegation ────────────────────────────────────────────────────────

  /**
   * The Snap ID this keyring is bound to.
   *
   * Delegates to the inner v2 instance.
   *
   * @returns The Snap ID.
   */
  get snapId(): SnapId {
    return this.#v2.snapId;
  }

  /**
   * Routes an incoming Snap keyring message to the inner v2 instance.
   *
   * Delegates to the inner v2 instance.
   *
   * @param args - Arguments forwarded to the inner v2 instance.
   * @returns A promise resolving to the result from the inner v2 instance.
   */
  async handleKeyringSnapMessage(
    ...args: Parameters<SnapKeyring['handleKeyringSnapMessage']>
  ): ReturnType<SnapKeyring['handleKeyringSnapMessage']> {
    return this.#v2.handleKeyringSnapMessage(...args);
  }

  /**
   * Sets the currently selected accounts on the snap.
   *
   * Delegates to the inner v2 instance.
   *
   * @param args - Arguments forwarded to the inner v2 instance.
   * @returns A promise that resolves when the selected accounts are updated.
   */
  async setSelectedAccounts(
    ...args: Parameters<SnapKeyring['setSelectedAccounts']>
  ): Promise<void> {
    return this.#v2.setSelectedAccounts(...args);
  }

  /**
   * Resolves the account address for a signing request.
   *
   * Delegates to the inner v2 instance.
   *
   * @param args - Arguments forwarded to the inner v2 instance.
   * @returns A promise resolving to the resolved address, or `null` if not found.
   */
  async resolveAccountAddress(
    ...args: Parameters<SnapKeyring['resolveAccountAddress']>
  ): ReturnType<SnapKeyring['resolveAccountAddress']> {
    return this.#v2.resolveAccountAddress(...args);
  }

  /**
   * Signs a transaction.
   *
   * Delegates to the inner v2 instance.
   *
   * @param args - Arguments forwarded to the inner v2 instance.
   * @returns A promise resolving to the signed transaction.
   */
  async signTransaction(
    ...args: Parameters<SnapKeyring['signTransaction']>
  ): ReturnType<SnapKeyring['signTransaction']> {
    return this.#v2.signTransaction(...args);
  }

  /**
   * Signs a message.
   *
   * Delegates to the inner v2 instance.
   *
   * @param args - Arguments forwarded to the inner v2 instance.
   * @returns A promise resolving to the signature.
   */
  async signMessage(
    ...args: Parameters<SnapKeyring['signMessage']>
  ): ReturnType<SnapKeyring['signMessage']> {
    return this.#v2.signMessage(...args);
  }

  /**
   * Signs a personal message.
   *
   * Delegates to the inner v2 instance.
   *
   * @param args - Arguments forwarded to the inner v2 instance.
   * @returns A promise resolving to the signature.
   */
  async signPersonalMessage(
    ...args: Parameters<SnapKeyring['signPersonalMessage']>
  ): ReturnType<SnapKeyring['signPersonalMessage']> {
    return this.#v2.signPersonalMessage(...args);
  }

  /**
   * Signs typed data (EIP-712).
   *
   * Delegates to the inner v2 instance.
   *
   * @param args - Arguments forwarded to the inner v2 instance.
   * @returns A promise resolving to the signature.
   */
  async signTypedData(
    ...args: Parameters<SnapKeyring['signTypedData']>
  ): ReturnType<SnapKeyring['signTypedData']> {
    return this.#v2.signTypedData(...args);
  }

  /**
   * Prepares a user operation (ERC-4337).
   *
   * Delegates to the inner v2 instance.
   *
   * @param args - Arguments forwarded to the inner v2 instance.
   * @returns A promise resolving to the prepared user operation.
   */
  async prepareUserOperation(
    ...args: Parameters<SnapKeyring['prepareUserOperation']>
  ): ReturnType<SnapKeyring['prepareUserOperation']> {
    return this.#v2.prepareUserOperation(...args);
  }

  /**
   * Patches a user operation (ERC-4337).
   *
   * Delegates to the inner v2 instance.
   *
   * @param args - Arguments forwarded to the inner v2 instance.
   * @returns A promise resolving to the patched user operation.
   */
  async patchUserOperation(
    ...args: Parameters<SnapKeyring['patchUserOperation']>
  ): ReturnType<SnapKeyring['patchUserOperation']> {
    return this.#v2.patchUserOperation(...args);
  }

  /**
   * Signs a user operation (ERC-4337).
   *
   * Delegates to the inner v2 instance.
   *
   * @param args - Arguments forwarded to the inner v2 instance.
   * @returns A promise resolving to the signed user operation.
   */
  async signUserOperation(
    ...args: Parameters<SnapKeyring['signUserOperation']>
  ): ReturnType<SnapKeyring['signUserOperation']> {
    return this.#v2.signUserOperation(...args);
  }

  /**
   * Destroys the keyring, rejecting any pending requests.
   *
   * Delegates to the inner v2 instance.
   *
   * @returns A promise that resolves when the keyring is destroyed.
   */
  async destroy(): Promise<void> {
    return this.#v2.destroy();
  }
}
