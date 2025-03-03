import type { RestrictedMessenger } from '@metamask/base-controller';
import type {
  AccountCreatedEventPayload,
  AccountUpdatedEventPayload,
  AccountDeletedEventPayload,
  AccountAssetListUpdatedEventPayload,
  AccountBalancesUpdatedEventPayload,
  AccountTransactionsUpdatedEventPayload,
} from '@metamask/keyring-api';
import type { HandleSnapRequest, GetSnap } from '@metamask/snaps-controllers';

export type SnapKeyringGetAccountsAction = {
  type: `SnapKeyring:getAccounts`;
  handler: () => string[];
};

export type SnapKeyringAccountCreatedEvent = {
  type: `SnapKeyring:accountCreated`;
  payload: [AccountCreatedEventPayload];
};

export type SnapKeyringAccountUpdatedEvent = {
  type: `SnapKeyring:accountUpdated`;
  payload: [AccountUpdatedEventPayload];
};

export type SnapKeyringAccountDeletedEvent = {
  type: `SnapKeyring:accountDeleted`;
  payload: [AccountDeletedEventPayload];
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
  | SnapKeyringAccountCreatedEvent
  | SnapKeyringAccountUpdatedEvent
  | SnapKeyringAccountDeletedEvent
  | SnapKeyringAccountAssetListUpdatedEvent
  | SnapKeyringAccountBalancesUpdatedEvent
  | SnapKeyringAccountTransactionsUpdatedEvent;

export type SnapKeyringAllowedActions = HandleSnapRequest | GetSnap;

export type SnapKeyringMessenger = RestrictedMessenger<
  'SnapKeyring',
  SnapKeyringAllowedActions,
  SnapKeyringEvents,
  SnapKeyringAllowedActions['type'],
  never
>;
