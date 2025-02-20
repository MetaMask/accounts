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
     * **Note:** This is not guaranteed to be honored by the MetaMask client.
     */
    displayConfirmation: exactOptional(boolean()),

    /**
     * Instructs MetaMask to display the name confirmation dialog in the UI.
     * Otherwise, the account will be added with the suggested name.
     * **Note:** This is not guaranteed to be honored by the MetaMask client.
     */

    displayAccountNameSuggestion: exactOptional(boolean()),
  }),
});

export const AccountUpdatedEventStruct = object({
  method: literal(`${KeyringEvent.AccountUpdated}`),
  params: object({
    /**
     * Updated account object.
     */
    account: KeyringAccountStruct,
  }),
});

export const AccountDeletedEventStruct = object({
  method: literal(`${KeyringEvent.AccountDeleted}`),
  params: object({
    /**
     * Deleted account ID.
     */
    id: UuidStruct,
  }),
});

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

export const RequestRejectedEventStruct = object({
  method: literal(`${KeyringEvent.RequestRejected}`),
  params: object({
    /**
     * Request ID.
     */
    id: UuidStruct,
  }),
});

// Assets related events:
// -----------------------------------------------------------------------------------------------

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

/**
 * Event emitted when the balances of an account are updated.
 *
 * Only changes are reported.
 *
 * The Snap can choose to emit this event for multiple accounts at once.
 */
export type AccountBalancesUpdatedEvent = Infer<
  typeof AccountBalancesUpdatedEventStruct
>;
export type AccountBalancesUpdatedEventPayload =
  AccountBalancesUpdatedEvent['params'];

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

/**
 * Event emitted when the transactions of an account are updated (added or
 * changed).
 *
 * Only changes are reported.
 *
 * The Snap can choose to emit this event for multiple accounts at once.
 */
export type AccountTransactionsUpdatedEvent = Infer<
  typeof AccountTransactionsUpdatedEventStruct
>;
export type AccountTransactionsUpdatedEventPayload =
  AccountTransactionsUpdatedEvent['params'];

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

/**
 * Event emitted when the assets of an account are updated.
 *
 * Only changes are reported.
 *
 * The Snap can choose to emit this event for multiple accounts at once.
 */
export type AccountAssetListUpdatedEvent = Infer<
  typeof AccountAssetListUpdatedEventStruct
>;
export type AccountAssetListUpdatedEventPayload =
  AccountAssetListUpdatedEvent['params'];
