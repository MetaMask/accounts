import type { SnapsProvider } from '@metamask/snaps-sdk';
import type { Json } from '@metamask/utils';

import type { KeyringEvent } from './events';

/**
 * Emit a keyring event from a snap.
 *
 * @param snap - The global snap object.
 * @param event - The event name.
 * @param data - The event data.
 */
export async function emitSnapKeyringEvent(
  snap: SnapsProvider,
  event: KeyringEvent,
  data: Record<string, Json>,
): Promise<void> {
  await snap.request({
    method: 'snap_manageAccounts',
    params: {
      method: event,
      params: { ...data },
    },
  });
}
