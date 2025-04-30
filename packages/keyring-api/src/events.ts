/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
// FIXME: This rule seems to be triggering a false positive on the `KeyringEvents`.

import {
  exactOptional,
  object,
  UuidStruct,
  AccountIdStruct,
} from '@metamask/keyring-utils';
import type { Infer } from '@metamask/superstruct';
import { array, boolean, literal, record, string } from '@metamask/superstruct';
import {
  CaipAssetTypeStruct,
  CaipAssetTypeOrIdStruct,
  JsonStruct,
} from '@metamask/utils';

import {
  FungibleAssetAmountStruct,
  KeyringAccountStruct,
  TransactionStruct,
  MetaMaskOptionsStruct,
} from './api';

/**
 * Supported keyring events.
 */
export enum KeyringEvent {
  // Account events
  AccountCreated = 'notify:accountCreated',
  AccountUpdated = 'notify:accountUpdated',
  AccountDeleted = 'notify:accountDeleted',

  // Request events
  RequestApproved = 'notify:requestApproved',
  RequestRejected = 'notify:requestRejected',

  // Assets related events
  AccountBalancesUpdated = 'notify:accountBalancesUpdated',
  AccountAssetListUpdated = 'notify:accountAssetListUpdated',
  AccountTransactionsUpdated = 'notify:accountTransactionsUpdated',
  //
  // Logs
  Log = 'notify:log',
}

export const AccountCreatedEventStruct = object({
  method: literal(`${KeyringEvent.AccountCreated}`),
  params: object({
    /**
     * New account object.
     */
    account: KeyringAccountStruct,

    /**
     * Account name suggestion provided to the MetaMask client.
     *
     * The keyring can suggest a name for the account, but it's up to the
     * client to decide whether to use it. The keyring won't be informed if the
     * client decides to use a different name.
     */
    accountNameSuggestion: exactOptional(string()),

    /**
     * Instructs MetaMask to display the add account confirmation dialog in the UI.
     *
     * **Note:** This is not guaranteed to be honored by the MetaMask client.
     */
    displayConfirmation: exactOptional(boolean()),

    /**
     * Instructs MetaMask to display the name confirmation dialog in the UI.
     * Otherwise, the account will be added with the suggested name, if it's not
     * already in use; if it is, a suffix will be appended to the name to make it
     * unique.
     *
     * **Note:** This is not guaranteed to be honored by the MetaMask client.
     */
    displayAccountNameSuggestion: exactOptional(boolean()),

    /**
     * Metamask internal options.
     */
    ...MetaMaskOptionsStruct.schema,
  }),
});
export type AccountCreatedEvent = Infer<typeof AccountCreatedEventStruct>;
export type AccountCreatedEventPayload = AccountCreatedEvent['params'];

export const AccountUpdatedEventStruct = object({
  method: literal(`${KeyringEvent.AccountUpdated}`),
  params: object({
    /**
     * Updated account object.
     */
    account: KeyringAccountStruct,
  }),
});
export type AccountUpdatedEvent = Infer<typeof AccountUpdatedEventStruct>;
export type AccountUpdatedEventPayload = AccountUpdatedEvent['params'];

export const AccountDeletedEventStruct = object({
  method: literal(`${KeyringEvent.AccountDeleted}`),
  params: object({
    /**
     * Deleted account ID.
     */
    id: UuidStruct,
  }),
});
export type AccountDeletedEvent = Infer<typeof AccountDeletedEventStruct>;
export type AccountDeletedEventPayload = AccountDeletedEvent['params'];

export const RequestApprovedEventStruct = object({
  method: literal(`${KeyringEvent.RequestApproved}`),
  params: object({
    /**
     * Request ID.
     */
    id: UuidStruct,

    /**
     * Request result.
     */
    result: JsonStruct,
  }),
});
export type RequestApprovedEvent = Infer<typeof RequestApprovedEventStruct>;
export type RequestApprovedEventPayload = RequestApprovedEvent['params'];

