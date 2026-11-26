import { Keyring, KeyringType } from '@metamask/keyring-api/v2';
import type { AtomicKeyring, AtomicUpdater } from '@metamask/keyring-sdk';
import { EthKeyringV1Adapter } from '@metamask/keyring-sdk/v2';

import type { SnapKeyring } from './SnapKeyring';

const ATOMIC_KEYRING_BRAND = Symbol.for('@metamask/keyring-sdk/atomic-keyring');

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
   * Mirror the inner keyring's atomic identity on the controller-facing
   * adapter. Operations and locking remain owned by the inner keyring.
   */
  readonly [ATOMIC_KEYRING_BRAND] = true;

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

/**
 * Build the registered V1 face while routing the inner keyring's updates
 * through that same registered identity. Construction must not call update.
 *
 * @param create - Constructs the inner keyring with the supplied updater.
 * @returns An atomic builder suitable for KeyringController.
 */
export function createAtomicSnapKeyringBuilder(
  create: (updater: AtomicUpdater) => SnapKeyring,
): {
  (context: { update: AtomicUpdater }): SnapKeyringV1Adapter;
  type: typeof KeyringType.Snap;
  atomic: true;
} {
  return Object.assign(
    ({ update }: { update: AtomicUpdater }): SnapKeyringV1Adapter => {
      // Capture the registered identity before constructing its inner keyring.
      // eslint-disable-next-line prefer-const
      let adapter: SnapKeyringV1Adapter;
      const inner = create(async (_keyring, action) => {
        // The branded adapter is the registered atomic identity, not the
        // inner V2 instance. Its operations delegate to the inner locks.
        await update(adapter as unknown as AtomicKeyring, action);
      });
      adapter = new SnapKeyringV1Adapter(inner);
      return adapter;
    },
    { type: KeyringType.Snap as const, atomic: true as const },
  );
}
