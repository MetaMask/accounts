import { EthKeyringV1Adapter } from '@metamask/keyring-sdk/v2';

import type { SnapKeyring } from './SnapKeyring';

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
