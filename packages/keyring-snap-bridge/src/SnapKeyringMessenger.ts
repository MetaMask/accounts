import type {
  AccountAssetListUpdatedEventPayload,
  AccountBalancesUpdatedEventPayload,
  AccountTransactionsUpdatedEventPayload,
} from '@metamask/keyring-api';
import type { Messenger } from '@metamask/messenger';
import type {
  HandleSnapRequest as SnapControllerHandleSnapRequest,
  GetSnap as SnapControllerGetSnap,
  IsMinimumPlatformVersion as SnapControllerIsMinimumPlatformVersion,
} from '@metamask/snaps-controllers';

export type SnapKeyringGetAccountsAction = {
  type: `SnapKeyring:getAccounts`;
  handler: () => string[];
};

export type SnapKeyringAccountBalancesUpdatedEvent = {
  type: `SnapKeyring:accountBalancesUpdated`;
  payload: [AccountBalancesUpdatedEventPayload];
};

export type SnapKeyringAccountAssetListUpdatedEvent = {
  type: `SnapKeyring:accountAssetListUpdated`;
  payload: [AccountAssetListUpdatedEventPayload];
};

export type SnapKeyringAccountTransactionsUpdatedEvent = {
  type: `SnapKeyring:accountTransactionsUpdated`;
  payload: [AccountTransactionsUpdatedEventPayload];
};

export type SnapKeyringEvents =
  | SnapKeyringAccountAssetListUpdatedEvent
  | SnapKeyringAccountBalancesUpdatedEvent
  | SnapKeyringAccountTransactionsUpdatedEvent;

export type SnapKeyringAllowedActions =
  | SnapControllerHandleSnapRequest
  | SnapControllerGetSnap
  | SnapControllerIsMinimumPlatformVersion;

export const SNAP_KEYRING_NAME = 'SnapKeyring';

export type SnapKeyringMessenger = Messenger<
  typeof SNAP_KEYRING_NAME,
  SnapKeyringAllowedActions,
  SnapKeyringEvents
>;
