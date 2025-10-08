import {
  type KeyringEvent,
  type KeyringEventPayload,
} from '@metamask/keyring-api';
import type { SnapsProvider } from '@metamask/snaps-sdk';
import { assert } from '@metamask/superstruct';

import {
  type GetSelectedAccountsResponse,
  GetSelectedAccountsReponseStruct,
  KeyringMethod,
} from './methods';

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

/**
 * Get the selected accounts from a snap.
 *
 * @param snap - The global snap object.
 * @returns The selected accounts.
 */
export async function getSelectedAccounts(
  snap: SnapsProvider,
): Promise<GetSelectedAccountsResponse> {
  const response = await snap.request({
    method: 'snap_manageAccounts',
    params: {
      method: KeyringMethod.GetSelectedAccounts,
    },
  });
  assert(response, GetSelectedAccountsReponseStruct);
  return response;
}
