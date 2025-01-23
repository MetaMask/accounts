import type { RestrictedControllerMessenger } from '@metamask/base-controller';
import type {
  AccountAssetListUpdatedEventPayload,
  AccountBalancesUpdatedEventPayload,
  AccountTransactionsUpdatedEventPayload,
} from '@metamask/keyring-api';
import type { HandleSnapRequest, GetSnap } from '@metamask/snaps-controllers';

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

export type SnapKeyringAllowedActions = HandleSnapRequest | GetSnap;

export type SnapKeyringMessenger = RestrictedControllerMessenger<
  'SnapKeyring',
  SnapKeyringAllowedActions,
  SnapKeyringEvents,
  SnapKeyringAllowedActions['type'],
  never
>;
