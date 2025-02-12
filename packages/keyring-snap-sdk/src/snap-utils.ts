import type {
  KeyringEvent,
  KeyringEventPayload,
} from '@metamask/keyring-api';
import type { SnapsProvider } from '@metamask/snaps-sdk';

/**
 * Emit a keyring event from a snap.
 *
 * @param snap - The global snap object.
 * @param event - The event name.
 * @param data - The event data.
 */
export async function emitSnapKeyringEvent<Event extends KeyringEvent>(
  snap: SnapsProvider,
  event: Event,
  data: KeyringEventPayload<Event>,
): Promise<void> {
  await snap.request({
    method: 'snap_manageAccounts',
    params: {
      method: event,
      params: { ...data },
    },
  });
}