export const RequestRejectedEventStruct = object({
  method: literal(`${KeyringEvent.RequestRejected}`),
  params: object({
    /**
     * Request ID.
     */
    id: UuidStruct,
  }),
});
export type RequestRejectedEvent = Infer<typeof RequestRejectedEventStruct>;
export type RequestRejectedEventPayload = RequestRejectedEvent['params'];

export const LogEventStruct = object({
  method: literal(`${KeyringEvent.Log}`),
  params: object({
    log: string(),
  }),
});
export type LogEvent = Infer<typeof LogEventStruct>;
export type LogEventPayload = LogEvent['params'];

// Assets related events:
// -----------------------------------------------------------------------------------------------

/**
 * Event emitted when the balances of an account are updated.
 *
 * Only changes are reported.
 *
 * The Snap can choose to emit this event for multiple accounts at once.
 */
export const AccountBalancesUpdatedEventStruct = object({
  method: literal(`${KeyringEvent.AccountBalancesUpdated}`),
  params: object({
    /**
     * Balances updates of accounts owned by the Snap.
     */
    balances: record(
      /**
       * Account ID.
       */
      AccountIdStruct,

      /**
       * Mapping of each owned assets and their respective balances for that account.
       */
      record(
        /**
         * Asset type (CAIP-19).
         */
        CaipAssetTypeStruct,

        /**
         * Balance information for a given asset.
         */
        FungibleAssetAmountStruct,
      ),
    ),
  }),
});
export type AccountBalancesUpdatedEvent = Infer<
  typeof AccountBalancesUpdatedEventStruct
>;
export type AccountBalancesUpdatedEventPayload =
  AccountBalancesUpdatedEvent['params'];

/**
 * Event emitted when the transactions of an account are updated (added or
 * changed).
 *
 * Only changes are reported.
 *
 * The Snap can choose to emit this event for multiple accounts at once.
 */
export const AccountTransactionsUpdatedEventStruct = object({
  method: literal(`${KeyringEvent.AccountTransactionsUpdated}`),
  params: object({
    /**
     * Transactions updates of accounts owned by the Snap.
     */
    transactions: record(
      /**
       * Account ID.
       */
      AccountIdStruct,

      /**
       * List of updated transactions for that account.
       */
      array(TransactionStruct),
    ),
  }),
});
export type AccountTransactionsUpdatedEvent = Infer<
  typeof AccountTransactionsUpdatedEventStruct
>;
export type AccountTransactionsUpdatedEventPayload =
  AccountTransactionsUpdatedEvent['params'];

/**
 * Event emitted when the assets of an account are updated.
 *
 * Only changes are reported.
 *
 * The Snap can choose to emit this event for multiple accounts at once.
 */
export const AccountAssetListUpdatedEventStruct = object({
  method: literal(`${KeyringEvent.AccountAssetListUpdated}`),
  params: object({
    /**
     * Asset list update of accounts owned by the Snap.
     */
    assets: record(
      /**
       * Account ID.
       */
      AccountIdStruct,

      /**
       * Asset list changes for that account.
       */
      object({
        /**
         * New assets detected.
         */
        added: array(CaipAssetTypeOrIdStruct),

        /**
         * Assets no longer available on that account.
         */
        removed: array(CaipAssetTypeOrIdStruct),
      }),
    ),
  }),
});
export type AccountAssetListUpdatedEvent = Infer<
  typeof AccountAssetListUpdatedEventStruct
>;
export type AccountAssetListUpdatedEventPayload =
  AccountAssetListUpdatedEvent['params'];

/**
 * Keyring events.
 */
// For some reason, eslint sometimes infer one of those members as `any`...
type KeyringEvents =
  | AccountCreatedEvent
  | AccountUpdatedEvent
  | AccountDeletedEvent
  | AccountAssetListUpdatedEvent
  | AccountBalancesUpdatedEvent
  | AccountTransactionsUpdatedEvent
  | RequestApprovedEvent
  | RequestRejectedEvent
  | LogEvent;

/**
 * Extract the payload for a given `KeyringEvent` event.
 */
export type KeyringEventPayload<Event extends KeyringEvent> = Extract<
  KeyringEvents,
  // We need to use a literal string here, since that is what `KeyringEvents`
  // is using (probably because of `superstruct`.
  { method: `${Event}` }
>['params'];
