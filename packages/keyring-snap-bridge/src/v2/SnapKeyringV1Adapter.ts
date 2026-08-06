import { Keyring, KeyringType } from '@metamask/keyring-api/v2';
import { EthKeyringV1Adapter } from '@metamask/keyring-sdk/v2';

import type { SnapKeyring } from './SnapKeyring';

/**
 * Check if a given keyring instance is a SnapKeyringV1Adapter.
 *
 * @param keyring - The keyring to check.
 * @returns True if the keyring is a SnapKeyringV1Adapter, false otherwise.
 */
export function isSnapKeyringV1Adapter(
  keyring: unknown,
): keyring is SnapKeyringV1Adapter {
  // Uses duck-typing to determine if a given keyring is a SnapKeyringV1Adapter (which wraps a SnapKeyringV2).
  //
  // This avoids relying on `instanceof` checks, which can fail in certain module resolution scenarios (e.g.
  // when multiple versions of the same class exist).
  if (keyring === null || keyring === undefined) {
    return false;
  }

  const adapter = keyring as { type?: KeyringType; unwrap?: () => Keyring };

  return (
    adapter.type === KeyringType.Snap && typeof adapter.unwrap === 'function'
  );
}

/**
 * Adapts a v2 Snap keyring to the legacy v1 keyring API.
 */
export class SnapKeyringV1Adapter extends EthKeyringV1Adapter<SnapKeyring> {
  /**
   * Remove an account matching the given address.
   *
   * @param address - Address of the account to remove.
   */
  async removeAccount(address: string): Promise<void> {
    const account = this.inner.lookupByAddress(address);

    if (!account) {
      throw new Error(`Account '${address}' not found`);
    }

    await this.inner.deleteAccount(account.id);
  }
}
