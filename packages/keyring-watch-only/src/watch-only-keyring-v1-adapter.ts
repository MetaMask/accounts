import type { Keyring as KeyringV2 } from '@metamask/keyring-api/v2';
import { KeyringType } from '@metamask/keyring-api/v2';
import { EthKeyringV1Adapter } from '@metamask/keyring-sdk/v2';
import { add0x } from '@metamask/utils';

import type { WatchOnlyKeyring } from './watch-only-keyring';

/**
 * Check if a given keyring instance is a WatchOnlyKeyringV1Adapter.
 *
 * Uses duck-typing to avoid relying on `instanceof` checks, which can fail in
 * certain module resolution scenarios (e.g. when multiple versions of the
 * same class exist).
 *
 * @param keyring - The keyring to check.
 * @returns True if the keyring is a WatchOnlyKeyringV1Adapter, false
 * otherwise.
 */
export function isWatchOnlyKeyringV1Adapter(
  keyring: unknown,
): keyring is WatchOnlyKeyringV1Adapter {
  if (keyring === null || keyring === undefined) {
    return false;
  }

  const adapter = keyring as { type?: KeyringType; unwrap?: () => KeyringV2 };

  return (
    adapter.type === KeyringType.WatchOnly &&
    typeof adapter.unwrap === 'function'
  );
}

/**
 * Adapts a `WatchOnlyKeyring` to the legacy v1 keyring API.
 *
 * The inherited signing methods always throw for watch-only accounts: the
 * accounts declare no methods, so the account resolution in
 * `EthKeyringV1Adapter` fails with `EthKeyringV1MethodNotSupportedError`
 * before reaching this keyring. `exportAccount` also throws, since the
 * watch-only keyring does not support exporting accounts.
 *
 * This subclass only adds address-based account removal, which the base
 * adapter does not implement.
 */
export class WatchOnlyKeyringV1Adapter extends EthKeyringV1Adapter<WatchOnlyKeyring> {
  /**
   * Remove the account matching the given address.
   *
   * Address matching is case-insensitive.
   *
   * @param address - Address of the account to remove.
   * @throws If no account matches the given address.
   */
  async removeAccount(address: string): Promise<void> {
    const normalizedAddress = add0x(address).toLowerCase();

    const accounts = await this.inner.getAccounts();
    const account = accounts.find(
      (candidate) =>
        add0x(candidate.address).toLowerCase() === normalizedAddress,
    );

    if (!account) {
      throw new Error(`Account '${address}' not found`);
    }

    await this.inner.deleteAccount(account.id);
  }
}
